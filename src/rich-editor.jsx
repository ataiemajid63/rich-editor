import React from 'react'; 
import Draft from 'draft-js';
import CustomDecorator from './custom-decorator.jsx';

class RichEditor extends React.Component {
    
    constructor(props) {
        super(props);

        const CompositeDecorator = new Draft.CompositeDecorator([
            {
                strategy: CustomDecorator.CommentStrategy,
                component: CustomDecorator.CommentComponent
            },
            {
                strategy: CustomDecorator.RemovedStrategy,
                component: CustomDecorator.RemovedComponent
            },
            {
                strategy: CustomDecorator.CommentRemovedStrategy,
                component: CustomDecorator.CommentRemovedComponent
            }
        ]);      

        this.state = {
            editorState: Draft.EditorState.createEmpty(CompositeDecorator),
            mode: props.mode || 'commentor',
        };
  
        this.focus = () => this.refs.editor.focus();
        this.onChange = (editorState) => { this.setState({ editorState }) };
        this.onSelect = () => {
            this.editor.focus();
            
            const selectionState = this.state.editorState.getSelection();
            
            if(selectionState.isCollapsed()) {
                this.onHighlightsClick();
            } else {
                this.onTextSelect();
            }
        };
    }

    // Public Methods

    setMode(mode) {
        this.setState({mode: mode});
    }

    getMode() {
        return this.state.mode;
    }

    setContentData(content) {

    }

    getContentData() {

    }

    applys(from, to, comments) {

    }

    setComments(highlight, comment) {

    }

    removeContent(from, to) {
        const editorState = this.state.editorState;
        const currentContent = editorState.getCurrentContent();
        const selectionState = this._generalSelectionToLocalSelection(from, to);
        console.log(from, to, selectionState.serialize());
        
        const contentState = Draft.Modifier.removeRange(currentContent, selectionState, 'forward');
        const finallyEditorState = Draft.EditorState.push(editorState, contentState, 'remove-range');

        this.onChange(finallyEditorState);
    }

    removeHighlight(highlight) {

    }

    // Events

    onTextSelect() {
        if(this.props.onTextSelect === undefined) {
            return;
        }

        const entities = this._findEntitiesSelection(this.state.editorState);
        const {from, to} = this._localSelectionToGeneralSelection();
        const highlights = this._fetchHighlightsFromEntities(entities);

        this.props.onTextSelect(from, to, highlights);
    }

    onHighlightsClick() {
        if(this.props.onHighlightsClick === undefined) {
            return;
        }
        
        const entities = this._findEntitiesSelection(this.state.editorState);
        const highlights = this._fetchHighlightsFromEntities(entities);
        
        this.props.onHighlightsClick(highlights);
    }

    //Private Methods

