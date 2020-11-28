import React from "react";
import ApiContext from "../../game/context";
import AppAPI, {IGameRoomConnectionState} from "../../game/AppAPI";
import {Subscription} from "rxjs";
import {Room} from "colyseus.js";
import {GameRoomState} from "@hexx/common";
import Loading from "../../components/Loading";
import Brand from "../../components/Brand";
import {Redirect} from "react-router"
import Modal from "../../components/Modal";
import GameMap from "./GameMap";
import RoomPage from "./RoomPage";
import UIContext from "../UIContext";

enum RootStatus {

}

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
    err?: any
    room?: Room<GameRoomState>
}

type Params = {
    match: {
        params: {
            id: string
        }
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
        inGame: false
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

        if (this.props.match.params.id !== this.context.room?.state.id)
            await this.context.joinRoom(this.props.match.params.id)

        this.subs.push(
            this.context.roomConnection.subscribe(this.onRoomConnectionStateChanged.bind(this)),
            this.context.roomSubject.subscribe(this.onLobbyChanged.bind(this))
        )

        if (this.context.room)
            this.onLobbyChanged(this.context.room)
    }

    componentWillUnmount() {
        this.subs.forEach(s => s.unsubscribe())
    }

    render() {
        if (!this.state.loggedIn)
            return <Redirect to="/" />

        if (this.state.err) {
            return <div>
                <Brand text="Oops" />
                <pre>{this.state.err}</pre>
            </div>
        }

        if (this.state.reconnecting) {
            return <Modal>
                <Brand text="Reconnecting..." />
            </Modal>
        }

        if (this.state.loading) {
            return <Loading />
        }

        if (this.state.room) {
            return this.state.inGame ? <GameMap room={this.state.room} /> : <RoomPage room={this.state.room} />
        }
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

    private onRoomStateChanged(cs: GameRoomState) {
        const inGame = !!cs.match?.id
        this.setState({
            inGame
        })
        UIContext.fullscreen.next(inGame)
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