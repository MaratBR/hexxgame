import React from "react"
import styles from "./Loading.module.scss"
import Modal from "./Modal";

export default function Loading({fixed}: {fixed?: boolean}) {
    let appeared = false

    const loader = <div className={styles.loading} style={{display: appeared ? 'initial' : 'none'}}>
        Loading...
    </div>

    setTimeout(() => appeared = true, 1000)

    if (fixed)
        return <Modal blurred={false}>
            {loader}
        </Modal>
    return loader
}