import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import {ILobbyState} from "lib_shared/colyseus";
import {Room} from "colyseus.js";
import styles from "./RoomPage.module.scss"

const DEFAULT_STATE: ILobbyState = {
    teamsNum: 0,
    spectators: [],
    teams: [],
    clients: {}
}

export default class RoomPage extends React.Component<any, ILobbyState> {
    static contextType = ApiContext;
    context!: AppAPI
    private lobby?: Room<ILobbyState>

    constructor(props: any) {
        super(props);
        this.onChangedHandler = this.onStateChanged.bind(this)
        this.state = DEFAULT_STATE
    }

    onChangedHandler: (state: ILobbyState) => void

    async componentDidMount() {
        this.lobby = this.context.lobby
        if (this.lobby) {
            this.lobby.onStateChange(this.onChangedHandler)
            this.setState(this.lobby.state)
        } else {
            try {
                await this.context.joinRoom(this.props.match.params.id)
                this.lobby = this.context.lobby
                this.setState(this.lobby!.state)
                this.lobby!.onStateChange(this.onChangedHandler)
            } catch (e) {
                console.log(e)
            }
        }
    }

    private updateStateFromLobby() {
        if (this.context.lobby) {
            this.setState(this.context.lobby.state)
            return true
        }
        return false
    }

    componentWillUnmount() {
        if (this.lobby) {
            this.lobby.onStateChange.remove(this.onChangedHandler)
        }
    }

    onStateChanged(state: ILobbyState) {
        this.setState(state)
        console.log(state)
    }

    render() {
        return <div>
            <div className={styles.playersList}>
                <div className={styles.spectators}>
                    <h2>Spectators</h2>
                    {this.renderPlayers(this.state.spectators)}
                </div>
            </div>
        </div>
    }

    renderPlayers(players: string[]) {
        return players.map(clientID => {
            const data = this.state.clients[clientID]
            if (data) return <div key={clientID}
                                  className={styles.player}
                                  data-id={clientID}
                                  data-db-id={data.dbID}>
                <div>{data.username}</div>
            </div>
        })
    }
}