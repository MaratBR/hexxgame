import React from 'react'
import styles from './Overlay.module.scss'

export default class Overlay extends React.Component<any, any> {

    render() {
        return <div className={styles.overlay}>
            <div className={styles.bottom}>

            </div>
        </div>;
    }
}