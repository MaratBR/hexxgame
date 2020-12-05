import React from "react";
import ApiContext from "../../game/context";
import AppAPI, {IGameRoomConnectionState} from "../../game/AppAPI";
import {Subscription} from "rxjs";
import {Room} from "colyseus.js";
import {GameRoomState, MatchState} from "@hexx/common";
import Loading from "../../components/Loading";
import Brand from "../../components/Brand";
import {Redirect} from "react-router"
import Modal from "../../components/Modal";
import GameMap from "./GameMap";
import RoomPage from "./RoomPage";
import UIContext from "../UIContext";
import MatchResults from "./MatchResults";
import {Switch, Route} from "react-router-dom";

/**
 * Possible states:
 * 1) Connecting to server to check login
 * 2) User is not logged in -> redirect
 * 3) User logged in
 *      2.1) Connecting to room
 *      2.2) Room does not exist -> show error
 *      2.3) Room exist
 *          2.3.1) Disconnected -> show reconnection message
 *          2.3.2) Room is in-game -> show game
 *          2.3.3) Room is in lobby mode -> show lobby
 */

type State = {
    loading: boolean
    loggedIn: boolean
    reconnecting: boolean
    inGame: boolean
    showWinner: boolean
    err?: any
    room?: Room<GameRoomState>
    match?: MatchState
}

type Params = {
    match: {
        params: {
            id: string
        }
        path: string
    }
}

export class GameCoordinatorPage extends React.Component<Params, State> {
    static contextType = ApiContext
    context!: AppAPI
    private subs: Subscription[] = []
    private readonly onRoomStateChangedListener: (cs: GameRoomState) => void
    state: State = {
        loggedIn: true,
        loading: true,
        reconnecting: false,
        inGame: false,
        showWinner: false
    }

    constructor(props: Params) {
        super(props);

        this.onRoomStateChangedListener = this.onRoomStateChanged.bind(this)
    }

    async componentDidMount() {
        if (!await this.context.isAuthorized()) {
            this.setState({
                loggedIn: false
            })
            return
        }

        if (this.props.match.params.id !== this.context.room?.id)
            await this.context.joinRoom(this.props.match.params.id)

        this.subs.push(
            this.context.roomConnection.subscribe(this.onRoomConnectionStateChanged.bind(this)),
            this.context.onRoomChanged(this.onLobbyChanged.bind(this))
        )
    }

    componentWillUnmount() {
        this.subs.forEach(s => s.unsubscribe())
    }

    render() {
        if (!this.state.loggedIn)
            return <Redirect to="/" />

        if (this.state.err)
            return <Modal>
                <Brand text="Oops" />
                <pre>{this.state.err}</pre>
            </Modal>

        if (this.state.reconnecting)
            return <Modal>
                <Brand text="Reconnecting..." />
            </Modal>

        if (this.state.loading)
            return <Loading />

        return <div>
            <Switch>
                <Route path={this.props.match.path} exact={true} component={RoomPage} />
                <Route path={this.props.match.path + '/match'} exact={true} component={GameMap} />
                <Route path={this.props.match.path + '/match/results'} exact={true} component={MatchResults} />
            </Switch>
        </div>
    }

    private onRoomConnectionStateChanged(state: IGameRoomConnectionState) {
        if (state.connected && this.state.reconnecting) {
            this.setState({
                reconnecting: false
            })
        } else if (!state.connected && !this.state.reconnecting) {
            this.setState({
                reconnecting: true
            })
        }
    }

    private async onRoomStateChanged(cs: GameRoomState) {
        console.log(cs.match)

        if (cs.match?.id) {
            const inGame = !!cs.match.id
            if (this.state.inGame != inGame) {
                UIContext.fullscreen.next(inGame)
                this.setState({
                    inGame
                })
            }
            const {id} = await this.context.getUserInfo()
            const showWinner = !!cs.match.winner && Array.from(cs.match.participants.keys()).includes(id)
            if (this.state.showWinner !== showWinner)
                this.setState({showWinner})

            if (!this.state.match || cs.match.id !== this.state.match.id)
                this.setState({match: cs.match})
        } else {
            this.setState({
                match: undefined,
                showWinner: false,
                inGame: false
            })
        }
    }

    private onLobbyChanged(lobby?: Room<GameRoomState>) {

        if (this.state.room) {
            this.state.room.onStateChange.remove(this.onRoomStateChangedListener)
        }

        this.setState({
            room: lobby
        })

        if (lobby) {
            lobby.onStateChange(this.onRoomStateChangedListener)
            this.setState({
                err: undefined,
                loading: false,
                reconnecting: false
            })
            this.onRoomStateChanged(lobby.state)
        } else {
            this.setState({
                err: 'Game not found'
            })
        }
    }
}