import React from "react"
import styles from "./Modal.module.scss"

type ModalProps = {
    blurred?: boolean
    onClickOutside?: () => void
}

const Modal: React.FunctionComponent<ModalProps> = ({children, blurred, onClickOutside}) => {
    return <div className={styles.modalRoot + (blurred === false ? '' : ' ' + styles.blur)} 
                onClick={e => e.target == e.currentTarget && onClickOutside ? onClickOutside() : undefined}>
        {children}
    </div>
}

export default Modal