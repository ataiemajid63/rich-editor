import React from 'react';
import ReactDOM from 'react-dom';
import Draft from 'draft-js';
import { log } from 'util';

const Styles = {
    comment: {
        backgroundColor: '#dddddd'
    },
    removed: {
        color: '#dd3333',
        textDecoration: 'underline',
    },
    commentRemoved: {
        color: '#dd3333',
        textDecoration: 'underline',
        backgroundColor: '#dddddd'
    }
};

const CommentComponent = (props) => {
    return (
        <span style={Styles.comment}>
            {props.children}
        </span>
    );
};

const RemovedComponent = (props) => {
    return (
        <span style={Styles.removed}>
            {props.children}
        </span>
    );
};

const CommentRemovedComponent = (props) => {
    return (
        <span style={Styles.commentRemoved}>
            {props.children}
        </span>
    );
};

const CommentStrategy = (contentBlock, callback, contentState) => {
    contentBlock.findEntityRanges((character) => {
        const entityKey = character.getEntity();
        return (
            entityKey !== null && contentState.getEntity(entityKey).getType() === 'COMMENT'
        );
    }, callback);
}

const RemovedStrategy = (contentBlock, callback, contentState) => {
    contentBlock.findEntityRanges((character) => {
        const entityKey = character.getEntity();
        return (
            entityKey !== null && contentState.getEntity(entityKey).getType() === 'REMOVED'
        );
    }, callback);
}

const CommentRemovedStrategy = (contentBlock, callback, contentState) => {
    contentBlock.findEntityRanges((character) => {
        const entityKey = character.getEntity();
        
        return (
            entityKey !== null && contentState.getEntity(entityKey).getType() === 'COMMENT_REMOVED'
        );
    }, callback);
}

const CompositeDecorator = new Draft.CompositeDecorator([
    {
        strategy: CommentStrategy,
        component: CommentComponent
    },
    {
        strategy: RemovedStrategy,
        component: RemovedComponent
    },
    {
        strategy: CommentRemovedStrategy,
        component: CommentRemovedComponent
    }
]);



class App extends React.Component {
    constructor(props) {
        super(props);

        let contentState = Draft.ContentState.createFromText("Majid Ataee Torshizi");

        this.state = {
            editorState: Draft.EditorState.createWithContent(contentState, CompositeDecorator),
            comments: []
        };

        this.focus = () => this.refs.editor.focus();
        this.onChange = (editorState) => { this.setState({ editorState }) };
        this.comment = () => this._addComment();
        this.remove = () => this._removeText();
    }

    _addComment() {
        const editorState = this.state.editorState;
        const selectionState = editorState.getSelection();

        if(selectionState.isCollapsed()) {
            return false;
        }

        const anchorKey = selectionState.getAnchorKey();
        const currentContent = editorState.getCurrentContent();
        const currentContentBlock = currentContent.getBlockForKey(anchorKey);
        const selectionStart = selectionState.getStartOffset();
        const selectionEnd = selectionState.getEndOffset();
        const text = currentContentBlock.getText().slice(selectionStart, selectionEnd);
        let hasComment = false;

        currentContentBlock.findEntityRanges((character) => {
            const entityKey = character.getEntity();
            
            if(entityKey !== null && currentContent.getEntity(entityKey).getType() === 'COMMENT') {
                return true;
            }
            
            return false;
        }, (start, end) => {
            if(start <= selectionStart && end >= selectionStart) {
                hasComment |= true;
            }
        });

        if(hasComment) {
            return;
        }
        
        const entityContentState = currentContent.createEntity('COMMENT', 'MUTABLE', { start: selectionStart, end: selectionEnd, text: text, blockKey: anchorKey });
        const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
        const finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());

        // const commentContentState = Draft.Modifier.applyInlineStyle(entityContentState, selectionState, 'COMMENT');
        // const commentEditortState = Draft.EditorState.push(entityEditortState, commentContentState, 'apply-entity');

        // console.log(text);
        // console.log(selectionState.serialize());
        // console.log(commentContentState.getLastCreatedEntityKey());
        // console.log(selectionState.isCollapsed());

        this.onChange(finallyEditorState);

