import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import {ILobbyState} from "lib_shared/colyseus";
import {Room} from "colyseus.js";
import styles from "./RoomPage.module.scss"
import {GameMapInfoDto} from "lib_shared/dto";
import {getTeamColor, getTeamName} from "lib_shared/consts";
console.log(getTeamColor(0))

type RoomState = ILobbyState & {
    maps: {
        loading?: boolean,
        list?:  GameMapInfoDto[]
    }
}

const DEFAULT_STATE: RoomState = {
    teamsNum: 0,
    spectators: [],
    teams: [],
    clients: {},
    maps: {}
}

export default class RoomPage extends React.Component<any, RoomState> {
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

        await this.updateMaps()
    }

    private async updateMaps() {
        if (this.state.maps.loading)
            return

        this.setState({
            maps: {loading: true}
        })

        try {
            this.setState({
                maps: {
                    list: await this.context.getMaps(),
                    loading: false
                }
            })
        } catch (e) {
            this.setState({
                maps: {
                    loading: false
                }
            })
        }
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
                {this.renderTeam(0, this.state.spectators)}
            </div>

            <div className={styles.maps}>
                {this.state.maps?.list?.map(m => {
                    return <div className={styles.map}>
                        <span>{m.name}</span>
                    </div>
                })}
            </div>
        </div>
    }

    renderTeam(id: number, players: string[]) {
        return <div className={styles.team}>
            <div className={styles.poly}  />
            <h2>sd</h2>
            <div className={styles.players}>
                {this.renderPlayers(players)}
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