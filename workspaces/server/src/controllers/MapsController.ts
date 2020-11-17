import {Body, Get, JsonController, Post} from "routing-controllers";
import {GameMapCell, gameMapInfo} from "../models/GameMap";
import MapsService from "../services/MapsService";
import {IsOptional, Length, Max, Min, MinLength, ValidateNested} from "class-validator";
import Dict = NodeJS.Dict;


class MapCell implements GameMapCell {
    @Min(0)
    @Max(16)
    initTeam?: number;

    @Min(0)
    @Max(60)
    initValue?: number;

    @Min(1)
    @Max(60)
    max?: number;

    @Min(0)
    y: number;

    @Min(0)
    x: number;
}

class CreateMapBody {
    @Length(1, 50)
    name: string;

    @Length(0, 1000)
    @IsOptional()
    description?: string;

    @ValidateNested()
    @MinLength(1)
    cells: MapCell[]
}

@JsonController('/api/maps')
export class MapsController {
    constructor(private mapsService: MapsService) {}

    @Get()
    getMaps() {
        return this.mapsService.getMapsInfo()
    }

    @Post()
    createMap(@Body() data: CreateMapBody) {
        const cells: Dict<GameMapCell> = {}
        for (let c of data.cells)
            cells[`${c.x}:${c.y}`] = c
        data.cells = Object.values(cells)
        this.mapsService.createMap(data.name, data.cells, data.description).then(gameMapInfo)
    }
}