import {getModelForClass, prop} from "@typegoose/typegoose";
import {IDBase} from "./Base";
import {GameMatchInfoDto, MatchStats, MoveDirection, Participant} from "@hexx/common";
import {GameMapModel} from "./GameMap";
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

export class Match extends IDBase {
    @prop({required: true})
    mapId: string;

    @prop()
    settings?: MatchSettings

    @prop()
    participants: Participant[]

    @prop({default: () => new Date()})
    createdAt?: Date

    @prop()
    startsAt: Date

    @prop()
    teamsRotation: number[]

    @prop()
    jobId?: string | number

    @prop()
    roomId: string

    getSocketIORoomName() {
        return 'Match' + this._id
    }

    getTeam(userID: string) {
        const p = this.participants.find(p => p.id == userID)
        return p ? p.team : 0
    }

    private getNeighbourCellsIndexes(x: number, y: number): [number, number][] {
        return (x % 2 == 0 ? Match.EVEN_X_INDEX_OFFSETS : Match.ODD_X_INDEX_OFFSETS).map((v, index) => {
            return [
                v[0] + x,
                v[1] + y
            ]
        })
    }

    private static EVEN_X_INDEX_OFFSETS = [
        [0, -1], // top
        [0, 1], // bottom
        [1, 0], // top right
        [-1, 0], // top left
        [1, 1], // bottom right
        [-1, 1], // bottom left
    ]

    private static ODD_X_INDEX_OFFSETS = [
        [0, -1], // top
        [0, 1], // bottom
        [1, -1], // top right
        [-1, -1], // top left
        [1, 0], // bottom right
        [-1, 0], // bottom left
    ]

    public static async createMatch(roomId: string, mapId: string, teams: string[][]): Promise<Match> {
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
            startsAt: moment().add(10, 'seconds').toDate(),
            teamsRotation
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
