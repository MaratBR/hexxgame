import {GameRoomState, MapCell, MapUtils, MatchParticipant, MatchState, MoveDirection} from "@hexx/common";
import {MapSchema} from "@colyseus/schema";
import {AttackOutcome, ServerMapCell} from "./MapCell";
import {Match, MAX_VALUE} from "../models/Match";
import {GameMap} from "../models/GameMap";
import moment from "moment";
import {ServerDominationState} from "./ServerDominationState";
import Dict = NodeJS.Dict;

export class ServerMatchState extends MatchState {
    mapCells: MapSchema<ServerMapCell>
    domination: ServerDominationState

    constructor(roomState?: GameRoomState, match?: Match, map?: GameMap) {
        super();
        if (roomState && match && map) {
            this.id = match._id
            this.teamsRotation = Array.from(match.teamsRotation)
            this.startsAt = +match.startsAt
            const cells: Dict<ServerMapCell> = {}
            for (let cell of map.cells) {
                const mapCell = new ServerMapCell(cell)
                if (cell.initTeam && !match.teamsRotation.includes(cell.initTeam)) {
                    mapCell.team = 0
                }
                cells[MapUtils.getKey(cell.x, cell.y)] = mapCell
            }
            this.domination = new ServerDominationState()
            this.mapCells = new MapSchema<ServerMapCell>(cells)
            this.domination.updateFromCells(this.mapCells)
            for (let [playerID, player] of roomState.clients.entries()) {
                if (player.team === 0)
                    return;
                this.participants.set(playerID, new MatchParticipant({
                    dbID: playerID,
                    username: player.username,
                    online: true,
                    team: player.team
                }))
            }
        }
    }

    get(x: number, y: number, direction?: MoveDirection): ServerMapCell | undefined {
        if (typeof direction !== 'undefined') {
            const [xOff, yOff] = MapUtils.getOffset(y, direction)
            x += xOff
            y += yOff
        }
        return this.mapCells[y + ':' + x]
    }

    getWinner(): number | null {
        const teamsWithCells = []
        for (let [team, points] of this.domination.teamCells.entries()) {
            if (points > 0 && team !== '0' && !teamsWithCells.includes(+team))
                teamsWithCells.push(+team)
        }
        if (teamsWithCells.length == 1)
            return teamsWithCells[0]
        return null
    }

    performAttack(fromX: number, fromY: number, toX: number, toY: number): boolean {
        const cell = this.get(fromX, fromY)
        if (!cell)
            return false
        const index = MapUtils.getNeighbours(fromX, fromY).findIndex(([x, y]) => x === toX && y === toY)
        if (index < 0 || index > 5)
            return false
        const target = this.get(fromX, fromY, index)
        if (!target)
            return false;
        const result = cell.attack(target)
        if (result) {
            if ((result.outcome == AttackOutcome.Capture || result.outcome == AttackOutcome.Absorb) && target.value > 1) {
                this.selectedCellKey = MapUtils.getKey(target.x, target.y)
            } else if (cell.value < 2) {
                this.selectedCellKey = undefined
            }
            this.domination.updateFromAttackResult(result)
            return true
        }
        return false
    }

    performPowerUp(x: number, y: number, maxOut: boolean): number {
        const cell = this.get(x, y)
        if (!cell || cell.team == 0)
            return 0
        let diff = maxOut ? (cell.maxValue || MAX_VALUE) - cell.value : 1
        diff = Math.min(Math.min(diff, this.powerPoints), (cell.maxValue || MAX_VALUE) - cell.value)
        if (diff === 0)
            return 0
        this.powerPoints -= diff
        cell.value += diff
        this.domination.updateFromPowerUp(cell.team, diff)
        return diff
    }

    beginPowerUp() {
        this.selectedCellKey = undefined
        const cellsCount = Array.from(this.mapCells.values())
            .filter(c => c.team == this.currentTeam)
            .length
        this.currentRoundStage = 2
        this.powerPoints = cellsCount
        const duration = cellsCount * this.roundLengthPerCell + this.baseRoundLength
        this.roundStageEndsAt = moment().add(duration, 'seconds').unix() * 1000
    }

    beginAttack() {
        this.currentRoundStage = 1
        const cells = Object.values(this.mapCells)
            .filter(c => c.team == this.currentTeam)
            .length
        const duration = cells * this.roundLengthPerCell + this.baseRoundLength
        this.roundStageEndsAt = moment().add(duration, 'seconds').unix() * 1000
    }

    nextRound() {
        this.currentRound++
        const index = this.teamsRotation.indexOf(this.currentTeam)
        this.currentTeam = index + 1 >= this.teamsRotation.length ? this.teamsRotation[0] : this.teamsRotation[index + 1]
    }

    distributePowerPoints() {
        if (this.powerPoints === 0)
            return;

        let cells = Array.from(this.mapCells.values()).filter(c => c.team === this.currentTeam)
        if (cells.length === 0)
            return;
        const sorting = (a: MapCell, b: MapCell): number => a.value < b.value ? -1 : 0

        do {
            cells.sort(sorting)
            this.powerPoints -= this.performPowerUp(cells[0].x, cells[0].y, false)
        } while (this.powerPoints > 0)
    }

    endMatchIfHasWinner() {
        if (this.winner)
            return true
        const winner = this.getWinner()
        if (winner !== null) {
            this.setWinner(winner)
            return true
        }
        return false
    }

    setWinner(winner: number) {
        this.winner = winner
    }
}