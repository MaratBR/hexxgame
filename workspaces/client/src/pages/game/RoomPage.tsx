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
    MatchState
} from "@hexx/common";
import Brand from "../../components/Brand";
import { match } from "react-router-dom"
import Scope from "../../game/scope";


type RoomState = {
    maps?: {
        loading?: boolean,
        list?:  GameMapInfoDto[]
    }
    expandedMap?: string,
    selectedMap?: GameMapInfoDto
    loaded?: boolean
    teams: TeamInfo[]
    spectators: string[]
    match: MatchState
}

type Props = {
    match: match<{id: string}>
}

export default class RoomPage extends React.Component<Props, RoomState> {
    static contextType = ApiContext;
    context!: AppAPI
    state: RoomState = {
        teams: [],
        spectators: [],
        match: new MatchState()
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
            this.onMapChanged()
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


        const updateTeams = () => {
            const teams = [...state.teams]
            this.setState({teams})
        }

        console.log('new room state', state)

        state.teams.onRemove = state.teams.onAdd = updateTeams

        const updateSpectators = () => {
            const spectators = [...state.spectators]
            this.setState({spectators})
        }

        state.spectators.onAdd = state.spectators.onRemove = updateSpectators

        updateSpectators()
        updateTeams()

        this.scope.add(
            () => {
                state.teams.onAdd = undefined
                state.teams.onRemove = undefined
                state.spectators.onAdd = undefined
                state.spectators.onRemove = undefined
            },
            state.listen('match', match => this.setState({match}))
        )
        this.setState({match: state.match})

        const mapChanged = this.context.requireRoom().state.selectedMapID !== state.selectedMapID
        if (!this.state.loaded) {
            this.setState({loaded: true});
        }

        if (mapChanged) {
            this.onMapChanged()
        }
    }

    render() {
        return <div className={styles.root}>
            <div className={styles.toolBar}>
                <button
                    onClick={() => this.context.requireRoom().send('toggleReady')}
                    className={this.currentClient?.ready ? styles.ready : styles.notReady}>
                    {this.currentClient?.ready ? 'Ready' : 'Not ready'}
                </button>
                <div className={styles.toolBarSection}>
                    <h3>Selected map</h3>
                    {this.state.selectedMap?.name}
                </div>
            </div>

            <div className={styles.play} onClick={() => this.context.requireRoom().send('start')}>
                <button>
                    <Brand text="Play" style={{fontSize: '1.5em'}} />
                </button>
            </div>

            <div className={styles.playersList}>
                <pre>{JSON.stringify(this.state.match?.id)}</pre>
                {this.state.match.id ? <div>
                    This room has an ongoing match with a party of {2}
                </div> : undefined}
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
    }

    private onMapChanged() {
        this.setState({
            selectedMap: this.state.maps?.list?.find(m => m.id == this.context.requireRoom().state.selectedMapID)
        })
    }
}