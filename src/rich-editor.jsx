import React from 'react'; 
import Draft from 'draft-js';
import CustomDecorator from './custom-decorator.jsx';

class RichEditor extends React.Component {
    
    constructor(props) {
        super(props);

        this.state = {
            editorState: Draft.EditorState.createEmpty(this._getCompositeDecorator()),
            mode: props.mode || 'commentor',
        };
        this.highlights = new Map();
        
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

    setContentData(data) {
        const contentState = Draft.ContentState.createFromText(data.text);
        let editorState = Draft.EditorState.createWithContent(contentState, this._getCompositeDecorator());

        this.onChange(editorState);
        
        const main = this;

        window.setTimeout(() => {
            for(let i in data.highlights) {
                if(data.highlights[i].type == 3) {
                    editorState = main._createComment(editorState, main._generalSelectionToLocalSelection(data.highlights[i].from, data.highlights[i].to), data.highlights[i]);
                } else if(data.highlights[i].type == 2) {
                    editorState = main._createRemove(editorState, main._generalSelectionToLocalSelection(data.highlights[i].from, data.highlights[i].to), data.highlights[i]);
                }
            }
    
            main.onChange(editorState);
        }, 100);
    }

    getContentData() {
        const editorState = this.state.editorState;
        const contentState = editorState.getCurrentContent();
        const content = contentState.getPlainText();
        const blocks = contentState.getBlocksAsArray();
        let finallyHighlights = [];
        let entities = [];
        let groups = {};
        const ranges = [];

        entities = this._findEntitites(editorState);
        
        let entityKey = 0;
        for(let i in entities) {
            entityKey = entities[i].entityKey;

            if(groups[entityKey]) {
                groups[entityKey].push(entities[i]);
            } else {
                groups[entityKey] = [];
                groups[entityKey].push(entities[i]);
            }
        }
        
        for(let i in groups) {
            const selection = Draft.SelectionState.createEmpty(groups[i][0].blockKey).merge({
                anchorKey: groups[i][0].blockKey,
                anchorOffset: groups[i][0].offset,
                focusKey: groups[i][groups[i].length - 1].blockKey,
                focusOffset: groups[i][groups[i].length - 1].offset + 1,
                isBackward: false,
                hasFocus: false
            });

            const range = this._localSelectionToGeneralSelection(selection);
            const highlights = this._fetchHighlightsFromEntities(this._distinctEntities(groups[i]));

            for(let n in highlights) {
                let highlight = highlights[n];
                highlight.from = range.from;
                highlight.to = range.to;
                highlight.text = content.slice(range.from, range.to);
                finallyHighlights.push(highlight);
            }
        }

        return {
            text: content,
            highlights: finallyHighlights
        };
    }

    applyComment(from, to, comments) {
        const selection = this._generalSelectionToLocalSelection(from, to);
        const editorState = this.state.editorState;
        this._attachComment(editorState, selection, comments);
    }

    setComments(highlight, comments) {
        const entityKeys = this.highlights.get(highlight.id);

        if(entityKeys.length === 0) {
            return;
        }

        const editorState = this.state.editorState;
        let updatedEditorState = editorState;
        
        for(let i in entityKeys) {         
            highlight.comments = comments;
            const updatedContentState = updatedEditorState.getCurrentContent().replaceEntityData(entityKeys[i], {highlight: highlight});
            updatedEditorState = Draft.EditorState.createWithContent(updatedContentState, this._getCompositeDecorator());
        }

        this.onChange(updatedEditorState);        
    }

    removeContent(from, to) {
        const editorState = this.state.editorState;
        const selectionState = this._generalSelectionToLocalSelection(from, to);
        
        this._attachRemove(editorState, selectionState);
    }

    removeHighlight(highlight) {
        const entityKeys = this.highlights.get(highlight.id);

        if(entityKeys.length === 0) {
            return;
        }
        
        //Remove entity from content
        const editorState = this.state.editorState;
        let updatedEditorState = editorState;
        
        for(let i in entityKeys) {         
            const selectionState = this._createSelectionByEntitykey(updatedEditorState, entityKeys[i]);
               
            if(selectionState) {
                updatedEditorState = Draft.RichUtils.toggleLink(updatedEditorState, selectionState, null);
            }
        }

        if(updatedEditorState) {
            this.onChange(updatedEditorState);        
            this.highlights.delete(highlight.id);
        }
    }

    // Events

    onTextSelect() {
        if(this.props.onTextSelect === undefined) {
            return;
        }

        const entities = this._findEntitiesSelection(this.state.editorState);
        const {from, to} = this._localSelectionToGeneralSelection();
        const highlights = this._fetchHighlightsFromEntities(this._distinctEntities(entities));

        this.props.onTextSelect(from, to, highlights);
    }

    onHighlightsClick() {
        if(this.props.onHighlightsClick === undefined) {
            return;
        }
        
        const editorState = this.state.editorState;
        const selectionState = editorState.getSelection();

        const entities = this._findEntitiesInSelection(editorState, selectionState);
        const highlights = this._fetchHighlightsFromEntities(this._distinctEntities(entities));
        
        this.props.onHighlightsClick(highlights);
    }

    //Private Methods

    _getCompositeDecorator() {
        const compositeDecorator = new Draft.CompositeDecorator([
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

        return compositeDecorator;
    }

    _findEntitites(editorState) {
        const currentContent = editorState.getCurrentContent();
        const selectionStartKey = currentContent.getFirstBlock().getKey();
        const selectionStartOffset = 0;
        const selectionEndKey = currentContent.getLastBlock().getKey();
        const selectionEndOffset = currentContent.getLastBlock().getLength();
        const selection = Draft.SelectionState.createEmpty(selectionStartKey).merge({
            anchorKey: selectionStartKey,
            anchorOffset: selectionStartOffset,
            focusKey: selectionEndKey,
            focusOffset: selectionEndOffset,
            isBackward: false,
            hasFocus: false
        });

        return this._findEntitiesInSelection(editorState, selection);
    }

    _findEntitiesSelection(editorState) {
        const selectionState = editorState.getSelection();
        
        return this._findEntitiesInSelection(editorState, selectionState);
    }

    _findEntitiesInSelection(editorState, selectionState) {
        const currentContent = editorState.getCurrentContent();
        const selectionStartKey = selectionState.getStartKey();
        const selectionStartOffset = selectionState.getStartOffset();
        const selectionEndKey = selectionState.getEndKey();
        const selectionEndOffset = selectionState.getEndOffset();
        
        let block = null;
        let currentKey = selectionStartKey;
        let lastStep = false;
        let entities = [];

        while (!lastStep) {
            let start = 0;
            let end = 0;

            block = currentContent.getBlockForKey(currentKey);
            
            end = block.getLength();
            
            if(currentKey === selectionEndKey) {
                lastStep = true;
                end = selectionEndOffset;
            }
            
            if(currentKey === selectionStartKey) {
                start = selectionStartOffset;
            }

            if(start === end) {
                end++;
            }
            
            for(let i = start; i < end; i++) {
                const entityKey = block.getEntityAt(i);
                let entity = null;
                if(entityKey) {
                    entity = currentContent.getEntity(entityKey);
                }

                if(entity) {
                    entities.push({
                        entityKey: entityKey,
                        entity: entity,
                        blockKey: currentKey,
                        offset: i
                    });
                }
            }

            currentKey = currentContent.getKeyAfter(currentKey);
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

    _createSelectionByEntitykey(editorState, key) {
        const entities = this._findEntitites(editorState);
        let selectionStartKey = '';
        let selectionStartOffset = 0;
        let selectionEndKey = '';
        let selectionEndOffset = 0;
        let selection = null;
        let targetEntities = [];
        
        for(let i in entities) {
            if(entities[i].entityKey == key) {
                targetEntities.push(entities[i]);
            }
        }

        if(targetEntities.length === 0) {
            return null;
        }

        selectionStartKey = targetEntities[0].blockKey;
        selectionStartOffset = targetEntities[0].offset;
        selectionEndKey = targetEntities[targetEntities.length - 1].blockKey;
        selectionEndOffset = targetEntities[targetEntities.length - 1].offset;        
        
        selection = Draft.SelectionState.createEmpty(selectionStartKey).merge({
            anchorKey: selectionStartKey,
            anchorOffset: selectionStartOffset,
            focusKey: selectionEndKey,
            focusOffset: selectionEndOffset + 1,
            isBackward: false,
            hasFocus: false
        });

        return selection;
    }

    _localSelectionToGeneralSelection(selection) {
        const editorState = this.state.editorState;
        const selectionState = selection || editorState.getSelection();
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

        for(let i = 0; i < blocks.length; i++) {
            start += blocks[i].getLength();

            if(start >= from) {
                start -= blocks[i].getLength();
                selectionStartOffset = from - start;
                selectionStartKey = blocks[i].getKey();
                break;
            }
        }
        
        for(let i = 0; i < blocks.length; i++) {
            end += blocks[i].getLength();
            
            if(end >= to) {
                end -= blocks[i].getLength();
                selectionEndOffset = to - end;
                selectionEndKey = blocks[i].getKey();
                break;
            }
        }
        
        if(selectionStartOffset + selectionEndOffset === 0) {
            return null;
        }
        
        selectionState = Draft.SelectionState.createEmpty(selectionStartKey);
        const updatedSelectionState = selectionState.merge({
            anchorKey: selectionStartKey,
            anchorOffset: selectionStartOffset,
            focusKey: selectionEndKey,
            focusOffset: selectionEndOffset,
            isBackward: false,
            hasFocus: false
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

    _distinctEntities(entities) {
        let uniqueEntities = {};
        let finallyEntities = [];
        
        for(let i in entities) {
            uniqueEntities[entities[i].entityKey] = entities[i];
        }

        for(let i in uniqueEntities) {
            finallyEntities.push(uniqueEntities[i]);
        }

        return finallyEntities;
    }

    _createComment(editorState, selectionState, highlight) {
        const entities = this._findEntitiesInSelection(editorState, selectionState);
        const removeEntities = this._findEntitiesByType(entities, 'REMOVED');

        let currentContent = editorState.getCurrentContent();
        let finallyEditorState;

        if(selectionState.isCollapsed()) {
            return false;
        }

        if(entities.length === 0 || removeEntities.length ) {
            const entityContentState = currentContent.createEntity('COMMENT', 'MUTABLE', {highlight: highlight});
            const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
            finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
            this.highlights.set(highlight.id, [entityContentState.getLastCreatedEntityKey()]);
        }

        return finallyEditorState;
    }

    _createRemove(editorState, selectionState, highlight) {
        const entities = this._findEntitiesInSelection(editorState, selectionState);
        const removeEntities = this._findEntitiesByType(entities, 'COMMENT');

        let currentContent = editorState.getCurrentContent();
        let finallyEditorState;

        if(selectionState.isCollapsed()) {
            return false;
        }

        if(entities.length === 0 || removeEntities.length ) {
            const entityContentState = currentContent.createEntity('REMOVED', 'MUTABLE', {highlight: highlight});
            const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
            finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
            this.highlights.set(highlight.id, [entityContentState.getLastCreatedEntityKey()]);
        }
        
        return finallyEditorState;
    }

    _attachComment(editorState, selectionState, comments) {
        const entities = this._findEntitiesInSelection(editorState, selectionState);
        const removeEntities = this._findEntitiesByType(entities, 'REMOVED');

        let currentContent = editorState.getCurrentContent();
        let finallyEditorState;
        let entityKeys = [];

        if(selectionState.isCollapsed()) {
            return false;
        }

        const highlight = {
            id: Date.now(),
            type: 3,
            comments: comments
        };

        if(entities.length === 0 || removeEntities.length ) {
            const entityContentState = currentContent.createEntity('COMMENT', 'MUTABLE', {highlight: highlight});
            const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
            entityKeys.push(entityContentState.getLastCreatedEntityKey());
            finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());

        }
        
        if(removeEntities.length) {
            for(let i in removeEntities) {
                const newSelectionState = Draft.SelectionState.createEmpty(removeEntities[i].block).merge({
                    anchorOffset: removeEntities[i].range.start,
                    focusKey: removeEntities[i].block,
                    focusOffset: removeEntities[i].range.end,
                    isBackward: false,
                    hasFocus: false
                });
                const editorStateWithSelection = Draft.EditorState.acceptSelection(finallyEditorState, newSelectionState);
                currentContent = editorStateWithSelection.getCurrentContent();
                selectionState = editorStateWithSelection.getSelection();
                const entityContentState = currentContent.createEntity('COMMENT_REMOVED', 'MUTABLE', {highlight: highlight});
                const entityEditortState = Draft.EditorState.push(editorStateWithSelection, entityContentState, 'apply-entity');
                entityKeys.push(entityContentState.getLastCreatedEntityKey());
                finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
                
                
            }
        }
        
        this.highlights.set(highlight.id, entityKeys);
        
        this.onChange(finallyEditorState);
    }

    _attachRemove(editorState, selectionState) {
        const entities = this._findEntitiesInSelection(editorState, selectionState);
        const commentEntities = this._findEntitiesByType(entities, 'COMMENT');

        let currentContent = editorState.getCurrentContent();
        let finallyEditorState;
        let entityKeys = [];

        if(selectionState.isCollapsed()) {
            return false;
        }

        const highlight = {
            id: Date.now(),
            type: 2,
            comments: null
        };

        if(entities.length === 0 || commentEntities.length) {
            const entityContentState = currentContent.createEntity('REMOVED', 'MUTABLE', {highlight: highlight});
            const entityEditortState = Draft.EditorState.push(editorState, entityContentState, 'apply-entity');
            entityKeys.push(entityContentState.getLastCreatedEntityKey());
            finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
        }

        if(commentEntities.length) {
            for(let i in commentEntities) {
                const newSelectionState = Draft.SelectionState.createEmpty(commentEntities[i].block).merge({
                    anchorKey: commentEntities[i].block,
                    anchorOffset: commentEntities[i].range.start,
                    focusKey: commentEntities[i].block,
                    focusOffset: commentEntities[i].range.end,
                    isBackward: false,
                    hasFocus: false
                });
                const editorStateWithSelection = Draft.EditorState.forceSelection(finallyEditorState, newSelectionState);
                currentContent = editorStateWithSelection.getCurrentContent();
                selectionState = editorStateWithSelection.getSelection();
                const entityContentState = currentContent.createEntity('COMMENT_REMOVED', 'MUTABLE', commentEntities[i].entity.getData());
                const entityEditortState = Draft.EditorState.push(editorStateWithSelection, entityContentState, 'apply-entity');
                entityKeys.push(entityContentState.getLastCreatedEntityKey());
                finallyEditorState = Draft.RichUtils.toggleLink(entityEditortState, selectionState, entityContentState.getLastCreatedEntityKey());
            }
        }

        this.highlights.set(highlight.id, entityKeys);

        this.onChange(finallyEditorState);        

    }

    render() {
        return (
            <div className="RichEditor-root" onClick={this.onSelect}>
            <Draft.Editor
                ref={(editor) => {this.editor = editor;}}
                editorState={this.state.editorState}
                on
                onChange={this.onChange} />
            </div>
        );
    }
}

export default RichEditor;