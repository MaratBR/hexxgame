import {Room} from "colyseus.js";
import {MatchMapCell, IGameLobbyState, getTeamColor} from "@hexx/common";
import * as PIXI from "pixi.js"
import PixiFps from "pixi-fps";
import React from "react";
import { Viewport } from 'pixi-viewport'

type GameMapProps = {
    room: Room<IGameLobbyState>
}

type CellRenders = {
    text: PIXI.Text
}

export default class GameMap extends React.Component<GameMapProps, any> {
    private stateChangedHandler: (...args: any[]) => void
    readonly matchID: string
    private disposed: boolean = false
    private app: PIXI.Application
    private graphics?: PIXI.Graphics
    private mapContainer?: PIXI.Container
    private cells: { [key: string]: CellRenders } = {}

    get view() {
        return this.app.view
    }

    constructor(props: GameMapProps) {
        super(props)
        this.app = new PIXI.Application()
        this.stateChangedHandler = this.onStateChanged.bind(this)
        this.props.room.onStateChange(this.stateChangedHandler)
        if (!this.props.room.state.match.id)
            throw new Error('Cannot create a game map since match id is not set')
        this.matchID = this.props.room.state.match.id
        console.log('created new GameMap instance')

        this.initGame()
    }

    componentDidMount() {
        document.getElementById(this.props.room.id)!
            .appendChild(this.view)
        this.app.resizeTo = window
    }

    render() {
        return <div id={this.props.room.id} />
    }

    dispose() {
        if (this.disposed)
            return
        this.props.room.onStateChange.remove(this.stateChangedHandler)
        this.disposed = true
    }

    private onStateChanged(newState: IGameLobbyState) {
        if (newState.match.id !== this.matchID) {
            this.dispose()
            return
        }
    }

    private initGame() {
        this.rebuildMap()
    }

    private rebuildMap() {
        this.app.stage.removeChildren()
        this.cells = {}
        const cells = this.props.room.state.match.mapCells
        if (!cells)
            return

        const graphics = new PIXI.Graphics()
        this.graphics = graphics
        graphics.tint = 0xffffff
        graphics.beginFill(0xffffff)

        const container = new PIXI.Container()
        this.mapContainer = container

        container.addChild(graphics)

        for (let cell of cells.values()) {
            this.renderCell(cell)
        }


        const fpsCounter = new PixiFps();

        this.app.stage.addChild(fpsCounter)

        const viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: 20,
            worldHeight: 20,

            interaction: this.app.renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        })

        // activate plugins
        viewport
            .drag()
            .pinch()
            .wheel()
            .decelerate()

        viewport.addChild(container)

        this.app.stage.addChild(viewport)

    }

    renderCell(cell: MatchMapCell) {
        const radius = 40
        const COS30 = Math.cos(Math.PI / 6)
        const xOrigin = COS30 * (radius + 5) * cell.x * 2 + (cell.y % 2 == 0 ? (radius + 5) * COS30 : 0)
        const yOrigin = radius * cell.y * 2 * COS30

        const cellKey = cell.y + ':' + cell.x
        let firstRender = false
        if (this.cells[cellKey]) {
            this.cells[cellKey]!.text.text = cell.value+''
        } else {
            const text = new PIXI.Text(cell.value+'', new PIXI.TextStyle({fontSize: 200, fill: '#000'}))
            text.scale.set(0.1)
            text.x = xOrigin
            text.y = yOrigin
            text.anchor.set(0.5)
            text.zIndex = 1000
            this.cells[cellKey] = {text}
            firstRender = true
        }

        const color = getTeamColor(cell.team || 0).substr(1)
        console.log(color)
        if (color.length === 3) {
            const values = color.split('').map(v => parseInt(v, 16))
            this.graphics!.beginFill(values[0] << 16 | values[0] << 20 | values[1] << 8 | values[1] << 12 | values[2] << 4 | values[2])
        }
        this.graphics!.drawPolygon([
            new PIXI.Point(0, -radius),
            new PIXI.Point(Math.cos(Math.PI / 6) * radius, -Math.sin(Math.PI / 6) * radius),
            new PIXI.Point(Math.cos(Math.PI / 6) * radius, Math.sin(Math.PI / 6) * radius),
            new PIXI.Point(0, radius),
            new PIXI.Point(-Math.cos(Math.PI / 6) * radius, Math.sin(Math.PI / 6) * radius),
            new PIXI.Point(-Math.cos(Math.PI / 6) * radius, -Math.sin(Math.PI / 6) * radius)
        ].map(p => {
            p.x += xOrigin
            p.y += yOrigin
            return p
        }))

        if (firstRender)
            this.mapContainer!.addChild(this.cells[cellKey]!.text)
    }
}