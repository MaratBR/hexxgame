import {Schema, type} from "@colyseus/schema";
import {GameMapCell, MapCell, MatchMapCell} from "@hexx/common";


export enum AttackOutcome {
    Tie,
    Capture,
    Suicide,
    Absorb
}

export type AttackResult = {
    targetTeam: number
    attackerTeam: number
    targetPointsDiff: number
    attackerPointsDiff: number
    outcome: AttackOutcome
}

export class ServerMapCell extends MapCell {
    constructor(cell: GameMapCell) {
        super();
        this.team = cell.initTeam || 0
        this.value = cell.initValue || 0
        this.x = cell.x
        this.y = cell.y
        this.maxValue = cell.max
    }

    attack(other: ServerMapCell): AttackResult | undefined {
        if (this.team === other.team || this.team === 0 || this.value <= 1)
            return

        let outcome: AttackOutcome
        let attackerDiff: number = 0
        let targetDiff: number = 0

        if (other.isNeutral) {
            other.value = this.value - 1
            this.value = 1
            outcome = AttackOutcome.Absorb
        } else {
            if (other.value > this.value) {
                outcome = AttackOutcome.Suicide
                attackerDiff = this.value - 1
                targetDiff = -(this.value - 1)
                other.value -= this.value - 1
                this.value = 1

            } else if (other.value < this.value) {
                outcome = AttackOutcome.Capture
                attackerDiff = -1
                targetDiff = -other.value

                this.value = 1
                other.team = this.team
                other.value = this.value - other.value
                this.value = 1
            } else {
                attackerDiff = this.value - 1;
                targetDiff = this.value - 1;
                outcome = AttackOutcome.Tie
                this.value = 1
                other.value = 1
            }
        }
        return {
            attackerPointsDiff: attackerDiff,
            targetPointsDiff: targetDiff,
            outcome,
            targetTeam: other.team,
            attackerTeam: this.team
        }
    }

    get isNeutral() {
        return this.team === 0
    }
}