import * as PIXI from "pixi.js"
import {getTeamColor} from "@hexx/common";

interface IGameCellOptions {
    maxRadius: number
}

export default class GameCell extends PIXI.Container {
    private poly: PIXI.Graphics
    private text: PIXI.Text
    private _value: number = 0
    private _team: number = 0

    get value() {
        return this._value
    }

    set value(v) {
        this._value = v
        this.text.text = v+''
    }

    get team() {
        return this._team
    }

    set team(v) {
        this._team = v
        const color = getTeamColor(v).substr(1)
        if (color.length === 3) {
            const values = color.split('').map(v => parseInt(v, 16))
            this.poly.tint = values[0] << 16 | values[0] << 20 | values[1] << 8 | values[1] << 12 | values[2] << 4 | values[2]
        }
    }

    constructor(options: IGameCellOptions) {
        super();

        this.poly = new PIXI.Graphics()
        this.poly.tint = 0x555555
        this.poly.beginFill(0xffffff)
        this.poly.drawPolygon([
            new PIXI.Point(0, -options.maxRadius),
            new PIXI.Point(Math.cos(Math.PI / 6) * options.maxRadius, -Math.sin(Math.PI / 6) * options.maxRadius),
            new PIXI.Point(Math.cos(Math.PI / 6) * options.maxRadius, Math.sin(Math.PI / 6) * options.maxRadius),
            new PIXI.Point(0, options.maxRadius),
            new PIXI.Point(-Math.cos(Math.PI / 6) * options.maxRadius, Math.sin(Math.PI / 6) * options.maxRadius),
            new PIXI.Point(-Math.cos(Math.PI / 6) * options.maxRadius, -Math.sin(Math.PI / 6) * options.maxRadius),
        ])
        let dragging = false
        this.poly.on('pointerover', () => {
            this.poly.tint = 0xff0000
            dragging = true
        })
        this.poly.on('pointer', () => {
            this.poly.tint = 0x555555
            dragging = false
        })

        this.text = new PIXI.Text(
            '1',
            new PIXI.TextStyle({
                fontFamily: 'Righteous',
                fontSize: options.maxRadius * 0.8,
                fill: '#fff'
            })
        )
        this.text.anchor.set(0.5)

        this.addChild(this.poly)
        this.addChild(this.text)
    }
}