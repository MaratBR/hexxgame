import React from "react";
import styles from "./Brand.module.scss"

type BrandParams = {
    small?: boolean
    onClick?: () => void,
    text?: string
}

const Brand: React.FunctionComponent<BrandParams> = (params) => {
    const text = params.text || (params.small ? 'h' : 'hexx')
    return <div className={styles.brand} onClick={() => params.onClick ? params.onClick() : undefined}>
        <h2>{text}</h2>
        <h2>{text}</h2>
        <h2>{text}</h2>
        <h2>{text}</h2>
        <h2>{text}</h2>
    </div>
};

export default Brand