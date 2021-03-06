import {getModelForClass, prop} from "@typegoose/typegoose";
import {IDBase} from "./Base";
import {GameMatchInfoDto, Participant} from "@hexx/common";
import {GameMapCell, GameMapCellImpl, GameMapModel} from "./GameMap";
import {HttpError} from "routing-controllers";
import {UserModel} from "./User";
import moment from "moment";

export const START_TIMEOUT = 10000
export const BASE_LEN = 10000
export const EXPAND_LEN = 1500
export const DEPARTED_TIMEOUT = 60000
export const MAX_ROUNDS = -1
export const MAX_MINUTES = -1
export const MAX_VALUE = 12

export interface MatchSettings {
    baseLen?: number
    expandLen?: number
    departedTimeout?: number
    maxRounds?: number
    maxMinuted?: number
}

class ParticipantImpl implements Participant {
    @prop()
    id: string;

    @prop()
    online: boolean;

    @prop()
    team: number;
}

export class Match extends IDBase {
    @prop({required: true})
    mapId: string;

    @prop({ _id: false })
    settings?: MatchSettings

    @prop({ type: () => [ParticipantImpl], _id: false })
    participants: Participant[]

    @prop()
    winner?: number

    @prop({default: () => new Date()})
    createdAt?: Date

    @prop()
    startsAt: Date

    @prop({ type: () => [Number] })
    teamsRotation: number[]

    @prop({ type: () => [GameMapCellImpl], _id: false })
    cells: GameMapCell[]

    @prop()
    roomId: string

    public static async createMatch(roomId: string, mapId: string, teams: string[][]): Promise<Match> {
        if (teams.length < 2)
            throw new HttpError(422, 'need at least 2 teams')

        const map = await GameMapModel.findById(mapId).exec()
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
            startsAt: moment().add(10, 'seconds').toDate(),
            teamsRotation,
            cells: map.cells.map(c => {
                const cell: GameMapCell = {
                    initValue: c.initValue,
                    initTeam: c.initTeam,
                    x: c.x,
                    y: c.y,
                    max: c.max
                }
                if (cell.initTeam && !teamsRotation.includes(cell.initTeam)) {
                    cell.initTeam = 0
                    cell.initValue = 0
                }
                return cell
            })
        })
    }
}

export const MatchModel = getModelForClass(Match)

export function matchInfo(m: Match): GameMatchInfoDto {
    return {
        id: m._id,
        players: m.participants,
        mapId: m.mapId
    }
}
