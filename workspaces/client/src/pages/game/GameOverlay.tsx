import React from "react";
import styles from "./GameOverlay.module.scss"
import {DominationState, getTeamColor, getTeamName} from "@hexx/common";
import pretty from "pretty-ms"

type Props = {
    teamsRotation: number[]
    currentTeam: number
    currentStage: number
    currentRound: number
    endsAt: number
    domination: DominationState
    onSkip?: () => void
}

type State = {
    timeLeft: number
}

export default class GameOverlay extends React.Component<Props, State> {
    state: State = {
        timeLeft: 0
    }
    timeout?: NodeJS.Timeout

    constructor(props: Readonly<Props>) {
        super(props);
    }

    componentDidMount() {
        this.timeout = setInterval(this.tick.bind(this), 1000)
    }

    componentWillUnmount() {
        if (this.timeout)
            clearInterval(this.timeout)
    }

    tick() {
        const left = Math.floor((this.props.endsAt - +new Date()) / 1000) * 1000
        if (left <= 0 && this.state.timeLeft !== 0)
            this.setState({timeLeft: 0})
        else if (left > 0)
            this.setState({timeLeft: left})
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
                <div className={styles.body}>
                    {Array.from(this.props.domination.teamCells.entries()).map(v => {
                        return <div>{v[0]} = {v[1]}</div>
                    })}
                    <div className={styles.domination}>
                        {Array.from(this.props.domination.teamPoints.entries()).map(v => {
                            return <div key={v[0]} style={{flexGrow: v[1], backgroundColor: getTeamColor(+v[0])}} />
                        })}
                    </div>

                    <div className={styles.timer}>
                        {pretty(this.state.timeLeft, {colonNotation: true})}
                    </div>
                    <small>round {this.props.currentRound}</small>
                </div>

                <div className={styles.gameStage}
                     style={{backgroundColor: getTeamColor(this.props.currentTeam)}}>
                    {
                    this.props.currentStage == 2 ?
                        'Power up' :
                        'Attack'
                    }
                </div>

                <div className={styles.buttonBar}>
                    <button onClick={() => this.props.onSkip ? this.props.onSkip() : undefined}>Skip</button>
                </div>
            </div>
        </div>
    }

}