    _findEntitiesSelection(editorState) {
        const selectionState = editorState.getSelection();
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

    _findEntitiesByType(entities, type) {
        let items = [];

        for(let i in entities) {
            if(entities[i].entity.getType() === type) {
                items.push(entities[i]);
            }
        }

        return items;
    }

    _localSelectionToGeneralSelection() {
        const editorState = this.state.editorState;
        const selectionState = editorState.getSelection();
        const currentContent = editorState.getCurrentContent();
        const selectionStartKey = selectionState.getStartKey();
        const selectionStartOffset = selectionState.getStartOffset();
        const selectionEndKey = selectionState.getEndKey();
        const selectionEndOffset = selectionState.getEndOffset();
        const blocks = currentContent.getBlocksAsArray();

        let from = 0;
        let to = 0;

        for(let i in blocks) {
            if(blocks[i].getKey() === selectionStartKey) {
                from += selectionStartOffset;
                break;
            }
            from += blocks[i].getLength();
        }
        
        for(let i in blocks) {
            if(blocks[i].getKey() === selectionEndKey) {
                to += selectionEndOffset;
                break;
            }
            to += blocks[i].getLength();
        }

        return {
            from: from,
            to: to
        };        
    }

    _generalSelectionToLocalSelection(from, to) {
        const editorState = this.state.editorState;
        const currentContent = editorState.getCurrentContent();
        const blocks = currentContent.getBlocksAsArray();
        let selectionState = null;
        let selectionStartKey = null;
        let selectionStartOffset = 0;
        let selectionEndKey = null;
        let selectionEndOffset = 0;
        let start = 0;
        let end = 0;

        for(let i in blocks) {
            start += blocks[i].getLength();

            if(start >= from) {
                selectionStartOffset = (start - blocks[i].getLength()) + from;
                selectionStartKey = blocks[i].getKey();
                break;
            }
        }

        for(let i in blocks) {
            end += blocks[i].getLength();
            
            if(end >= to) {
                selectionEndOffset = (end - blocks[i].getLength()) + to;
                selectionEndKey = blocks[i].getKey();
                break;
            }
        }

        if(start + end === 0) {
            return null;
        }

        selectionState = Draft.SelectionState.createEmpty(selectionStartKey);
        const updatedSelectionState = selectionState.merge({
            anchorKey: selectionStartKey,
            anchorOffset: selectionStartOffset,
            focusKey: selectionEndKey,
            focusOffset: selectionEndOffset,
            isBackward: false,
            hasFocus: true
        });

        return updatedSelectionState;
    }

    _fetchHighlightsFromEntities(entities) {
        let highlights = [];
        let data;
        
        for(let i in entities) {
            data = entities[i].entity.getData();
            if(data.highlight) {
                highlights.push(data.highlight);
            }
        }

        return highlights;
    }

    _addComment() {

        const entities = this._findEntitiesSelection(this.state.editorState);
        const removes = this._findEntitiesByType(entities, 'REMOVED');

        let editorState = this.state.editorState
        let selectionState = editorState.getSelection();
        let currentContent = editorState.getCurrentContent();
        let finallyEditorState;

        if(selectionState.isCollapsed()) {
            return false;
        }
        
        if(entities.length === 0 || removes.length ) {
            const entityContentState = currentContent.createEntity('COMMENT', 'MUTABLE', null);
            const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
            finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
        }

        if(removes.length) {
            for(let i in removes) {
                const newSelectionState = Draft.SelectionState.createEmpty(removes[i].block).merge({
                    anchorOffset: removes[i].range.start,
                    focusKey: removes[i].block,
                    focusOffset: removes[i].range.end,
                    isBackward: false,
                    hasFocus: true
                });
                const editorStateWithSelection = Draft.EditorState.forceSelection(finallyEditorState, newSelectionState);
                currentContent = editorStateWithSelection.getCurrentContent();
                selectionState = editorStateWithSelection.getSelection();
                const entityContentState = currentContent.createEntity('COMMENT_REMOVED', 'MUTABLE', null);
                const entityEditortState = Draft.EditorState.push(editorStateWithSelection, entityContentState, 'apply-entity');
                finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
            }
        }

        this.onChange(finallyEditorState);
    }

    _removeText() {
        
        const entities = this._findEntitiesSelection(this.state.editorState);
        const comments = this._findEntitiesByType(entities, 'COMMENT');

        let editorState = this.state.editorState
        let selectionState = editorState.getSelection();
        let currentContent = editorState.getCurrentContent();
        let finallyEditorState;

        if(selectionState.isCollapsed()) {
            return false;
        }
        
        if(entities.length === 0 || comments.length) {
            const entityContentState = currentContent.createEntity('REMOVED', 'MUTABLE', null);
            const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
            finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
        }

        if(comments.length) {
            for(let i in comments) {
                const newSelectionState = Draft.SelectionState.createEmpty(comments[i].block).merge({
                    anchorKey: comments[i].block,
                    anchorOffset: comments[i].range.start,
                    focusKey: comments[i].block,
                    focusOffset: comments[i].range.end,
                    isBackward: false,
                    hasFocus: true
                });
                const editorStateWithSelection = Draft.EditorState.forceSelection(finallyEditorState, newSelectionState);
                currentContent = editorStateWithSelection.getCurrentContent();
                selectionState = editorStateWithSelection.getSelection();
                const entityContentState = currentContent.createEntity('COMMENT_REMOVED', 'MUTABLE', null);
                const entityEditortState = Draft.EditorState.push(editorStateWithSelection, entityContentState, 'apply-entity');
                finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
            }
        }

        this.onChange(finallyEditorState);
    }

    render() {
        return (
            <div className="RichEditor-root" onClick={this.onSelect}>
            <Draft.Editor
                ref={(editor) => {this.editor = editor;}}
                editorState={this.state.editorState}
                onChange={this.onChange} />
            </div>
        );
    }
}

export default RichEditor;