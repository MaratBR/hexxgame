import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import styles from "./RoomPage.module.scss"
import {
    getTeamColor,
    getTeamName,
    GameMapInfoDto,
    GameRoomState,
    TeamInfo,
    MatchParticipant,
    MatchState, UserInfoDto
} from "@hexx/common";
import Brand from "../../components/Brand";
import { match } from "react-router-dom"
import Scope from "../../game/scope";
import Loading from "../../components/Loading";


type RoomState = {
    maps: {
        loading: boolean,
        list?:  GameMapInfoDto[]
    }
    expandedMap?: string,
    selectedMap?: GameMapInfoDto
    loaded?: boolean
    room?: GameRoomState
    userInfo?: UserInfoDto
}

type Props = {
    match: match<{id: string}>
}

export default class RoomPage extends React.Component<Props, RoomState> {
    static contextType = ApiContext;
    context!: AppAPI
    state: RoomState = {
        maps: {
            loading: false
        }
    }

    private readonly scope = new Scope()
    private readonly roomScope = this.scope.getChild()

    constructor(props: Props) {
        super(props);
    }

    get currentClient() {
        const sid = this.context.requireRoom().sessionId
        return sid && this.context.requireRoom().state.clients ? this.context.requireRoom().state.clients.get(sid) : undefined
    }

    async componentDidMount() {
        this.scope.addSubscription(
            this.context.onRoomStateChanged(this.onStateChanged.bind(this))
        )

        if (!this.context.room) {
            try {
                await this.context.joinRoom(this.props.match.params.id)
            } catch (e) {
                console.error(e)
            }
        }

        await this.updateMaps()
        this.setState({
            userInfo: await this.context.getUserInfo()
        })
    }

    componentWillUnmount() {
        this.scope.reset()
    }

    private async updateMaps() {
        if (this.state.maps?.loading)
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

    private onStateChanged(state?: GameRoomState) {
        this.roomScope.reset()
        if (!state) {
            // TODO
            return
        }

        this.setState({room: state})

        if (!this.state.loaded) {
            this.setState({loaded: true});
        }
    }

    render() {
        if (!this.state.room)
            return <Loading />
        return <div className={styles.root}>
            <div className={styles.toolBar}>
                <button
                    onClick={() => this.context.requireRoom().send('toggleReady')}
                    className={
                        this.state.userInfo && this.state.room.clients.get(this.state.userInfo.id).ready ?
                            styles.ready :
                            styles.notReady}>
                    {this.state.userInfo ? (
                        this.state.room.clients.get(this.state.userInfo.id).ready ?
                            'Ready' :
                            'Not ready') : undefined}
                </button>
                <div className={styles.toolBarSection}>
                    <h3>Selected map</h3>
                    {this.state.selectedMap?.name || this.state.room.selectedMapID}
                </div>
            </div>

            <div className={styles.play} onClick={() => this.context.requireRoom().send('start')}>
                <button>
                    <Brand text="Play" style={{fontSize: '1.5em'}} />
                </button>
            </div>

            <div className={styles.playersList}>
                <pre>{JSON.stringify(this.state.room.match.id)}</pre>
                {this.state.room.match.id ? <div>
                    This room has an ongoing match with a party of {this.state.room.match.participants.size}
                </div> : undefined}
                {this.renderTeam(0, this.state.room.spectators)}
                {this.state.room.teams.map((team, index) => {
                    return this.renderTeam(index + 1, team.members, team.ready)
                })}
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
                    onClick={() => this.context.requireRoom().send("setTeam", id)}>
                    Join
                </button>
            </h2>
            <div className={styles.players}>
                {this.renderPlayers(players)}
            </div>
        </div>
    }

    canJoinTeam(team: number) {
        const sessionId = this.context.requireRoom().sessionId
        this.context.requireRoom()
        if (!sessionId)
            return false
        const currentTeam = this.currentClient?.team
        return typeof currentTeam !== 'undefined' && currentTeam !== team
    }

    renderPlayers(players: string[]) {
        return players.map(id => {
            const data = this.context.requireRoom().state.clients.get(id)
            if (data)
                return <div key={id}
                            className={`${styles.player}${data.ready ? (' ' + styles.playerReady) : ''}`}>
                    <div title={id}>
                        {data.username.startsWith('Anonymous') ? ('Anon' + data.username.substr(9)) : data.username}
                    </div>
                </div>
        })
    }

    private setMap(id: string) {
        this.context.requireRoom().send('setMap', id)
        this.setState({
            selectedMap: (this.state.maps.list || []).find(m => m.id == id)
        })
    }
}