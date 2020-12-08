import React from "react"
import Modal from "./Modal"
import styles from "./ModalNotification.module.scss"

type Props = {
    onClose?: () => void
    title?: string
}

export default function ModalNotification({children, title, onClose}: React.PropsWithChildren<Props>) {
    return <Modal onClickOutside={() => onClose ? onClose() : undefined}>
        <div className={styles.modal}>
            <div className={styles.title}>
                {title}
                <button onClick={() => onClose ? onClose() : undefined}>
                    <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                </button>
            </div>
            <div className={styles.body}>{children}</div>
        </div>
    </Modal>
}