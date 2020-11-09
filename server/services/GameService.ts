import {Container, Service} from "typedi";
import {
    BASE_LEN, EXPAND_LEN,
    MapCellState,
    Match,
    MatchModel,
    MAX_MINUTES,
    MAX_ROUNDS,
    Participant
} from "../models/match";
import {GameMapModel} from "../models/map";
import {HttpError} from "routing-controllers";
import {UserModel} from "../models/user";
import {matchesQueue} from "../init/jobs";
import moment from "moment";
import {MatchExecutor} from "../socketio/MatchExecutor";
import Bull from "bull";

namespace GameServiceStatic {
    import Dict = NodeJS.Dict;
    export let initialized = false
    export const ongoingMatches: Dict<MatchExecutor> = {}

    export function init() {
        initialized = true
        matchesQueue.process(async (job, done: Bull.DoneCallback) => {
            if (ongoingMatches[job.data.matchId]) {
                done(new Error("match already in progress"))
                return
            }
            if (await MatchModel.count({_id: job.data.matchId, jobId: {$exists: false}}) == 0) {
                done(new Error("match not found or was already assigned to other job"))
                return
            }

            const room = sioApp.to('match ' + job.data.matchId)
            const executor = new MatchExecutor(room)
            ongoingMatches[job.data.matchId] = executor

            try {
                done(null, await executor.callback(job))
            } catch (e) {
                done(e)
            }
        })
    }

    if (!GameServiceStatic.initialized) {
        GameServiceStatic.init()
    }
}

@Service()
export default class GameService {
    constructor() {}

    async createMatch(mapId: string, teams: string[][]): Promise<Match> {
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

    async getMatchMapState(id: string): Promise<MapCellState[]> {
        return MatchModel.findById(id).then(m => m.state.cells)
    }

    getLocalExecutorOrNull(matchId: string): MatchExecutor | null {
        return GameServiceStatic.ongoingMatches[matchId] || null
    }
}