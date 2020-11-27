import * as PIXI from "pixi.js"
import {MapSchema} from "@colyseus/schema"
import {MapCell, MapUtils} from "@hexx/common";
import PixiFps from "pixi-fps";
import {Viewport} from 'pixi-viewport'
import GameCell, {GameCellState} from "./GameCell";

type CellsObjects = {
    [key: string]: GameCell
}

type RenderProps = {
    innerRadius: number
    cellGap: number
    cells?: MapSchema<MapCell>
}

const DEFAULT_PROPS: RenderProps = {
    innerRadius: 40,
    cellGap: 6
}

export default class GameApplication extends PIXI.Application {
    private _mapGfx: PIXI.Graphics = new PIXI.Graphics()
    private _container: PIXI.Container = new PIXI.Container()
    private _cellsObjects: CellsObjects = {}
    private _cells!: MapSchema<MapCell>
    private props: RenderProps
    private _currentTeam: number = 0
    private _selectedCell: GameCell | null = null
    private _targetCells: GameCell[] = []

    constructor(props: Partial<RenderProps>) {
        super({
            antialias: true,
            resolution: window.devicePixelRatio || 1
        });
        (window as any).test = this;
        this.props = {
            ...DEFAULT_PROPS,
            ...props
        }
        this.renderer.plugins.interaction.moveWhenInside = true

        this.cells = props.cells || new MapSchema<MapCell>()

        this.makeAll()
    }

    get cells(): MapSchema<MapCell> {
        return this._cells
    }

    set cells(cells) {
        if (this._cells) {
            this._cells.onAdd = undefined
            this._cells.onRemove = undefined
        }
        this._cells = cells
        cells.onAdd = this.onCellAdded.bind(this)
        cells.onRemove = this.onCellRemoved.bind(this)
        cells.forEach(this.onCellAdded.bind(this))
    }

    get currentTeam() {
        return this._currentTeam
    }

    set currentTeam(v) {
        if (v === this._currentTeam)
            return
        this._currentTeam = v
        Object.values(this._cellsObjects).forEach(c => {
            c.disabled = c.team !== v && c.team !== 0
        })

        if (this.selectedCell?.team !== v)
            this.selectedCell = null
    }

    get selectedCell() {
        return this._selectedCell
    }

    set selectedCell(v) {
        if (this._selectedCell) {
            this._targetCells.forEach(c => c.cellState = GameCellState.None)
            this._selectedCell.selected = false
        }
        this._selectedCell = v
        if (v) {
            this._targetCells = this.getCellNeighbours(v).filter(a => a.team !== v.team)
            this._targetCells.forEach(c => c.cellState = GameCellState.Targeted)
            v.selected = true
        }
    }

    private onCellAdded(cell: MapCell, key: string) {
        const [x, y] = this.getCellOrigin(cell)
        const gameCell = new GameCell({radius: this.props.innerRadius, gap: this.props.cellGap})
        this._cellsObjects[key] = gameCell
        gameCell.interactive = true
        gameCell.cell = cell
        gameCell.x = x;
        gameCell.y = y;
        console.log('click handler added')
        gameCell.on('click', () => {
            console.log('toggle selected')
            gameCell.selected = !gameCell.selected
            return
        })
        this._container.addChild(gameCell)
    }

    private onCellRemoved(cell: MapCell, key: string) {
        this._container.removeChild(this._cellsObjects[key])
        cell.onChange = undefined
    }

    private makeAll() {
        const viewPort = new Viewport()

        viewPort
            .drag()
            .pinch()
            .wheel()
            .decelerate()

        this._container.addChild(this._mapGfx)
        viewPort.addChild(this._container)

        this.stage.addChild(viewPort)

        const fpsCounter = new PixiFps()
        this.stage.addChild(fpsCounter)
    }

    private getCellNeighbours(gameCell: GameCell) {
        if (!gameCell.cell)
            return []
        return MapUtils.getNeighbours(gameCell.cell.x, gameCell.cell.y).map(([x, y]) => {
            return this._cellsObjects[MapUtils.getKey(x, y)]
        }).filter(v => !!v)
    }

    private getCellOrigin(cell: MapCell) {
        const outerRadius = this.props.innerRadius + this.props.cellGap
        const COS30 = Math.cos(Math.PI / 6)
        const xOrigin = COS30 * outerRadius * cell.x * 2 + (cell.y % 2 == 0 ? outerRadius * COS30 : 0)
        const yOrigin = outerRadius  * cell.y * 1.5
        return [xOrigin, yOrigin]
    }
}