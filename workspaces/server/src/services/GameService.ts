import {Service} from "typedi";
import {Match} from "../models/Match";
import {NotFoundError} from "routing-controllers";
import {MatchHistoryModel} from "../models/MatchHistory";
import {MatchState, MovesStats, RoundHistory} from "@hexx/common";
import {UserModel} from "../models/User";
import {matchMaker} from "colyseus";
import {customAlphabet} from "nanoid";

@Service()
export default class GameService {
    constructor() {}

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

    async submitMatchPlayersStats(id: string, matchState: MatchState, playersMoves: NodeJS.Dict<MovesStats>) {
        const bulk = UserModel.collection.initializeUnorderedBulkOp()

        for (let [id, p] of matchState.participants.entries()) {
            const upd: any = {
                'stats.matchesParticipated': 1
            }
            if (p.team === matchState.winner)
                upd['stats.matchesWon'] = 1

            const moves = playersMoves[id]
            if (moves) {
                upd['stats.moves.total'] = moves.total
                upd['stats.moves.suicide'] = moves.suicide
                upd['stats.moves.tie'] = moves.tie
                upd['stats.moves.capture'] = moves.capture
                upd['stats.moves.absorb'] = moves.absorb
            }

            bulk.find({_id: id}).update({$inc: upd})
        }
        await bulk.execute()
    }

    async roomExists(id: string): Promise<boolean> {
        return (await matchMaker.query({roomId: id})).length != 0
    }

    private static generateRoomId = customAlphabet('ABCDEFGHIJKLMOPQRSTUVWXYZ0123456789', 4)

    async generateRoomId(): Promise<string> {
        let roomId;
        do {
            roomId = GameService.generateRoomId()
        } while (await this.roomExists(roomId));
        return roomId;
    }
}