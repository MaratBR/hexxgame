import {Room} from "colyseus.js";
import {IGameLobbyState} from "@hexx/common";
import * as PIXI from "pixi.js"
import GameCell from "./GameCell";

export default class GameMap {
    private stateChangedHandler: (...args: any[]) => void
    private room: Room<IGameLobbyState>
    readonly matchID: string
    private disposed: boolean = false
    private app: PIXI.Application
    private cells: NodeJS.Dict<any> = {}

    get view() {
        return this.app.view
    }

    constructor(room: Room<IGameLobbyState>) {
        this.app = new PIXI.Application()
        this.stateChangedHandler = this.onStateChanged.bind(this)
        room.onStateChange(this.stateChangedHandler)
        this.room = room
        if (!this.room.state.match.id)
            throw new Error('Cannot create a game map since match id is not set')
        this.matchID = this.room.state.match.id
        console.log('created new GameMap instance')

        this.initGame()
    }

    dispose() {
        if (this.disposed)
            return
        this.room.onStateChange.remove(this.stateChangedHandler)
        this.disposed = true
    }

    private onStateChanged(newState: IGameLobbyState) {
        if (newState.match.id !== this.matchID) {
            this.dispose()
            return
        }

        console.log(newState)
    }

    private initGame() {
        this.rebuildMap()
    }

    private rebuildMap() {
        this.app.stage.removeChildren()
        this.cells = {}
        const cells = this.room.state.match.mapCells
        for (let k in cells) {
            if (!cells.hasOwnProperty(k))
                continue
            const cell = cells[k]
            this.cells[k] = new GameCell({maxRadius: 100})
            this.app.stage.addChild(this.cells[k])
        }
    }
}