        // this.onChange(commentEditortState);
    }

    findEntitisSelection(editorState) {
        const selectionState = editorState.getSelection();

        if(selectionState.isCollapsed()) {
            return false;
        }

        const currentContent = editorState.getCurrentContent();
        const selectionStartKey = selectionState.getStartKey();
        const selectionStartOffset = selectionState.getStartOffset();
        const selectionEndKey = selectionState.getEndKey();
        const selectionEndOffset = selectionState.getEndOffset();

        let currentContentBlock = null;
        let currentKey = selectionStartKey;
        let lastStep = false;
        let entities = [];
        let ranges = [];

        while (!lastStep) {
            if(currentKey === selectionEndKey) {
                lastStep = true;
            }
            
            currentContentBlock = currentContent.getBlockForKey(currentKey);
            currentContentBlock.findEntityRanges((character) => {
                const entityKey = character.getEntity();
                let entity = null;
                
                if(entityKey !== null) {
                    entity = currentContent.getEntity(entityKey);
                    
                    entities.push({
                        entity: entity,
                        block: currentKey
                    });

                    return true;
                }

                return false;
            }, (start, end) => {
                ranges.push({
                    start: start,
                    end: end
                });
            });
            
            currentKey = currentContent.getKeyAfter(currentKey);
        }

        let entityMustDeleted = [];

        for(let i in entities) {
            (entities[i]).range = ranges[i]

            if(selectionStartKey === selectionEndKey) {
                if(entities[i].range.start < selectionStartOffset || entities[i].range.end > selectionEndOffset) {
                    entityMustDeleted.push(i);
                }
            } else {
                if(entities[i].block === selectionStartKey) {
                    if(entities[i].range.start < selectionStartOffset) {
                        entityMustDeleted.push(i);
                    }
                } else if(entities[i].block === selectionEndKey) {
                    if(entities[i].range.end > selectionEndOffset) {
                        entityMustDeleted.push(i);
                    }
                }
            }
        }

        for(let index = entityMustDeleted.length; index > 0; index--) {
            entities.splice(index - 1, 1);
        }

        return entities;
    }

    findEntitiesByType(entities, type) {
        let items = [];

        for(let i in entities) {
            if(entities[i].entity.getType() === type) {
                items.push(entities[i]);
            }
        }

        return items;
    }

    _removeText() {
        
        const entities = this.findEntitisSelection(this.state.editorState);
        const comments = this.findEntitiesByType(entities, 'COMMENT');

        let editorState = this.state.editorState
        let selectionState = editorState.getSelection();
        let currentContent = editorState.getCurrentContent();
        let finallyEditorState;
        
        if(entities.length === 0 || comments.length) {
            const entityContentState = currentContent.createEntity('REMOVED', 'MUTABLE', null);
            const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
            finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
        }

        if(comments.length) {
            for(let i in comments) {
                const newSelectionState = Draft.SelectionState.createEmpty(comments[i].block).merge({
                    anchorOffset: comments[i].range.start,
                    focusKey: comments[i].block,
                    focusOffset: comments[i].range.end,
                    isBackward: true
                });
                const editorStateWithSelection = Draft.EditorState.forceSelection(finallyEditorState, newSelectionState);
                currentContent = editorStateWithSelection.getCurrentContent();
                selectionState = editorStateWithSelection.getSelection();
                const entityContentState = currentContent.createEntity('COMMENT_REMOVED', 'MUTABLE', null);
                const entityEditortState = Draft.EditorState.push(editorStateWithSelection, entityContentState, 'apply-entity');
                finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());

                this.onChange(finallyEditorState);
            }
        }
    }

    render() {
        // const customStyleMap = {
        //     'COMMENT': {
        //         backgroundColor: '#dddddd'
        //     }
        // };

        return (
            <div>
                <div>
                    <button onClick={this.comment}>Comment</button>
                    <button onClick={this.remove}>Remove</button>
                </div>
                <Draft.Editor
                    editorState={this.state.editorState}
                    // customStyleMap={customStyleMap}
                    onChange={this.onChange} />
            </div>
        );
    }
}

ReactDOM.render(<App />, document.querySelector('div.content'));