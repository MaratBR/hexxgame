import React from "react";
import {DominationState, getTeamColor, getTeamName} from "@hexx/common";
import styles from './MatchResults.module.scss'
import Brand from "../../components/Brand";
import {NavLink, Redirect} from "react-router-dom"
import {makeRoute, ROOM_ROUTE} from "../../routes";

type Props = {
    winner: number
    domination: DominationState
    teams: number[]
    roomID?: string
}

type State = {
    backToRoom?: boolean
}

export default class MatchResults extends React.Component<Props, State> {
    state: State = {}

    render() {
        return <div className={styles.root}>
            <div className={styles.results}>
                {this.props.teams.map(team => {
                    return <div className={`${styles.team} ${team === this.props.winner ? styles.winner : ''}`}>
                        {team === this.props.winner ? <div className={styles.topText}>
                            <Brand animated={true} text="Winner!" />
                        </div> : undefined}
                        <svg
                            width="100"
                            height="100"
                            viewBox="0 0 173.20508075688772 200">
                            <path fill={getTeamColor(team)}
                                  d="M86.60254037844386 0L173.20508075688772 50L173.20508075688772 150L86.60254037844386 200L0 150L0 50Z" />
                        </svg>
                        <div className={styles.name}>{getTeamName(team)}</div>
                    </div>
                })}
            </div>
            {this.props.roomID ? <div className={styles.back}>
                <NavLink
                    className="button"
                    to={makeRoute(ROOM_ROUTE, {id: this.props.roomID})}>Back to room</NavLink>
            </div> : undefined}
        </div>
    }
}