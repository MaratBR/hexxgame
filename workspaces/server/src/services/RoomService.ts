import {Service} from "typedi";
import {User} from "../models/User";
import {generateRoomId, Room, RoomModel} from "../models/Room";
import UsersService from "./UsersService";

interface NewRoomOptions {
    isPublic?: boolean
    ownerId?: string
    name: string,
    code?: string
}

@Service()
export default class RoomService {
    constructor(private usersService: UsersService) {
    }

    getRoom(id: string): Promise<Room> {
        return RoomModel.findById(id).exec()
    }

    exists(id: string): Promise<boolean> {
        return RoomModel.count({_id: id}).then(r => r != 0)
    }

    async createRoom(opts: NewRoomOptions): Promise<Room> {
        return await RoomModel.create({
            players: [],
            ownerId: opts.ownerId,
            _id: opts.code || await this.generateRoomId()
        })
    }

    async getPersonalRoom(userOrId: User | string): Promise<Room> {
        const user = typeof userOrId === 'string' ? await this.usersService.getUser(userOrId) : userOrId
        if (user.personalRoomId) {
            return await this.getRoom(user.personalRoomId)
        } else {
            const room = await this.createRoom({
                ownerId: user._id as string,
                name: `Personal room of ${user.username}`
            })
            await this.usersService.updateUser(user._id, {
                personalRoomId: room._id,
            })
            return room
        }
    }

    async generateRoomId(): Promise<string> {
        let roomId;
        do {
            roomId = generateRoomId()
        } while (await RoomModel.count({_id: roomId}) != 0);
        return roomId;
    }
}