import React from 'react';
import ReactDOM from 'react-dom';
import RichEditor from '../../src/rich-editor.jsx';

let richEditor = null;
let data = null;
let selection = null;

const onTextSelect = (from, to, highlights) => {
    selection = {
        from: from,
        to: to,
        highlights: highlights
    };

    console.log(from, to, highlights);
};

const onHighlightsClick = (highlights) => {
    console.log(highlights);
};

const comment = () => {
    if(selection) {
        richEditor.applyComment(selection.from, selection.to, "Majid Ataee");
        selection = null;
    }
};

const remove = () => {
    if(selection) {
        richEditor.removeContent(selection.from, selection.to);
        selection = null;
    }
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

const exportData = () => {
    data = richEditor.getContentData();
    console.log(data);
    
};

const importData = () => {
    richEditor.setContentData(data);
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
                <button onClick={exportData}>export</button>
                <button onClick={importData}>import</button>
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