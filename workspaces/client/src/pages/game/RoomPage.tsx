import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import {Room} from "colyseus.js";
import styles from "./RoomPage.module.scss"
import {getTeamColor, getTeamName, ILobbyState, GameMapInfoDto} from "@hexx/common";
console.log(getTeamColor(0))



type RoomState = ILobbyState & {
    maps: {
        loading?: boolean,
        list?:  GameMapInfoDto[]
    }
    expandedMap?: string
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
        return <div className={styles.root}>
            <div className={styles.playersList}>
                {this.renderTeam(0, this.state.spectators)}
            </div>

            <div className={styles.mapsWrap}>
                <div className={styles.maps}>
                    {this.state.maps?.list?.map(m => {
                        return <div className={styles.map} onClick={() => this.setState({expandedMap: m.id})}>
                            <span>{m.name}</span>
                            <button className={styles.select}>Select</button>
                            <div className={styles.mapInfo} style={{display: m.id == this.state.expandedMap ? 'block' : 'none'}}>
                                <b>Cells:</b> {m.cellsCount} <br/>
                                <b>Created at:</b> {m.createdAt} <br/>
                                <b>Max teams:</b> {m.maxTeams} <br/>
                            </div>
                        </div>
                    })}
                </div>
            </div>
        </div>
    }

    renderTeam(id: number, players: string[]) {
        return <div className={styles.team}>
            <div className={styles.poly} style={{background: getTeamColor(id)}} />
            <h2>{getTeamName(id)}</h2>
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