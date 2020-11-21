import React, {CSSProperties} from "react";
import styles from "./Brand.module.scss"

type BrandParams = {
    small?: boolean
    onClick?: () => void,
    text?: string
    style?: CSSProperties
    delay?: number
    animated?: boolean
}

type BrandState = {
    animated?: boolean
}

class Brand extends React.Component<BrandParams, BrandState> {
    state: BrandState = {}

    componentDidMount() {
        if (this.props.animated) {
            setTimeout(() => this.setState({animated: true}), this.props.delay || 0)
        }
    }

    render() {
        const text = this.props.text || (this.props.small ? 'h' : 'hexx')
        return <div className={`${styles.brand}${this.state.animated ? (' ' + styles.brandAnimated) : ''}`}
                    onClick={() => this.props.onClick ? this.props.onClick() : undefined}
                    style={this.props.style}>
            <h2>{text}</h2>
            {
                this.state.animated ? [
                    <h2>{text}</h2>,
                    <h2>{text}</h2>,
                    <h2>{text}</h2>,
                    <h2>{text}</h2>
                ] : undefined
            }
        </div>
    }
}

export default Brand