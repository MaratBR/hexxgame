import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import styles from "./RoomPage.module.scss"
import {
    getTeamColor,
    getTeamName,
    GameMapInfoDto,
    GameRoomState,
    UserInfoDto, ClientInfo, TeamInfo
} from "@hexx/common";
import Brand from "../../components/Brand";
import {match, NavLink} from "react-router-dom"
import Scope from "../../game/scope";
import Loading from "../../components/Loading";
import {Redirect} from "react-router-dom"
import {makeRoute, ROOM_MATCH_ROUTE} from "../../routes";

type RoomState = {
    maps: {
        loading: boolean,
        list?:  GameMapInfoDto[]
    }
    expandedMap?: string,
    loaded?: boolean
    room?: GameRoomState
    userInfo?: UserInfoDto
    redirectToMatch: boolean
    selectedMap?: GameMapInfoDto
    selectedMapID?: string
    spectators: string[]
    teams: {
        ready: boolean
        members: string[]
    }[]
    ready: boolean,
    clients: {
        [key: string]: {
            username: string
            ready: boolean
            team: number
        }
    }
    roomID?: string
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
        },
        redirectToMatch: false,
        spectators: [],
        teams: [],
        ready: false,
        clients: {}
    }
    private roomState?: GameRoomState

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
        const newRoomScope = this.scope.getChild()
        this.scope.addSubscription(
            this.context.onRoomStateChanged(this.onRoomStateChanged.bind(this)),
            this.context.onRoomChanged(room => {
                newRoomScope.reset()
                if (room) {
                    newRoomScope.add(room.onMessage('gameStarts', () => this.setState({redirectToMatch: true})))
                    this.setState({
                        roomID: room.id
                    })
                }
            })
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

    private updateSelectedMap() {
        this.setState({
            selectedMap: (this.state.maps.list || []).find(m => m.id == this.state.selectedMapID)
        })
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
            }, () => {
                console.log('wdesfrgthyghfesrndfgdmn,,sdfm.n,d,m,', this.state.selectedMapID)
                this.updateSelectedMap()
            })
        } catch (e) {
            this.setState({
                maps: {
                    loading: false
                }
            })
        }
    }

    private updateTeams() {
        if (!this.roomState)
            return
        const teams = this.roomState.teams.map(t => ({ready: t.ready, members: [...t.members]}))
        this.setState({
            teams,
            ready: !!this.state.userInfo && this.state.clients[this.state.userInfo?.id].ready
        })
    }

    private onTeamAdded(team: TeamInfo, index: number): () => void {
        team.members.onAdd = this.updateTeams.bind(this)
        team.members.onRemove = this.updateTeams.bind(this)

        const cancel = team.listen('ready', () => this.updateTeams())
        return () => {
            team.members.onAdd = undefined
            team.members.onRemove = undefined
            cancel()
        }
    }

    private onRoomStateChanged(state?: GameRoomState) {
        this.roomScope.reset()
        if (!state) {
            // TODO
            return
        }


        this.roomState = state

        // update spectators list
        const updateSpectators = () => {
            const spectators = [...state.spectators]
            this.setState({spectators})
        }
        state.spectators.onAdd = updateSpectators
        state.spectators.onRemove = updateSpectators
        updateSpectators()

        // clients
        const onAddClient = (client: ClientInfo, key: string) => {
            const clients = this.state.clients
            clients[key] = client
            this.setState({clients})
        }
        state.clients.onAdd = onAddClient
        state.clients.onRemove = (_, key) => {
            const clients = this.state.clients
            delete clients[key]
            this.setState({clients})
        }
        state.clients.forEach(onAddClient)

        // make sure that teams' list updates including
        // members' list for each team
        const teamCancel: {[key: string]: () => void} = {}
        state.teams.onAdd = (team, teamIndex) => {
            this.updateTeams()
            teamCancel[teamIndex] = this.onTeamAdded(team, teamIndex)
        }
        state.teams.onRemove = (team, teamIndex) => {
            this.updateTeams()
            const cancel = teamCancel[teamIndex]
            if (cancel) cancel()
            delete teamCancel[teamIndex]
        }
        state.teams.forEach((team, index) => teamCancel[index] = this.onTeamAdded(team, index))
        this.updateTeams()

        const onSelectedMapIdSet = (id: string) => this.setState({
            selectedMapID: id
        }, () => {
            this.updateSelectedMap()
        })

        if (state.selectedMapID)
            onSelectedMapIdSet(state.selectedMapID)
        this.roomScope.add(
            state.listen('selectedMapID', v => v ? onSelectedMapIdSet(v) : undefined),
            () => {
                state.spectators.onAdd = undefined
                state.spectators.onRemove = undefined
                state.clients.onAdd = undefined
                state.clients.onRemove = undefined
                state.teams.onAdd = undefined
                state.teams.onRemove = undefined
            }
        )

        if (!this.state.loaded) {
            this.setState({loaded: true});
        }
    }

    render() {
        if (!this.state.loaded)
            return <Loading />

        if (this.state.redirectToMatch)
            return <Redirect to={makeRoute(ROOM_MATCH_ROUTE, {id: this.context.requireRoom().id})} />

        return <div className={styles.root}>
            <div className={styles.toolBar}>
                <NavLink to="/" onClick={() => this.context.leaveRoom()} className={styles.backButton}>
                    <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                    </svg>
                </NavLink>
                <button
                    onClick={() => this.context.requireRoom().send('toggleReady')}
                    className={this.state.ready? styles.ready : styles.notReady}>
                    {this.state.ready ? 'Ready' : 'Not ready'}
                </button>
                <div className={styles.toolBarSection}>
                    <h3>Selected map</h3>
                    {this.state.selectedMap?.name || 'unknown'}
                </div>
                <div className={styles.toolBarSection}>
                    <h1>{this.state.roomID}</h1>
                </div>
            </div>

            <div className={styles.play}>
                <span>Ready to play? <br/> Press that button right there, pal!</span>

                <button onClick={() => this.context.requireRoom().send('start')}>
                    <Brand text="Play" style={{fontSize: '1.5em'}} />
                </button>
            </div>

            <div className={styles.teams}>
                {this.renderNotification()}
                {this.renderTeam(0, this.state.spectators)}
                {this.state.teams.map((team, index) => {
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

    renderNotification() {
        if (!this.state.room)
            return null
        if (this.state.room.match.id) {
            const match = this.state.room.match
            if (match.winner)
                return <div>
                    This room had an match with a party of {match.participants.size},&nbsp;
                    <b style={{color: getTeamColor(match.winner)}}>{getTeamName(match.winner)}</b> team won!
                </div>
            return <div>
                This room has an ongoing match with a party of {this.state.room.match.participants.size}
            </div>
        }
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
            const data = this.state.clients[id]
            if (data)
                return <div key={id}
                            className={`${styles.player}${data.ready ? (' ' + styles.playerReady) : ''}`}>
                    <div title={id}>
                        {data.username.startsWith('Anonymous') ? ('Anon' + data.username.substr(9)) : data.username}
                    </div>
                </div>
            else
                return <div>{id}</div>
        })
    }

    private setMap(id: string) {
        this.context.requireRoom().send('setMap', id)
    }
}