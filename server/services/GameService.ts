import {Container, Service} from "typedi";
import {
    BASE_LEN, EXPAND_LEN,
    MapCellState,
    Match,
    MatchModel,
    MAX_MINUTES,
    MAX_ROUNDS,
    Participant
} from "../models/Match";
import {GameMapModel} from "../models/GameMap";
import {HttpError} from "routing-controllers";
import {UserModel} from "../models/User";
import {matchesQueue} from "../init/jobs";
import moment from "moment";
import {MatchExecutor} from "../socketio/MatchExecutor";
import executorHub from "../socketio/executor";

@Service()
export default class GameService {
    constructor() {}

    async createMatch(roomId: string, mapId: string, teams: string[][]): Promise<Match> {
        if (teams.length < 2)
            throw new HttpError(422, 'need at least 2 teams')

        const map = await GameMapModel.findById(mapId)
        if (!map)
            throw new HttpError(404, "map not found")

        const players: string[] = [].concat.apply([], teams)
        if (new Set(players).size !== players.length)
            throw new HttpError(422, "some teams share a player which is not allowed")

        if (await UserModel.count({_id: {$in: players}}) == 0)
            throw new HttpError(404, "not all players exists")

        const participants: Participant[] = players.map(p => {
            return {
                id: p,
                online: false,
                team: teams.findIndex(team => team.includes(p)) + 1
            }
        })

        const teamsRotation: number[] = Array.from(new Array(teams.length).keys()).map(t => t + 1)

        for(let i = teamsRotation.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * i)
            const temp = teamsRotation[i]
            teamsRotation[i] = teamsRotation[j]
            teamsRotation[j] = temp
        }

        return await MatchModel.create({
            mapId,
            participants,
            roomId,
            state: {
                cells: map.cells.map(mapCell => ({
                    v: mapCell.initValue || 0,
                    t: mapCell.initTeam,
                    mxv: mapCell.max,
                    x: mapCell.x,
                    y: mapCell.y
                })),
                round: 0,
                roundStage: 0,
                team: 0
            },
            startsAt: moment().add(10, 'seconds').toDate(),
            teamsRotation
        })
    }

    async startMatchExecutor(match: string | Match) {
        match = typeof match === 'string' ? await MatchModel.findById(match) : match
        if (!match || match.jobId)
            return
        await matchesQueue.add({matchId: match._id})
    }

    getLocalExecutorOrNull(matchId: string): MatchExecutor | null {
        return executorHub.getLocalExecutorOrNull(matchId)
    }

}