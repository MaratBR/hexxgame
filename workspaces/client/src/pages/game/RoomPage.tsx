import React from "react";
import ReactDOM from "react-dom"
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import {Room} from "colyseus.js";
import styles from "./RoomPage.module.scss"
import {getTeamColor, getTeamName, IGameLobbyState, GameMapInfoDto} from "@hexx/common";
import Brand from "../../components/Brand";
import GameMap from "./GameMap";
import UIContext from "../UIContext";
import Loading from "../../components/Loading";


type RoomState = Partial<IGameLobbyState> & {
    maps: {
        loading?: boolean,
        list?:  GameMapInfoDto[]
    }
    expandedMap?: string,
    selectedMap?: GameMapInfoDto
    loaded?: boolean
}

const DEFAULT_STATE: RoomState = {
    maps: {}
}

export default class RoomPage extends React.Component<any, RoomState> {
    static contextType = ApiContext;
    context!: AppAPI
    private lobby?: Room<IGameLobbyState>

    constructor(props: any) {
        super(props);
        this.onChangedHandler = this.onStateChanged.bind(this)
        this.state = DEFAULT_STATE
    }

    onChangedHandler: (state: IGameLobbyState) => void

    get currentClient() {
        const sid = this.lobby?.sessionId
        return sid && this.state.clients ? this.state.clients.get(sid) : undefined
    }

    async componentDidMount() {
        this.lobby = this.context.lobby
        if (this.lobby) {
            this.lobby.onStateChange(this.onChangedHandler)
            this.setState(this.lobby.state)
        } else {
            try {
                await this.context.joinRoom(this.props.match.params.id)
                this.lobby = this.context.lobby
                if (this.lobby!.state.id) {
                    this.onStateChanged(this.lobby!.state)
                }
                this.lobby!.onStateChange(this.onChangedHandler)
            } catch (e) {
                console.log(e)
            }
        }

        await this.updateMaps()

        if (this.state.match && this.state.match.id) {
            UIContext.fullscreen.next(true)
        }
    }

    componentWillUnmount() {
        if (this.lobby) {
            this.lobby.onStateChange.remove(this.onChangedHandler)
        }
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
            this.onMapChanged()
        } catch (e) {
            this.setState({
                maps: {
                    loading: false
                }
            })
        }
    }

    onStateChanged(state: IGameLobbyState) {
        const mapChanged = this.state.selectedMapID !== state.selectedMapID
        console.log(this.state.loaded)
        if (!this.state.loaded) {
            ;(state as RoomState).loaded = true;
            console.log('set loaded to true')
        } else {
            console.log('did not set loaded to true')
            console.warn(this.state.loaded)
        }
        this.setState(state)

        if (mapChanged) {
            this.onMapChanged()
        }
    }

    render() {
        if (!this.state.loaded)
            return <Loading />

        if (this.state.match?.id) {
            return this.renderGame()
        }

        return <div className={styles.root}>
            <div className={styles.toolBar}>
                <button
                    onClick={() => this.lobby!.send('toggleReady')}
                    className={this.currentClient?.ready ? styles.ready : styles.notReady}>
                    {this.currentClient?.ready ? 'Ready' : 'Not ready'}
                </button>
                <div className={styles.toolBarSection}>
                    <h3>Selected map</h3>
                    {this.state.selectedMap?.name}
                </div>
            </div>
            <div className={styles.play} onClick={() => this.lobby!.send('start')}>
                <button>
                    <Brand text="Play" style={{fontSize: '1.5em'}} />
                </button>
            </div>

            <div className={styles.playersList}>
                {this.state.spectators ? this.renderTeam(0, this.state.spectators) : undefined}

                {this.state.teams ? this.state.teams.map((team, index) => {
                    return this.renderTeam(index + 1, team.members, team.ready)
                }) : undefined}
            </div>

            <div className={styles.mapsWrap}>
                <div className={styles.maps}>
                    {this.state.maps?.list?.map(m => {
                        return <div className={styles.map} onClick={() => this.setState({expandedMap: m.id})}>
                            <span>{m.name}</span>
                            <button className={styles.select} onClick={() => this.setMap(m.id)}>Select</button>
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

    renderTeam(id: number, players: string[], ready?: boolean) {
        return <div className={`${styles.team}${ready ? (' ' + styles.teamReady) : ''}`}>
            <div className={styles.poly} style={{background: getTeamColor(id)}} />
            <h2>
                {getTeamName(id)}
                <button
                    hidden={!this.canJoinTeam(id)}
                    onClick={() => this.lobby!.send("setTeam", id)}>
                    Join
                </button>
            </h2>
            <div className={styles.players}>
                {this.context.lobby?.sessionId}
                {this.renderPlayers(players)}
            </div>
        </div>
    }

    canJoinTeam(team: number) {
        const sessionId = this.lobby?.sessionId
        if (!sessionId)
            return false
        const currentTeam = this.currentClient?.team
        return typeof currentTeam !== 'undefined' && currentTeam !== team
    }

    renderPlayers(players: string[]) {
        return players.map(clientID => {
            const data = this.state.clients?.get(clientID)
            if (data)
                return <div key={clientID}
                                  className={`${styles.player}${data.ready ? (' ' + styles.playerReady) : ''}`}
                                  data-id={clientID}
                                  data-db-id={data.dbID}>
                    <div title={data.dbID}>
                        {data.username.startsWith('Anonymous') ? ('Anon' + data.username.substr(9)) : data.username}
                    </div>
                </div>
        })
    }

    private setMap(id: string) {
        this.context.lobby!.send('setMap', id)
    }

    private onMapChanged() {
        this.setState({
            selectedMap: this.state.maps.list?.find(m => m.id == this.state.selectedMapID)
        })
    }

    private renderGame() {
        return <div className={styles.gameRoot}>
            <GameMap room={this.lobby!} />
        </div>
    }
}