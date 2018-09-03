import React from 'react'

class InsertBlock extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="insert-block">{this.props.block.getText()}</div>
        );
    }
}

export default InsertBlock;