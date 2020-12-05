import {DominationState, GameRoomState, getTeamName, MapUtils, MatchState} from "@hexx/common";
import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import GameApplication, {SelectedCellEvent} from "./GameApplication";
import GameOverlay from "./GameOverlay";
import {Subscription} from "rxjs";
import Scope from "../../game/scope";

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

    private app: GameApplication
    private readonly gameMapUID: string
    private match: MatchState | null = null
    private readonly scope = new Scope()
    private readonly matchScope = this.scope.getChild()

    constructor(props: {}) {
        super(props);

        this.gameMapUID = 'Map' + Math.floor(Math.random()*10000000000000000).toString(16)
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
                        playerTeam={this.playerTeam}
                        onSkip={
                            () => this.playerTeam === this.state.matchState?.currentTeam ?
                                this.context.requireRoom().send('skip') :
                                undefined
                        }
                        matchState={this.state.matchState} /> :
                    undefined
            }
        </div>
    }

    componentDidMount() {
        document.getElementById(this.gameMapUID)!
            .appendChild(this.app.view)

        this.scope.addSubscription(
            this.app.selectedCellSub.subscribe(this.onSelectCell.bind(this)),
            this.context.onMatchStateChanged(this.onMatchChanged.bind(this))
        )
    }

    componentWillUnmount() {
        this.scope.reset()
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

    private onMatchChanged(match?: MatchState) {
        this.matchScope.reset()
        this.setState({matchState: match})

        if (match) {
            this.app.cells = match.mapCells
            this.app.currentTeam = match.currentTeam
            this.app.canSelectCell = this.playerTeam === match.currentTeam
            this.matchScope.add(
                match.listen('currentTeam', (currentTeam) => {
                    this.app.currentTeam = currentTeam
                    this.app.canSelectCell = this.playerTeam === currentTeam
                }),
                match.listen('selectedCellKey', selected => this.app.selectedCellKey = selected || null)
            )

        } else {
            this.app.cells.clear()
        }
    }
}