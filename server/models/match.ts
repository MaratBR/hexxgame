import {getModelForClass, prop} from "@typegoose/typegoose";
import {IDBase} from "./base";

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

export interface Participant {
    id: string
    online: boolean
    team: number
}

export interface MatchState {
    powerPoints?: number
    round: number
    roundStage: number
    team: number
    cells: MapCellState[]
}

export interface MapCellState {
    v: number,
    x: number,
    y: number,
    mxv?: number,
    t?: number
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
    state: MatchState

    @prop()
    teamsRotation: number[]

    @prop()
    jobId?: string | number
}

export const MatchModel = getModelForClass(Match)

export type GameMatchInfoDto = {
    id: string
    mapId: string
    players: Participant[]
}

export function matchInfo(m: Match): GameMatchInfoDto {
    return {
        id: m._id,
        players: m.participants,
        mapId: m.mapId
    }
}
