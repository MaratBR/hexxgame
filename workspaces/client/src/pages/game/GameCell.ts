import * as PIXI from "pixi.js"
import {getTeamColor, MapCell} from "@hexx/common";

interface IGameCellOptions {
    radius: number
    gap: number
}

export enum GameCellState {
    None,
    Selected,
    Targeted
}

enum VisualState {
    MouseOver,
    Pressed,
    None
}

//#region const and imports

const POINTS = [
    new PIXI.Point(0, -1),
    new PIXI.Point(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6)),
    new PIXI.Point(Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)),
    new PIXI.Point(0, 1),
    new PIXI.Point(-Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)),
    new PIXI.Point(-Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6))
]

function drawHexBorder(gfx: PIXI.Graphics, points: PIXI.Point[], width: number, color: number) {
    gfx
        .moveTo(points[0].x, points[0].y)
        .lineStyle(width, color)
        .lineTo(points[1].x, points[1].y)
        .lineTo(points[2].x, points[2].y)
        .lineTo(points[3].x, points[3].y)
        .lineTo(points[4].x, points[4].y)
        .lineTo(points[5].x, points[5].y)
        .lineTo(points[0].x, points[0].y)
        .lineTo(points[1].x, points[1].y)
}


//#endregion

export default class GameCell extends PIXI.Container {
    private readonly poly: PIXI.Graphics
    private readonly text: PIXI.Text
    private readonly _opts: IGameCellOptions
    private readonly points: PIXI.Point[]

    constructor(options: IGameCellOptions) {
        super();
        this._opts = options
        this.points = POINTS.map(c => {
            const _c = c.clone()
            _c.y *= options.radius
            _c.x *= options.radius
            return _c
        })
        this.text = new PIXI.Text('0', {fontSize: 300, fontFamily: 'Righteous', fill: '#fff'})
        this.text.anchor.set(0.5)
        this.text.scale.set(0.1)

        this.poly = new PIXI.Graphics()
        this.poly.interactive = true

        this.poly.on('pointerover', () => {
            this.setVisualState(VisualState.MouseOver)
        })

        this.poly.on('pointerout', () => {
            this.setVisualState(VisualState.None)
        })

        this.poly.on('pointerdown', () => {
            this.setVisualState(VisualState.Pressed)
        })

        this.poly.on('pointerup', () => {
            if (this._state == VisualState.Pressed) {
                this.setVisualState(VisualState.MouseOver)
            }
        })

        this.redrawGfx()
        this.addChild(this.poly, this.text)
    }

    private _value: number = 0
    private _team: number = 0
    private _disabled: boolean = false
    private _cellState: GameCellState = GameCellState.None
    private _cell?: MapCell

    get cell() {
        return this._cell
    }

    set cell(v) {
        if (this._cell)
            this._cell.onChange = undefined
        this._cell = v
        if (v) {
            v.onChange = this.onCellChanged.bind(this)
            this.onCellChanged()
        }
    }

    onCellChanged() {
        this._value = this._cell!.value
        this.text.text = this._value+''
        this._team = this._cell!.team
        this.redrawGfx()
    }

    get cellState() { return this._cellState }
    set cellState(v) {
        this._cellState = v
        this.redrawGfx()
    }

    private _state: VisualState = VisualState.None
    private setVisualState(s: VisualState) {
        this._state = s
        this.redrawGfx()
    }

    get disabled() {
        return this._disabled
    }

    set disabled(v) {
        this._disabled = v
        this.redrawGfx()
    }

    get selected() {
        return this._cellState == GameCellState.Selected
    }

    set selected(v) {
        console.log('set selected to ' + v)
        this.cellState = v ? GameCellState.Selected : GameCellState.None
    }

    get value() {
        return this._value
    }

    get team() {
        return this._team
    }

    private redrawGfx() {
        const color = GameCell.hexColorToInt(getTeamColor(this._team))

        this.poly
            .clear()
            .beginFill(color)
            .drawPolygon(this.points)
            .endFill()

        if (this._disabled) {
            this.alpha = 0.5
            return
        } else if (this.alpha !== 1)
            this.alpha = 1

        this.scale.set(this._state == VisualState.Pressed ? 0.95 : 1)

        switch (this._cellState) {
            case GameCellState.None:
                break
            case GameCellState.Targeted:
                drawHexBorder(this.poly, this.points, 2, 0xff6f00)
                break
            case GameCellState.Selected:
                drawHexBorder(this.poly, this.points, 3, 0xffffff)
                break
        }
    }

    private static hexColorToInt(color: string): number {
        if (color.startsWith('#'))
            color = color.substr(1);
        if (/[0-9a-fA-F]{3}/.test(color)) {
            return parseInt(color.charAt(0), 16)*0x11 << 16 | parseInt(color.charAt(1), 16)*0x11 << 8 | parseInt(color.charAt(2), 16)*0x11
        } else if (/[0-9a-fA-F]{6}/.test(color)) {
            return parseInt(color.substr(0, 2)) << 16 | parseInt(color.substr(2, 2)) | parseInt(color.substr(4, 2))
        } else {
            throw new Error('unsupported color format')
        }
    }
}