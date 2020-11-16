import {AxiosInstance, default as axios} from "axios"
import {GameMapInfoDto, RoomInfoDto} from "lib_shared/dto";
import * as Colyseus from "colyseus.js"
import {EventEmitter} from "events";
import {ILobbyState} from "lib_shared/colyseus";

interface IAPIOptions {
    address: string
}

export default class AppAPI extends EventEmitter {
    private readonly client: AxiosInstance
    private readonly wsClient: Colyseus.Client
    private _lobby?: Colyseus.Room<ILobbyState>

    constructor(opts: IAPIOptions) {
        super()
        this.client = axios.create({
            baseURL: 'http://' + opts.address,
            withCredentials: true
        })
        this.wsClient = new Colyseus.Client('ws://' + opts.address)
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

    async joinRoom(id: string) {
        if(this.lobby) {
            this.lobby.leave(true)
            this.emit('leftLobby', {id: this.lobby.state.id})
        }
        this._lobby = await this.wsClient
            .joinOrCreate('gameLobby', {accessToken: await this.getGameToken(), id})
        return new Promise((resolve, reject) => {
            let completed = false
            const onInitialized = () => {
                if (!completed) {
                    completed = true;
                    this.emit('joinedLobby', {id})
                    resolve()
                }
            }
            this._lobby!.onMessage('initialized', onInitialized)
            this._lobby!.onStateChange(onInitialized)
            setTimeout(() => {
                if (!completed) {
                    completed = true
                    this._lobby!.leave(false)
                    reject('timed out')
                }
            }, 2000)

        })
    }

    get lobby() {
        return this._lobby
    }

    get lobbyID() {
        return this._lobby?.state.id || null
    }
}