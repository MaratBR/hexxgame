import React from "react"
import styles from "./Loading.module.scss"
import Modal from "./Modal";
import Brand from "./Brand";

type LoadingProps = {
    fixed?: boolean
    type?: 'text' | 'spinner'
}

type LoadingState = {
    appeared?: boolean
}

export default class Loading extends React.Component<LoadingProps, LoadingState> {
    state: LoadingState = {}

    componentDidMount() {
        setTimeout(() => this.setState({appeared: true}), 500)
    }

    render() {
        const loader = this.renderLoading()

        if (this.props)
            return <Modal blurred={false}>
                {loader}
            </Modal>
        return loader
    }

    private renderLoading() {
        const style = {display: this.state.appeared ? 'initial' : 'none'}
        if (this.props.type == 'spinner')
            return <div className={styles.loading} style={style}>
                Loading...
            </div>
        return <Brand animated delay={0} text="Loading..." style={style} />
    }
}