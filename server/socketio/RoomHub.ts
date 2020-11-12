import Dict = NodeJS.Dict;
import EventEmitter = NodeJS.EventEmitter;
import {Room, RoomModel} from "../models/Room";
import {Server} from "socket.io";

export default class RoomHub extends EventEmitter {
    private static roomHubs: Dict<RoomHub> = {}

    static getOrNull(roomId: string): RoomHub | null {
        return this.roomHubs[roomId]
    }

    // TODO Change built-in Error to something else
    static async getOrCreate(server: Server, roomId: string) {
        if (roomId in this.roomHubs)
            throw new Error('RoomHub ' + roomId + ' already exists')
        const room = await RoomModel.findById(roomId).exec()
        if (room) {
            this.roomHubs[roomId] = new RoomHub(room, server)
        } else {
            throw new Error('this room does not exists')
        }
    }

    private readonly serverRoom: Server
    private readonly room: Room

    private constructor(room: Room, server: Server) {
        super()
        this.room = room
        this.serverRoom = server.to('Vroom' + room)
        this.init()
    }

    private init() {
        this.shutdownIfEmpty()
    }

    private addRoomListeners() {

    }

    private removeRoomListeners() {

    }

    private shutdownIfEmpty() {
        setTimeout(() => {
            if (this.room.players.length === 0) {
                this.shutdown()
            }
        }, 10000)
    }

    private shutdown() {
        this.emit('shutdown')
    }
}