import React from 'react';

class CustomDecorator {
    static Styles() {
        return {
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
    }
    
    static CommentComponent(props) {
        return (
            <span style={CustomDecorator.Styles().comment}>
                {props.children}
            </span>
        );
    }
    
    static RemovedComponent(props) {
        return (
            <span style={CustomDecorator.Styles().removed}>
                {props.children}
            </span>
        );
    }
    
    static CommentRemovedComponent(props) {
        return (
            <span style={CustomDecorator.Styles().commentRemoved}>
                {props.children}
            </span>
        );
    }
    
    static CommentStrategy(contentBlock, callback, contentState) {
        contentBlock.findEntityRanges((character) => {
            const entityKey = character.getEntity();
            return (
                entityKey !== null && contentState.getEntity(entityKey).getType() === 'COMMENT'
            );
        }, callback);
    }
    
    static RemovedStrategy(contentBlock, callback, contentState) {
        contentBlock.findEntityRanges((character) => {
            const entityKey = character.getEntity();
            return (
                entityKey !== null && contentState.getEntity(entityKey).getType() === 'REMOVED'
            );
        }, callback);
    }
    
    static CommentRemovedStrategy(contentBlock, callback, contentState) {
        contentBlock.findEntityRanges((character) => {
            const entityKey = character.getEntity();
            
            return (
                entityKey !== null && contentState.getEntity(entityKey).getType() === 'COMMENT_REMOVED'
            );
        }, callback);
    }
}

export default CustomDecorator;