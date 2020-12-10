import {getModelForClass, prop} from "@typegoose/typegoose";
import {AttackChange, MoveDirection, PowerChange, RoundHistory} from "@hexx/common";
import {IDBase} from "./Base";


class AttackChangeImpl implements AttackChange {
    @prop()
    toX: number;
    @prop()
    toY: number;
    @prop()
    fromX: number;
    @prop()
    fromY: number;
}

class PowerChangeImpl implements PowerChange {
    @prop()
    points: number;
    @prop()
    x: number;
    @prop()
    y: number;

}

class RoundHistoryImpl implements RoundHistory {
    @prop({type: () => [AttackChangeImpl]})
    attacks: AttackChange[];
    @prop({type: () => [PowerChangeImpl]})
    powerUps: PowerChange[];
    @prop()
    duration: number;
    @prop({type: Number})
    stage: 1 | 2;
    @prop()
    team: number;
}

export class MatchHistory extends IDBase {
    @prop({index: true})
    matchID: string

    @prop({type: () => [RoundHistoryImpl]})
    rounds: RoundHistory[]
}

export const MatchHistoryModel = getModelForClass(MatchHistory)
