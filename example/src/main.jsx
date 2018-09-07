import React from 'react';
import ReactDOM from 'react-dom';
import RichEditor from '../../src/rich-editor.jsx';

let richEditor = null;

const onTextSelect = (from, to, highlights) => {
    console.log(from, to, highlights);
};

const onHighlightsClick = (highlights) => {
    console.log(highlights);
};

const comment = () => {
    richEditor._addComment();
};

const remove = () => {
    richEditor._removeText();
};

const setEditorMode = () => {
    richEditor.setMode("editor");
};

const setCommentorMode = () => {
    richEditor.setMode("commentor");
};

const setViewerMode = () => {
    richEditor.setMode("viewer");
};

ReactDOM.render(
    <div>
        <div className="toolbar">
            <div className="group">
                <button onClick={setEditorMode}>Editor</button>
                <button onClick={setCommentorMode}>Commentor</button>
                <button onClick={setViewerMode}>Viewer</button>
            </div>
            <div className="group">
                <button onClick={comment}>Comment</button>
                <button onClick={remove}>Remove</button>
            </div>
        </div>
        <RichEditor
            id="richEditor"
            mode="commentor"
            ref={(component) => {richEditor = component}}
            onTextSelect={onTextSelect}
            onHighlightsClick={onHighlightsClick}
        />
    </div>, document.querySelector('div.content')
);