import {getModelForClass, prop} from "@typegoose/typegoose";
import {AttackChange, MoveDirection, PowerChange, RoundHistory} from "@hexx/common";


class AttackChangeImpl implements AttackChange {
    @prop({type: Number})
    direction: MoveDirection;
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

export class MatchHistory {
    @prop({required: true})
    _id: string

    @prop({type: () => [RoundHistoryImpl]})
    rounds: RoundHistory[]
}

export const MatchHistoryModel = getModelForClass(MatchHistory)
