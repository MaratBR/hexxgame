import {Room} from "colyseus.js";
import {GameRoomState, MapCell, MapUtils, MatchState} from "@hexx/common";
import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import GameApplication from "./GameApplication";
import GameOverlay from "./GameOverlay";
import {Subscription} from "rxjs";

type Props = {
    room: Room<GameRoomState>
}

type State = {
    noMatch: boolean
    currentMatchID?: string
    matchState: MatchState | null
}

export default class GameMap extends React.Component<Props, State> {
    static contextType = ApiContext
    context!: AppAPI
    state: State = {
        noMatch: true,
        matchState: null
    }

    private readonly subs: Subscription[] = []
    private app: GameApplication
    private readonly gameMapUID: string
    private readonly onRoomStateChangedListener: (state: GameRoomState) => void
    private match: MatchState | null = null

    constructor(props: Props) {
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
        const dbID = this.context.room?.state.clients.get(sessionId).dbID
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
                        teamsRotation={this.state.matchState.teamsRotation}
                        currentTeam={this.state.matchState.currentTeam}
                        currentStage={this.state.matchState.currentRoundStage}
                        endsAt={this.state.matchState.roundStageEndsAt}/> :
                    undefined
            }
        </div>
    }

    componentDidMount() {
        this.props.room.onStateChange(this.onRoomStateChangedListener)

        this.onRoomStateChanged(this.props.room.state)

        document.getElementById(this.gameMapUID)!
            .appendChild(this.app.view)

        this.subs.push(
            this.app.selectedCellSub.subscribe(this.onSelectCell.bind(this))
        )
    }

    componentWillUnmount() {
        this.props.room.onStateChange.remove(this.onRoomStateChangedListener)
        this.subs.forEach(s => s.unsubscribe())
    }

    onSelectCell(cell: MapCell) {
        if (this.state.matchState && MatchState.isAttackStageFor(this.state.matchState, this.playerTeam)) {
            this.props.room.send('setSelected', MapUtils.getKey(cell.x, cell.y))
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
            console.log('this.playerTeam = ' + this.playerTeam)
            console.log('canSelectTeam = ' + (match.currentTeam == this.playerTeam))

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

    private onMatchChanged(match: MatchState | null) {
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