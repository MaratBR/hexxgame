import React from "react";
import styles from "./Brand.module.scss"

type BrandParams = {
    small?: boolean
}

const Brand: React.FunctionComponent<BrandParams> = ({small}) => {
    return <div className={styles.brand}>
        <h2>{small ? 'h' : 'hexx'}</h2>
        <h2>{small ? 'h' : 'hexx'}</h2>
        <h2>{small ? 'h' : 'hexx'}</h2>
        <h2>{small ? 'h' : 'hexx'}</h2>
        <h2>{small ? 'h' : 'hexx'}</h2>
    </div>
};

export default Brand