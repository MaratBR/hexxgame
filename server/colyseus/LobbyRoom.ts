import AuthorizedRoom from "./AuthorizedRoom";
import http from "http"
import {Client, ServerError} from "colyseus";
import {User} from "../models/User";
import {Room, RoomModel} from "../models/Room";
import {ClientInfo, LobbyState} from "lib_shared/colyseus";
import {getData} from "../socketio/sharedSession";

export default class LobbyRoom extends AuthorizedRoom<LobbyState> {
    private async getRoom(): Promise<Room> {
        return RoomModel.findById(this.state.id);
    }

    async onCreate(options: any): Promise<any> {
        const roomID = options.id
        if (typeof roomID !== 'string')
            throw new ServerError(400, 'invalid room options, no room id provided')

        const room = await RoomModel.findById(roomID)
        if (!room)
            throw new ServerError(404, 'no room with id ' + roomID)
        this.setState(new LobbyState({
            id: roomID
        }))

        this.onMessage<number>("setTeam", (client, team) => {
            if (typeof team === 'number') {
                if (team < 0 || team >= this.state.teamsNum)
                    return
                this.state.clients[client.id].team = team
            }
        })

        this.onMessage('toggleReady', client => {
            this.state.clients[client.id].ready = !this.state.clients[client.id].ready
        })

        this.broadcast('initialized')
    }

    async onAuth(client: Client, options: any, request?: http.IncomingMessage): Promise<User> {
        const user = await super.onAuth(client, options, request);

        if (user.getRoomID() && user.getRoomID() !== this.state.id) {
            throw new ServerError(409, 'already in a different room')
        }

        if (!user.getRoomID()) {
            await user.setRoom(await this.getRoom())
        }

        return user
    }

    onJoin(client: Client, options?: any, auth?: User): void | Promise<any> {
        this.state.clients[client.id] = new ClientInfo({
            dbID: auth._id,
            username: auth.username
        })
        this.state.spectators.push(client.id)
    }

    onLeave(client: Client, consented?: boolean): void | Promise<any> {
        const data = this.state.clients[client.id]
        if (data.team == 0) {
            this.state.spectators.splice(this.state.spectators.indexOf(client.id))
        } else {
            const members = this.state.teams[data.team - 1].members
            members.splice(members.indexOf(client.id))
        }

        delete this.state.clients[client.id]

        return super.onLeave(client, consented);
    }
}