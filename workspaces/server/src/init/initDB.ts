import {GameMapCell, GameMapModel} from "../models/GameMap";
import MapsService from "../services/MapsService";
import {Container} from "typedi";

async function createGameMap(size: number, teams: number) {
    const service = Container.get(MapsService)
    const cells: GameMapCell[] = []

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            cells.push({
                x, y
            })
        }
    }

    for (let t = 1; t < teams + 1; t++) {
        cells[t].initValue = 1
        cells[t].initTeam = t
    }

    return await service.createMap(`Generic ${size}x${size} map with ${teams} teams`, cells)
}

export default async function initDB() {
    await GameMapModel.deleteMany({})
    await createGameMap(10, 2)
    await createGameMap(10, 3)
    await createGameMap(10, 4)
    await createGameMap(10, 5)
    await createGameMap(10, 6)
    await createGameMap(10, 7)
    await createGameMap(10, 8)
    await createGameMap(10, 9)
    await createGameMap(10, 10)
    await createGameMap(10, 11)
    await createGameMap(10, 12)
    await createGameMap(10, 13)
}