import {Service} from "typedi";
import {
    Match,
    MatchModel, MAX_VALUE
} from "../models/Match";
import {GameMapModel} from "../models/GameMap";
import {HttpError} from "routing-controllers";
import {UserModel} from "../models/User";
import moment from "moment";
import {GameMapCell, Participant} from "@hexx/common";

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

        return await MatchModel.create(<Match>{
            mapId,
            participants,
            roomId,
            cells: map.cells.map(mapCell => (<GameMapCell>{
                initValue: mapCell.initValue || 0,
                initTeam: mapCell.initTeam || 0,
                max: mapCell.max || MAX_VALUE,
                x: mapCell.x,
                y: mapCell.y
            })),
            startsAt: moment().add(10, 'seconds').toDate(),
            teamsRotation
        })
    }

}