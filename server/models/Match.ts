import {getModelForClass, prop} from "@typegoose/typegoose";
import {IDBase} from "./Base";
import {GameMatchInfoDto} from "lib_shared/dto";
import {User} from "./User";

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

    @prop()
    roomId: string

    getSocketIORoomName() {
        return 'Match' + this._id
    }

    getTeam(userID: string) {
        const p = this.participants.find(p => p.id == userID)
        return p ? p.team : 0
    }


    getCellTeam(index: number): number {
        if (index < 0 || index >= this.state.cells.length)
            return -1
        return this.state.cells[index].t
    }

    get isPowerStage() { return this.state.roundStage == 2 }
    get isMoveStage() { return this.state.roundStage == 1 }

    canPower(userID: string, cellIndex: number) {
        const userTeam = this.getTeam(userID)
        return userTeam > 0 && this.isPowerStage && this.getCellTeam(cellIndex) == userTeam
    }

    /**
     * Returns true if cell with given index exists and can be move by the player
     * Returns false if cell does not exists, does not belong to the player's team or cannot be moved
     * @param userID
     * @param cellIndex
     */
    canMove(userID: string, cellIndex: number) {
        return this.cellBelongsTo(userID, cellIndex) &&
    }

    cellBelongsTo(userID: string, cellIndex: number) {
        const userTeam = this.getTeam(userID)
        return userTeam > 0 && this.getCellTeam(cellIndex)
    }

    private static EVEN_X_INDEX_OFFSETS = [
        0, -1, // top
        0, 1, // bottom
        1, 0, // top right
        -1, 0, // top left
        1, 1, // bottom right
        -1, 1, // bottom left
    ]

    static getIndex(x: number, y: number): number {

    }

    private static ODD_X_INDEX_OFFSETS = [
        0, -1, // top
        0, 1, // bottom
        1, -1, // top right
        -1, -1, // top left
        1, 0, // bottom right
        -1, 0, // bottom left
    ]
}

export const MatchModel = getModelForClass(Match)

export function matchInfo(m: Match): GameMatchInfoDto {
    return {
        id: m._id,
        players: m.participants,
        mapId: m.mapId
    }
}
