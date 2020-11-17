import React from "react"
import styles from "./Modal.module.scss"

type ModalProps = {
    blurred?: boolean
}

const Modal: React.FunctionComponent<ModalProps> = ({children, blurred}) => {
    return <div className={styles.modalRoot + (blurred === false ? '' : ' ' + styles.blur)}>
        {children}
    </div>
}

export default Modal