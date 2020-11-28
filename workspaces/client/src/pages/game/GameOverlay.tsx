import React from "react";
import styles from "./GameOverlay.module.scss"
import {getTeamColor, getTeamName} from "@hexx/common";

type Props = {
    teamsRotation: number[]
    currentTeam: number
    currentStage: number
    endsAt: number
}

export default class GameOverlay extends React.Component<Props, any> {

    constructor(props: Readonly<Props>) {
        super(props);
    }

    static getDerivedStateFromProps(props: Props) {

    }

    render() {
        return <div className={styles.overlay}>
            <ul className={styles.teams}>
                {this.props.teamsRotation.map(t => {
                    return <li className={`${styles.team}${t === this.props.currentTeam ? (' ' + styles.currentTeam) : ''}`} key={t}>
                        <div style={{backgroundColor: getTeamColor(t)}} className={styles.poly} />
                        <span className={styles.text}>{getTeamName(t)}</span>
                    </li>
                })}
            </ul>

            <div className={styles.top}>
                <div></div>

                <div className={styles.timer} />
            </div>
        </div>
    }

}