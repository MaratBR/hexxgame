import {Room} from "colyseus.js";
import {IGameLobbyState} from "@hexx/common";

export default class GameMap {
    private stateChangedHandler: (...args: any[]) => void
    private room: Room<IGameLobbyState>
    readonly matchID: string
    private disposed: boolean = false

    constructor(room: Room<IGameLobbyState>) {
        this.stateChangedHandler = this.onStateChanged.bind(this)
        room.onStateChange(this.stateChangedHandler)
        this.room = room
        if (!this.room.state.match.id)
            throw new Error('Cannot create a game map since match id is not set')
        this.matchID = this.room.state.match.id
        console.log('created new GameMap instance')
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
}