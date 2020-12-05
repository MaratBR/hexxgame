import {AxiosInstance, default as axios} from "axios"
import {GameMapInfoDto, RoomInfoDto, GameRoomState, MatchState, UserInfoDto} from "@hexx/common";
import * as Colyseus from "colyseus.js"
import {Observable, Subject} from "rxjs";
import {Room} from "colyseus.js";
import Scope from "./scope";
import {MatchMakeError} from "colyseus.js/lib/Client";

interface IAPIOptions {
    address: string
}

export type IGameRoomConnectionState = {
    connected: boolean
}

export default class AppAPI {
    private readonly client: AxiosInstance
    private readonly wsClient: Colyseus.Client
    private _currentRoom?: Room<GameRoomState>
    private readonly _roomSubject = new Subject<Colyseus.Room<GameRoomState>>()
    private readonly _matchState = new Subject<MatchState>()
    private readonly _roomConnection = new Subject<IGameRoomConnectionState>()
    private readonly _lastError = new Subject()
    private readonly scope = new Scope()
    private userInfo?: UserInfoDto

    get roomSubject(): Observable<Colyseus.Room<GameRoomState>> {
        return this._roomSubject
    }

    get matchState(): Observable<MatchState> {
        return this._matchState
    }

    get lastError(): Observable<any> {
        return this._lastError
    }

    get roomConnection(): Observable<IGameRoomConnectionState> {
        return this._roomConnection
    }

    constructor(opts: IAPIOptions) {
        this.client = axios.create({
            baseURL: 'http://' + opts.address,
            withCredentials: true
        })
        this.wsClient = new Colyseus.Client('ws://' + opts.address)
        ;(window as any).ws = this.wsClient
    }

    private _onRoomChanged(oldRoom?: Room<GameRoomState>, room?: Room<GameRoomState>) {
        if (oldRoom) {
            this.scope.reset()
        }

        if (room) {
            this.scope.add(
                room.state.listen('match', (_, newState) => this._onMatchStateChanged(newState))
            )
            this._onMatchStateChanged()
        }

        this._matchState.next(room?.state.match)
    }

    private _onMatchStateChanged(newState?: MatchState) {
        this._matchState.next(newState)
    }

    onMatchStateChanged(listener: (state?: MatchState) => void) {
        listener(this._currentRoom?.state.match)
        return this.matchState.subscribe(listener)
    }

    onRoomChanged(listener: (room?: Room<GameRoomState>) => void) {
        listener(this._currentRoom)
        return this.roomSubject.subscribe(listener)
    }

    onRoomStateChanged(listener: (state?: GameRoomState) => void) {
        return this.onRoomChanged(room => listener(room?.state))
    }

    //#region REST

    async pingApi(): Promise<boolean> {
        try {
            await this.client.get('api/hi')
            return true
        } catch (e) {
            return false
        }
    }

    authenticateAnon(): Promise<void> {
        return this.client.post('api/auth/login/anon')
    }

    getPersonalRoom(): Promise<RoomInfoDto> {
        return this.client.get('api/rooms/personalRoom').then(r => r.data)
    }

    getGameToken(): Promise<string> {
        return this.client.get('api/auth/getGameToken').then(r => r.data.token)
    }

    getMaps(): Promise<GameMapInfoDto[]> {
        return this.client.get('api/maps').then(r => r.data)
    }

    async isAuthorized(): Promise<boolean> {
        try {
            await this.client.get('api/auth/checkLogin')
            return true
        } catch (e) {
            return false
        }
    }

    getUserInfo(): Promise<UserInfoDto> {
        return this.client.get('api/auth/currentUser').then(r => r.data)
    }

    //#endregion

    //#region WS game API

    async joinRoom(id: string): Promise<Colyseus.Room<GameRoomState>> {
        console.log('joining room ' + id)
        const oldRoom = this.room
        if(oldRoom) {
            oldRoom.leave(true)
        }
        const opts = {accessToken: await this.getGameToken(), id}
        let lobby: Colyseus.Room<GameRoomState>


        try {
            lobby = await this.wsClient.joinById(id, opts)
        } catch (e) {
            if (!(e instanceof MatchMakeError)) {
                this._lastError.next(e)
                this._roomConnection.next({connected: false})
                this.setRoom()
                throw e
            } else {
                console.log('failed to join room, creating new room')
                lobby = await this.wsClient.create('gameLobby', opts)
            }
        }

        return await new Promise((resolve, reject) => {
            let completed = false
            const onInitialized = () => {
                // if room initialized before timeout, just ignore it
                if (!completed) {
                    completed = true;
                    this._currentRoom = lobby
                    this._roomSubject.next(this._currentRoom)
                    this._roomConnection.next({connected: true})
                    this._onRoomChanged(oldRoom, this._currentRoom)
                    resolve(this._currentRoom)
                }
            }
            lobby.onMessage('initialized', onInitialized)
            lobby.onStateChange(onInitialized)
            this._roomConnection.next({connected: false})
            setTimeout(() => {
                if (!completed) {
                    completed = true
                    lobby.leave(false)
                    this._roomSubject.next()
                    this._lastError.next('room connection timed out')
                    reject('timed out')
                }
            }, 30000)

        })
    }

    private setRoom(room?: Colyseus.Room<GameRoomState>) {
        this._currentRoom = room
        this._roomSubject.next(room)
    }

    //#endregion

    get room() {
        return this._currentRoom
    }

    requireRoom() {
        if (this._currentRoom)
            return this._currentRoom
        throw new Error('No room found')
    }
}