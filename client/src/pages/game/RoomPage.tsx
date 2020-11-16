import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import {LobbyState} from "lib_shared/colyseus";
import {Room} from "colyseus.js";


export default class RoomPage extends React.Component<any, LobbyState> {
    static contextType = ApiContext;
    context!: AppAPI
    private lobby?: Room<LobbyState>

    constructor(props: any) {
        super(props);
        this.onChangedHandler = this.onStateChanged.bind(this)
        this.state = new LobbyState({})
    }

    onChangedHandler: (state: LobbyState) => void

    componentDidMount() {
        debugger
        this.lobby = this.context.lobby
        if (this.lobby) {
            this.lobby.onStateChange(this.onChangedHandler)
        }
    }

    componentWillUnmount() {
        if (this.lobby) {
            this.lobby.onStateChange.remove(this.onChangedHandler)
        }
    }

    onStateChanged(state: LobbyState) {
        this.setState(state)
    }

    render() {
        return <div>
            <h1>Page {this.state.id}</h1>

            {this.renderTeam('Spectators', this.state.spectators)}
        </div>
    }

    renderTeam(name: string, players: string[]) {
        return <div>
            <h2>{name}</h2>
            {
                players.map(clientID => {
                    const data = this.state.clients[clientID]
                    if (data) return <div data-id={clientID} data-db-id={data.dbID}>
                        <div>{data.username}</div>
                    </div>
                })
            }
        </div>
    }
}