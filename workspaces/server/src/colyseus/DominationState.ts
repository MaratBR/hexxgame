import {Schema, type, MapSchema} from "@colyseus/schema";
import {IGameDominationState} from "@hexx/common";
import {GameMap} from "../models/GameMap";
import {MapCell} from "./MapCell";
import Dict = NodeJS.Dict;

export class DominationState extends Schema implements IGameDominationState {
    @type('number')
    cells: number = 0;

    @type({map: 'number'})
    teamCells: MapSchema<number> = new MapSchema<number>();

    @type({map: 'number'})
    teamPoints: MapSchema<number> = new MapSchema<number>();

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