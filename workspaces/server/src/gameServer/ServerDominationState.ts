import {DominationState, MapCell} from "@hexx/common";
import {MapSchema} from "@colyseus/schema";
import {AttackOutcome, AttackResult} from "./MapCell";

export class ServerDominationState extends DominationState {

    updateFromCells(cells: MapSchema<MapCell>) {
        this.teamCells.clear()
        this.teamPoints.clear()
        for (let cell of cells.values()) {
            if (cell.team === 0)
                continue
            if (!this.teamCells.has(cell.team + '')) {
                this.teamCells.set(cell.team + '', 1)
                this.teamPoints.set(cell.team + '', cell.value)
            } else {
                this.teamCells.set(cell.team + '', this.teamCells.get(cell.team + '') + 1)
                this.teamPoints.set(cell.team + '', this.teamPoints.get(cell.team + '') + cell.value)
            }
        }
    }

    updateFromAttackResult(result: AttackResult) {
        let attackerCellsDiff = 0, targetCellsDiff = 0, targetDiff = 0, attackerDiff = 0
        switch (result.outcome) {
            case AttackOutcome.Tie:
                targetDiff = attackerDiff = result.attackerPointsDiff
                break
            case AttackOutcome.Absorb:
                attackerCellsDiff = 1;
                break;
            case AttackOutcome.Capture:
                attackerDiff = result.attackerPointsDiff
                targetDiff = result.targetPointsDiff
                attackerCellsDiff = 1;
                targetCellsDiff = -1;
                break
        }
        this.teamPoints.set(result.targetTeam + '', this.teamPoints.get(result.targetTeam + '') + targetDiff)
        this.teamPoints.set(result.attackerTeam + '', this.teamPoints.get(result.attackerTeam + '') + attackerDiff)

        this.teamCells.set(result.targetTeam + '', this.teamCells.get(result.targetTeam + '') + targetCellsDiff)
        this.teamCells.set(result.attackerTeam + '', this.teamCells.get(result.attackerTeam + '') + attackerCellsDiff)
    }

    updateFromPowerUp(team: number, value: number) {
        this.teamPoints.set(team + '', this.teamPoints.get(team + '') + value)
    }
}