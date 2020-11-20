import React, {CSSProperties} from "react";
import styles from "./Brand.module.scss"

type BrandParams = {
    small?: boolean
    onClick?: () => void,
    text?: string
    style?: CSSProperties
}

const Brand: React.FunctionComponent<BrandParams> = (params) => {
    const text = params.text || (params.small ? 'h' : 'hexx')
    return <div className={styles.brand} onClick={() => params.onClick ? params.onClick() : undefined} style={params.style}>
        <h2>{text}</h2>
        <h2>{text}</h2>
        <h2>{text}</h2>
        <h2>{text}</h2>
        <h2>{text}</h2>
    </div>
};

export default Brand