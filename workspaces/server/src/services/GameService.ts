import {Service} from "typedi";
import {
    Match,
    MatchModel, MAX_VALUE
} from "../models/Match";
import {GameMapModel} from "../models/GameMap";
import {HttpError, NotFoundError} from "routing-controllers";
import {UserModel} from "../models/User";
import moment from "moment";
import {GameMapCell, Participant} from "@hexx/common";
import {generateRoomId, Room, RoomModel} from "../models/Room";

@Service()
export default class GameService {
    constructor() {}

    async createRoom(id?: string, ownerId?: string): Promise<Room> {
        return await RoomModel.create({
            ownerId,
            _id: id || generateRoomId(),
            players: []
        })
    }

    async getRoomByID(id: string): Promise<Room> {
        const room = await RoomModel.findById(id)
        if (!room)
            throw new NotFoundError('Room cannot be found')
        return room
    }

    async createMatch(roomId: string, mapId: string, teams: string[][]): Promise<Match> {
        return await Match.createMatch(roomId, mapId, teams)
    }

}