import React from "react";
import styles from "./GameOverlay.module.scss"
import {getTeamColor, getTeamName, MatchState} from "@hexx/common";
import pretty from "pretty-ms"

type Props = {
    matchState: MatchState
    playerTeam: number
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
        const left = Math.floor((this.props.matchState.roundStageEndsAt - +new Date()) / 1000) * 1000
        if (left <= 0 && this.state.timeLeft !== 0)
            this.setState({timeLeft: 0})
        else if (left > 0)
            this.setState({timeLeft: left})
    }

    render() {
        return <div className={styles.overlay}>
            <ul className={styles.teams}>
                {this.props.matchState.teamsRotation.map(t => {
                    return <li className={`${styles.team}${t === this.props.matchState.currentTeam ? (' ' + styles.currentTeam) : ''}`} key={t}>
                        <div style={{backgroundColor: getTeamColor(t)}} className={styles.poly} />
                        <span className={styles.text}>{getTeamName(t)}</span>
                    </li>
                })}
            </ul>

            <div className={styles.top}>
                <div className={styles.body}>
                    <span>You are {getTeamName(this.props.playerTeam)}</span>
                    <div className={styles.domination}>
                        {Array.from(this.props.matchState.domination.teamPoints.entries()).map(v => {
                            return <div key={v[0]} style={{flexGrow: v[1], backgroundColor: getTeamColor(+v[0])}} />
                        })}
                    </div>

                    <div className={styles.timer}>
                        {pretty(this.state.timeLeft, {colonNotation: true})}
                    </div>
                    <small>round {this.props.matchState.currentRound}</small>
                </div>

                <div className={styles.gameStage}
                     style={{backgroundColor: getTeamColor(this.props.matchState.currentTeam)}}>
                    {
                    this.props.matchState.currentRoundStage == 2 ?
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