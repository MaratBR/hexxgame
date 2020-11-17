import {Service} from "typedi";
import {GameMap, GameMapCell, gameMapInfo, GameMapModel} from "../models/GameMap";
import {HttpError} from "routing-controllers";
import {GameMapInfoDto} from "@hexx/common/src/dto";

@Service()
export default class MapsService {
    getMapsInfo(): Promise<GameMapInfoDto[]> {
        return GameMapModel.find({}).exec().then(r => r.map(gameMapInfo))
    }

    getMap(mapId: string): Promise<GameMap | null>  {
        return GameMapModel.findById(mapId).exec()
    }

    createMap(name: string, cells: GameMapCell[], description?: string): Promise<GameMap> {
        const teams = new Set(cells.filter(c => c.initTeam && c.initTeam > 0).map(c => c.initTeam))
        if (teams.size < 2)
            return Promise.reject(new HttpError(422, 'map definition contains less than 2 teams'))
        cells = cells.sort((a, b) => a.x * 100000 + a.y)

        return GameMapModel.create({
            cells,
            description,
            name,
            maxTeams: teams.size
        })
    }
}