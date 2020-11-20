import {Schema, type} from "@colyseus/schema";
import {GameMapCell, IGameDominationState} from "@hexx/common";
import {GameMap} from "../models/GameMap";
import Dict = NodeJS.Dict;
import {MapCell} from "./MapCell";

export class DominationState extends Schema implements IGameDominationState {
    @type('number')
    cells: number = 0;

    @type({map: 'number'})
    teamCells: Dict<number> = {};

    @type({map: 'number'})
    teamPoints: Dict<number> = {};

    @type('number')
    totalPoints: number = 0;

    constructor(cellsList: Dict<MapCell>) {
        super();

        for (let cell of Object.values(cellsList)) {
            this.cells++
            this.totalPoints += cell.value
            if (cell.team) {
                if (this.teamCells[cell.team]) {
                    this.teamCells[cell.team] += 1
                    this.teamPoints[cell.team] += cell.value
                } else {
                    this.teamCells[cell.team] = 1
                    this.teamPoints[cell.team] = cell.value
                }
            }
        }
    }
}