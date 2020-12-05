import * as PIXI from "pixi.js"
import {MapSchema} from "@colyseus/schema"
import {MapCell, MapUtils} from "@hexx/common";
import PixiFps from "pixi-fps";
import {Viewport} from 'pixi-viewport'
import GameCell, {GameCellState} from "./GameCell";
import {Observable, Subject} from "rxjs";

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

export type SelectedCellEvent = {
    cell: MapCell,
    shift: boolean
}

export default class GameApplication extends PIXI.Application {
    private _mapGfx: PIXI.Graphics = new PIXI.Graphics()
    private _container: PIXI.Container = new PIXI.Container()
    private _cellsObjects: CellsObjects = {}
    private _cells!: MapSchema<MapCell>
    private props: RenderProps
    private _currentTeam: number = 0
    private _canSelectCell: boolean = true
    private _selectedGameCell: GameCell | null = null
    private _targetCells: GameCell[] = []
    private _selectedCellSub = new Subject<SelectedCellEvent>()

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
        this.resizeTo = window
        this.renderer.plugins.interaction.moveWhenInside = true

        this.cells = props.cells || new MapSchema<MapCell>()

        this.makeAll()
    }

    get targetCells() {
        return this._targetCells
    }

    get selectedCellSub(): Observable<SelectedCellEvent> {
        return this._selectedCellSub
    }

    get canSelectCell() {
        return this._canSelectCell
    }

    set canSelectCell(v) {
        this._canSelectCell = v
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
        /**
         * Object.values(this._cellsObjects).forEach(c => {
            c.disabled = c.team !== v && c.team !== 0
        })
         */

        if (this.selectedGameCell?.team !== v)
            this.selectedGameCell = null
    }

    get selectedCell() {
        return this.selectedGameCell?.cell || null
    }

    set selectedCell(v) {
        if (!v)
            this.selectedGameCell = null
        else
            this.selectedGameCell = this._cellsObjects[MapUtils.getKey(v.x, v.y)]
    }

    get selectedGameCell() {
        return this._selectedGameCell
    }

    set selectedGameCell(v) {
        if (this._selectedGameCell) {
            this._targetCells.forEach(c => {
                c.cellState = GameCellState.None
                c.attackSubjectFromTeam = undefined
            })
            this._selectedGameCell.selected = false
        }
        this._selectedGameCell = v
        if (v) {
            this._targetCells = this.getCellNeighbours(v)
            this._targetCells.forEach(c => {
                c.cellState = GameCellState.Targeted
                c.attackSubjectFromTeam = this.currentTeam
            })
            console.log(this._targetCells)
            v.selected = true
        }
    }

    get selectedCellKey(): string | null {
        return this._selectedGameCell ? MapUtils.getKey(this._selectedGameCell.x, this._selectedGameCell.y) : null
    }

    set selectedCellKey(v) {
        if (!v)
            this.selectedGameCell = null
        else
            this.selectedGameCell = this._cellsObjects[v] || null
    }

    resetPositioning() {
        this._container.x = this.view.width / 4
        this._container.y = this.view.height / 4
    }

    private onCellAdded(cell: MapCell, key: string) {
        const [x, y] = this.getCellOrigin(cell)
        const gameCell = new GameCell({radius: this.props.innerRadius, gap: this.props.cellGap})
        this._cellsObjects[key] = gameCell
        gameCell.interactive = true
        gameCell.cell = cell
        gameCell.x = x;
        gameCell.y = y;
        gameCell.on('click', (e: PIXI.InteractionEvent) => {
            if (!gameCell.cell)
                return
            if (this.canSelectCell) {
                this._selectedCellSub.next({
                    cell: gameCell.cell,
                    shift: e.data.originalEvent.shiftKey
                })
            }
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