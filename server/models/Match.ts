import {getModelForClass, prop} from "@typegoose/typegoose";
import {IDBase} from "./Base";
import {GameMatchInfoDto, MatchStats, MoveDirection} from "lib_shared/dto";
import {User} from "./User";
import Dict = NodeJS.Dict;

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

export interface MapCellState {
    v: number,
    x: number,
    y: number,
    mxv?: number,
    t?: number
}

type MatchMap = {
    [key: number]: {
        [key: number]: MapCellState
    }
}

export interface MatchState {
    powerPoints?: number
    round: number
    roundStage: number
    team: number
    cells: MatchMap
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

    getWinner(): number | null {
        const gen = this.allCells()
        let winner: number = null
        let result: IteratorResult<MapCellState>
        while (!(result = gen.next()).done && winner == null) {
            if (result.value.t > 0)
                winner = result.value.t
        }
        if (!winner)
            return winner

        while (!(result = gen.next()).done) {
            if (result.value.t > 0 && result.value.t !== winner)
                return null
        }

        return winner
    }

    getStats(): MatchStats {
        const stats: MatchStats = {
            totalCells: 0,
            totalPoints: 0,
            maxPoints: 0,
            teamPoints: this.teamsRotation.map(() => 0)
        }

        for (let cell of Array.from(this.allCells())) {
            stats.totalCells++
            stats.totalPoints += cell.v
            stats.maxPoints += cell.mxv || MAX_VALUE
            if (cell.t > 0)
                stats.teamPoints[cell.t - 1] += cell.v
        }

        return stats
    }

    getSocketIORoomName() {
        return 'Match' + this._id
    }

    *allCells() {
        for (let row of Object.values(this.state.cells)) {
            for (let cell of Object.values(row)) {
                yield cell
            }
        }
    }
    async attemptAttack(fromX: number, fromY: number, direction: MoveDirection) {
        const cell = this.getCell(fromX, fromY)
        if (cell && cell.t > 0) {
            const target = this.getCell(fromX, fromY, direction)
            if (target.t == cell.t)
                return
        }
    }

    getTeam(userID: string) {
        const p = this.participants.find(p => p.id == userID)
        return p ? p.team : 0
    }

    getCell(x: number, y: number, direction?: MoveDirection): MapCellState | null {
        if (typeof direction !== 'undefined') {
            const [xOff, yOff] = (x % 2 == 0 ? Match.EVEN_X_INDEX_OFFSETS : Match.ODD_X_INDEX_OFFSETS)[direction]
            x += xOff
            y += yOff
        }
        const row = this.state.cells[y]
        if (!row)
            return null
        return row[x] || null
    }

    getCellTeam(x: number, y: number): number {
        const cell = this.getCell(x, y)
        return cell ? cell.t : -1
    }

    get isPowerStage() { return this.state.roundStage == 2 }
    get isMoveStage() { return this.state.roundStage == 1 }

    canPower(userID: string, x: number, y: number) {
        if (!this.isPowerStage)
            return false
        const userTeam = this.getTeam(userID)
        const cell = this.getCell(x, y)
        return userTeam > 0 && cell && cell.t == userTeam && cell.v < (cell.mxv || MAX_VALUE)
    }

    /**
     * Returns true if cell with given index exists and can be moved by the player
     * Returns false if cell does not exists, does not belong to the player's team or cannot be moved
     * @param userID
     * @param x
     * @param y
     * @param direction direction of move, if omitted will check if cell can move somewhere
     */
    canMove(userID: string, x: number, y: number, direction?: MoveDirection) {
        const cell = this.getCell(x, y)
        if (!cell || cell.t == 0 || cell.t !== this.getTeam(userID))
            return false

        if (typeof direction == 'undefined')
            return this.getNeighbourCells(x, y).some(c => c.t !== cell.t)
        return this.getCellOnDirection(x, y, direction) !== null
    }

    private getCellOnDirection(x: number, y: number, direction: MoveDirection): MapCellState | null {
        const [xOff, yOff] = (x % 2 == 0 ? Match.EVEN_X_INDEX_OFFSETS : Match.ODD_X_INDEX_OFFSETS)[direction]
        return this.getCell(x + xOff, y + yOff)
    }

    /**
     * Returns true if cell with cellIndex belongs to the user's team
     * (returns false if cell or user does not exists or if user is a spectator)
     * @param userID
     * @param x
     * @param y
     */
    cellBelongsTo(userID: string, x: number, y: number) {
        const userTeam = this.getTeam(userID)
        return userTeam > 0 && this.getCellTeam(x, y) == userTeam
    }

    getNeighbourCells(x: number, y: number) {
        return this.getNeighbourCellsIndexes(x, y).map(c => this.getCell(...c)).filter(c => c != null)
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
}

export const MatchModel = getModelForClass(Match)

export function matchInfo(m: Match): GameMatchInfoDto {
    return {
        id: m._id,
        players: m.participants,
        mapId: m.mapId
    }
}
