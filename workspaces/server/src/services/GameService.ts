import {Service} from "typedi";
import {Match} from "../models/Match";
import {NotFoundError} from "routing-controllers";
import {generateRoomId, Room, RoomModel} from "../models/Room";
import {MatchHistoryModel} from "../models/MatchHistory";
import {RoundHistory} from "@hexx/common";

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

    async createMatchHistory(match: string | Match) {
        if (match instanceof Match)
            match = match._id
        return await MatchHistoryModel.create({
            matchID: match,
            rounds: []
        })
    }

    async addRoundData(matchID: string, round: RoundHistory) {
        MatchHistoryModel.update({matchID}, {
            $push: {
                rounds: round
            }
        })
    }

}