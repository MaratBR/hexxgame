import {GameRoomState, MapUtils, MatchState} from "@hexx/common";
import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import GameApplication, {SelectedCellEvent} from "./GameApplication";
import GameOverlay from "./GameOverlay";
import {Subscription} from "rxjs";

type State = {
    noMatch: boolean
    currentMatchID?: string
    matchState?: MatchState
}

export default class GameMap extends React.Component<{}, State> {
    static contextType = ApiContext
    context!: AppAPI

    state: State = {
        noMatch: true
    }

    private readonly subs: Subscription[] = []
    private app: GameApplication
    private readonly gameMapUID: string
    private readonly onRoomStateChangedListener: (state: GameRoomState) => void
    private match: MatchState | null = null

    constructor(props: {}) {
        super(props);

        this.gameMapUID = 'Map' + Math.floor(Math.random()*10000000000000000).toString(16)
        this.onRoomStateChangedListener = this.onRoomStateChanged.bind(this)
        this.app = new GameApplication({})
        ;(window as any).www = new MatchState()
    }

    get playerTeam() {
        const sessionId = this.context.room?.sessionId
        if (!sessionId)
            return 0
        const dbID = this.context.requireRoom().state.clients.get(sessionId).dbID
        if (!dbID)
            return 0
        const team = this.state.matchState?.participants.get(dbID)?.team
        return team || 0
    }

    render() {
        return <div id={this.gameMapUID}>
            {
                this.state.matchState ?
                    <GameOverlay
                        onSkip={
                            () => this.playerTeam === this.state.matchState?.currentTeam ?
                                this.context.requireRoom().send('skip') :
                                undefined
                        }
                        domination={this.state.matchState.domination}
                        teamsRotation={this.state.matchState.teamsRotation}
                        currentTeam={this.state.matchState.currentTeam}
                        currentRound={this.state.matchState.currentRound}
                        currentStage={this.state.matchState.currentRoundStage}
                        endsAt={this.state.matchState.roundStageEndsAt}/> :
                    undefined
            }
        </div>
    }

    componentDidMount() {
        this.context.requireRoom().onStateChange(this.onRoomStateChangedListener)

        this.onRoomStateChanged(this.context.requireRoom().state)

        document.getElementById(this.gameMapUID)!
            .appendChild(this.app.view)

        this.subs.push(
            this.app.selectedCellSub.subscribe(this.onSelectCell.bind(this))
        )
    }

    componentWillUnmount() {
        this.context.requireRoom().onStateChange.remove(this.onRoomStateChangedListener)
        this.subs.forEach(s => s.unsubscribe())
    }

    onSelectCell({cell, shift}: SelectedCellEvent) {
        const match = this.state.matchState
        if (!match)
            throw new Error('no match found, cannot select a cell')
        console.debug('onSelectCell: match.currentTeam = ' + match.currentTeam)
        console.debug('onSelectCell: this.playerTeam = ' + this.playerTeam)
        if (match.currentTeam !== this.playerTeam)
            return;

        console.debug('onSelectCell: match.currentRoundStage = ' + match.currentRoundStage)
        if (match.currentRoundStage == 1) {
            if (this.app.targetCells.some(c => cell == c.cell) && this.app.selectedCell) {
                this.context.requireRoom().send('attack', {
                    fromX: this.app.selectedCell.x,
                    fromY: this.app.selectedCell.y,
                    toX: cell.x,
                    toY: cell.y
                })
            } else if (this.app.selectedCell == cell) {
                this.context.requireRoom().send('setSelected', null)
            } else if (cell.team == this.playerTeam) {
                this.context.requireRoom().send('setSelected', MapUtils.getKey(cell.x, cell.y))
            } else {
                this.context.requireRoom().send('setSelected', null)
            }
        } else if (match.currentRoundStage == 2) {
            console.debug('powerUp', {x: cell.x, y: cell.y, max: false})
            this.context.requireRoom().send("powerUp", {x: cell.x, y: cell.y, max: shift})
        }
    }

    private onRoomStateChanged(state: GameRoomState) {
        const match = state.match
        const matchChanged = match?.id !== this.state.matchState?.id;
        (window as any).state = state
        this.setState({
            matchState: match
        })

        if (match) {
            this.app.canSelectCell = match.currentTeam == this.playerTeam
            if (match.selectedCellKey) {
                const key = match.selectedCellKey
                this.app.selectedCell = this.app.cells.get(key)
            } else {
                this.app.selectedGameCell = null
            }
        }

        if (matchChanged) {
            this.setState({
                currentMatchID: match?.id
            })
            this.onMatchChanged(match)
        }
    }

    private onMatchChanged(match?: MatchState) {
        if (this.state.matchState) {
            this.state.matchState.onChange = undefined
        }
        this.setState({matchState: match})

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