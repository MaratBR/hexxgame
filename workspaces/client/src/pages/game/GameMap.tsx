import {Room} from "colyseus.js";
import {DataChange} from "@colyseus/schema"
import {
    MatchMapCell,
    IGameLobbyState,
    getTeamColor,
    IMatchState,
    GameRoomState,
    MatchState,
    MapCell
} from "@hexx/common";
import * as PIXI from "pixi.js"
import PixiFps from "pixi-fps";
import React from "react";
import ReactDOM from "react-dom"
import { Viewport } from 'pixi-viewport'
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import {Subscription} from "rxjs";
import GameApplication from "./GameApplication";

type Props = {
    room: Room<GameRoomState>
}

type CellRenders = {
    text: PIXI.Text
}

type State = {
    noMatch: boolean
    currentMatchID?: string
}

export default class GameMap extends React.Component<Props, State> {
    static contextType = ApiContext
    context!: AppAPI
    state: State = {
        noMatch: true
    }

    private app: GameApplication

    private readonly gameMapUID: string
    private readonly onRoomStateChangedListener: (state: GameRoomState) => void
    private match: MatchState | null = null

    constructor(props: Props) {
        super(props);

        this.gameMapUID = 'Map' + Math.floor(Math.random()*10000000000000000).toString(16)
        this.onRoomStateChangedListener = this.onRoomStateChanged.bind(this)
        this.app = new GameApplication({})
    }

    render() {
        return <div id={this.gameMapUID} />
    }

    componentDidMount() {
        this.props.room.onStateChange(this.onRoomStateChangedListener)

        this.onRoomStateChanged(this.props.room.state)

        document.getElementById(this.gameMapUID)!
            .appendChild(this.app.view)
    }

    componentWillUnmount() {
        this.props.room.onStateChange.remove(this.onRoomStateChangedListener)
    }

    private onRoomStateChanged(state: GameRoomState) {
        const match = state.match
        if (match && match.id === this.state.currentMatchID)
            return

        this.setState({
            currentMatchID: match?.id
        })
        this.onMatchChanged(match)
    }

    private onMatchChanged(match: MatchState | null) {
        if (this.match) {
            this.match.onChange = undefined
        }
        this.match = match

        if (match) {
            this.app.cells = match.mapCells
            match.onChange = this.onMatchStateChanged.bind(this)
            this.onMatchStateChanged()
        }
    }

    private onMatchStateChanged() {
        this.app.currentTeam = this.match?.currentTeam || 0
    }
}