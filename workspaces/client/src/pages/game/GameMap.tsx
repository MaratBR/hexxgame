import {DominationState, GameRoomState, getTeamName, MapCell, MapUtils, MatchState, sleep} from "@hexx/common";
import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import GameApplication, {SelectedCellEvent} from "./GameApplication";
import GameOverlay from "./GameOverlay";
import Scope from "../../game/scope";
import Loading from "../../components/Loading";
import MatchResults from "./MatchResults";
import Modal from "../../components/Modal";
import {Redirect} from "react-router-dom";

type State = {
    noMatch: boolean
    currentMatchID?: string
    matchState?: MatchState
    playerID: string
    initialized?: boolean
    redirectToArchive?: boolean
}

export default class GameMap extends React.Component<{}, State> {
    static contextType = ApiContext
    context!: AppAPI

    state: State = {
        noMatch: true,
        playerID: ''
    }

    private app: GameApplication
    private readonly gameMapUID: string
    private readonly scope = new Scope()
    private readonly matchScope = this.scope.getChild()

    constructor(props: {}) {
        super(props);

        this.gameMapUID = 'Map' + Math.floor(Math.random()*10000000000000000).toString(16)
        this.app = new GameApplication({})
    }

    private get playerTeam() {
        return this.state.matchState?.participants.get(this.state.playerID)?.team || 0
    }

    render() {
        if (this.state.redirectToArchive)
            return <Redirect to="/" />

        return <div id={this.gameMapUID}>
            {!this.state.initialized ? <Loading fixed={true} /> : undefined}

            {
                this.state.matchState ?
                    this.renderOverlay() :
                    undefined
            }
            {
                this.state.matchState?.winner ?
                    this.renderWinner() :
                    undefined
            }
        </div>
    }

    private renderWinner() {
        if (!this.state.matchState)
            return <Modal>
                Oops, no match results found
            </Modal>
        return <Modal>
            <MatchResults winner={this.state.matchState.winner}
                          domination={this.state.matchState.domination}
                          teams={this.state.matchState.teamsRotation} />
        </Modal>
    }

    private renderOverlay() {
        if (!this.state.matchState)
            throw new Error('failed to render overlay when match state is nowhere to be found')
        const playerTeam = this.playerTeam
        return <GameOverlay
            playerTeam={playerTeam}
            onSkip={
                () => playerTeam === this.state.matchState?.currentTeam ?
                    this.context.requireRoom().send('skip') :
                    undefined
            }
            matchState={this.state.matchState} />
    }

    componentDidMount() {
        // initialization
        this.init()
            .then(() => {
                document.getElementById(this.gameMapUID)!
                    .appendChild(this.app.view)

                this.app.resetPositioning()

                this.scope.addSubscription(
                    this.app.selectedCellSub.subscribe(this.onSelectCell.bind(this)),
                    this.context.onMatchStateChanged(this.onMatchChanged.bind(this))
                )
            })
    }

    componentWillUnmount() {
        this.scope.reset()
    }

    private async init() {
        const data = await this.context.getUserInfo()
        await sleep(1000)

        this.setState({
            playerID: data.id,
            initialized: true
        })
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

        if (!match?.id) {
            this.setState({
                redirectToArchive: true
            })
            return
        }

        if (match) {
            this.app.cells = match.mapCells
            this.app.currentTeam = match.currentTeam
            this.app.canSelectCell = this.playerTeam === match.currentTeam
            this.matchScope.add(
                match.listen('currentTeam', (currentTeam) => {
                    this.app.currentTeam = currentTeam
                    this.app.canSelectCell = this.playerTeam === currentTeam
                }),
                match.listen('selectedCellKey', selected => this.app.selectedCellKey = selected || null),
                match.listen('winner', winner => this.onMatchEnded(winner))
            )
            if (match.winner)
                this.onMatchEnded(match.winner)
        } else {
            this.app.cells.clear()
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    this.app.cells.set(MapUtils.getKey(i, j), new MapCell({x: i, y: j, team: Math.floor(Math.random()*5)}))
                }
            }
        }
    }

    private onMatchEnded(winner: number) {
        if (winner)
            this.app.stop()
    }
}