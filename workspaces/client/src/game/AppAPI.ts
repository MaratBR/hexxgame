import {AxiosInstance, default as axios} from "axios"
import {GameMapInfoDto, RoomInfoDto, GameRoomState} from "@hexx/common";
import * as Colyseus from "colyseus.js"
import {Observable, Subject} from "rxjs";

interface IAPIOptions {
    address: string
}

export type IGameRoomConnectionState = {
    connected: boolean
}

export default class AppAPI {
    private readonly client: AxiosInstance
    private readonly wsClient: Colyseus.Client
    private _room?: Colyseus.Room<GameRoomState>
    private _roomSubject = new Subject<Colyseus.Room<GameRoomState>>()
    private _roomConnection = new Subject<IGameRoomConnectionState>()

    get roomSubject(): Observable<Colyseus.Room<GameRoomState>> {
        return this._roomSubject
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

    //#endregion

    //#region WS game API

    async joinRoom(id: string): Promise<Colyseus.Room<GameRoomState>> {
        if(this.room) {
            this.room.leave(true)
        }
        const opts = {accessToken: await this.getGameToken(), id}
        let lobby: Colyseus.Room<GameRoomState>

        try {
            lobby = await this.wsClient.joinOrCreate('gameLobby', opts)
        } catch (e) {
            this._roomConnection.next({connected: false})
            this.setRoom()
            throw e
        }

        return await new Promise((resolve, reject) => {
            let completed = false
            const onInitialized = () => {
                if (!completed) {
                    completed = true;
                    console.log('connected to room ' + lobby.id)
                    this._room = lobby
                    this._roomSubject.next(this._room)
                    this._roomConnection.next({connected: true})
                    resolve(this._room)
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
                    reject('timed out')
                }
            }, 2000)

        })
    }

    private setRoom(room?: Colyseus.Room<GameRoomState>) {
        this._room = room
        this._roomSubject.next(room)
    }

    //#endregion

    get room() {
        return this._room
    }

    requireRoom() {
        if (this._room)
            return this._room
        throw new Error('No room found')
    }

    get lobbyID() {
        return this._room?.state.id || null
    }
}