import http from "http"
import {Client, Delayed, ServerError} from "colyseus";
import {MapSchema} from "@colyseus/schema";
import AuthorizedRoom from "./AuthorizedRoom";
import {User} from "../models/User";
import {Match, MatchModel, MAX_VALUE} from "../models/Match";
import {RoomModel} from "../models/Room";
import {GameMap, GameMapModel} from "../models/GameMap";

import {
    ClientInfo,
    DominationState,
    GameRoomState,
    MapCell,
    MapUtils,
    MatchParticipant,
    MatchState,
    MoveDirection,
    TeamInfo
} from "@hexx/common";
import moment from "moment";
import {AttackOutcome, AttackResult, ServerMapCell} from "./MapCell";
import Dict = NodeJS.Dict;
import logger from "../init/logger";

export class ServerMatchState extends MatchState {
    mapCells: MapSchema<ServerMapCell>
    domination: ServerDominationState

    constructor(roomState: GameRoomState, match: Match, map: GameMap) {
        super();
        this.id = match._id
        this.teamsRotation = Array.from(match.teamsRotation)
        this.startsAt = +match.startsAt
        const cells: Dict<ServerMapCell> = {}
        for (let cell of map.cells) {
            const mapCell = new ServerMapCell(cell)
            if (cell.initTeam && !match.teamsRotation.includes(cell.initTeam)) {
                mapCell.team = 0
            }
            cells[MapUtils.getKey(cell.x, cell.y)] = mapCell
        }
        this.domination = new ServerDominationState()
        this.mapCells = new MapSchema<ServerMapCell>(cells)
        this.domination.updateFromCells(this.mapCells)
        for (let player of roomState.clients.values()) {
            if (player.team === 0)
                return;
            this.participants.set(player.dbID, new MatchParticipant({
                dbID: player.dbID,
                username: player.username,
                online: true,
                team: player.team
            }))
        }
    }


    get(x: number, y: number, direction?: MoveDirection): ServerMapCell | undefined {
        if (typeof direction !== 'undefined') {
            const [xOff, yOff] = MapUtils.getOffset(y, direction)
            x += xOff
            y += yOff
        }
        return this.mapCells[y + ':' + x]
    }

    getWinner(): number | null {
        const teamsWithCells = []
        for (let [team, points] of this.domination.teamCells.entries()) {
            if (points > 0 && team !== '0' && !teamsWithCells.includes(+team))
                teamsWithCells.push(+team)
        }
        if (teamsWithCells.length == 1)
            return teamsWithCells[0]
        return null
    }

    performAttack(fromX: number, fromY: number, toX: number, toY: number): boolean {
        const cell = this.get(fromX, fromY)
        if (!cell)
            return false
        const index = MapUtils.getNeighbours(fromX, fromY).findIndex(([x, y]) => x === toX && y === toY)
        if (index < 0 || index > 5)
            return false
        const target = this.get(fromX, fromY, index)
        if (!target)
            return false;
        const result = cell.attack(target)
        if (result) {
            if ((result.outcome == AttackOutcome.Capture || result.outcome == AttackOutcome.Absorb) && target.value > 1) {
                this.selectedCellKey = MapUtils.getKey(target.x, target.y)
            } else if (cell.value < 2) {
                this.selectedCellKey = undefined
            }
            this.domination.updateFromAttackResult(result)
            return true
        }
        return false
    }

    performPowerUp(x: number, y: number, maxOut: boolean) {
        const cell = this.get(x, y)
        if (!cell || cell.team == 0)
            return
        let diff = maxOut ? (cell.maxValue || MAX_VALUE) - cell.value : 1
        diff = Math.min(diff, this.powerPoints)
        this.powerPoints -= diff
        cell.value += diff
        this.domination.updateFromPowerUp(cell.team, diff)
    }

    beginPowerUp() {
        this.selectedCellKey = undefined
        const cellsCount = Array.from(this.mapCells.values())
            .filter(c => c.team == this.currentTeam)
            .length
        this.currentRoundStage = 2
        this.powerPoints = cellsCount
        const duration = cellsCount * this.roundLengthPerCell + this.baseRoundLength
        this.roundStageEndsAt = moment().add(duration, 'seconds').unix() * 1000
    }

    beginAttack() {
        this.currentRoundStage = 1
        const cells = Object.values(this.mapCells)
            .filter(c => c.team == this.currentTeam).length
        const duration = cells * this.roundLengthPerCell + this.baseRoundLength
        this.powerPoints = cells
        this.roundStageEndsAt = moment().add(duration, 'seconds').unix() * 1000
    }

    nextRound() {
        this.currentRound++
        const index = this.teamsRotation.indexOf(this.currentTeam)
        this.currentTeam = index + 1 >= this.teamsRotation.length ? this.teamsRotation[0] : this.teamsRotation[index + 1]
    }

    distributePowerPoints() {
        if (this.powerPoints === 0)
            return;

        let cells = Array.from(this.mapCells.values()).filter(c => c.team === this.currentTeam)
        if (cells.length === 0)
            return;
        const sorting = (a: MapCell, b: MapCell): number => a.value < b.value ? -1 : 0

        do {
            this.powerPoints--
            cells.sort(sorting)
            this.performPowerUp(cells[0].x, cells[0].y, false)
        } while (this.powerPoints > 0)
    }

    endMatchIfHasWinner() {
        if (this.winner)
            return true
        const winner = this.getWinner()
        if (winner !== null) {
            this.winner = winner
            return true
        }
        return false
    }
}

export class ServerGameRoomState extends GameRoomState {
    // NOTE: That is a BAD way to implement custom functions for match state
    // TODO: Use functions instead (like, regular functions not methods)
    // Or move logic to common package, sort of like Meteor does
    match: ServerMatchState | null

    get inGame() { return !!this.match }

    recalculateTeamReadyValue(team: number) {
        this.teams[team - 1].ready = this.teams[team - 1].members.length && this.teams[team - 1].members.every(clientID => {
            return this.clients[clientID].ready
        })
    }
}

export class ServerDominationState extends DominationState {
    updateFromCells(cells: MapSchema<MapCell>) {
        this.teamCells.clear()
        this.teamPoints.clear()
        for (let cell of cells.values()) {
            if (cell.team === 0)
                continue
            if (!this.teamCells.has(cell.team+'')) {
                this.teamCells.set(cell.team+'', 1)
                this.teamPoints.set(cell.team+'', cell.value)
            } else {
                this.teamCells.set(cell.team+'', this.teamCells.get(cell.team+'') + 1)
                this.teamPoints.set(cell.team+'', this.teamPoints.get(cell.team+'') + cell.value)
            }
        }
    }

    updateFromAttackResult(result: AttackResult) {
        let attackerCellsDiff = 0, targetCellsDiff = 0, targetDiff = 0, attackerDiff = 0
        switch (result.outcome) {
            case AttackOutcome.Tie:
                targetDiff = attackerDiff = result.attackerPointsDiff
                break
            case AttackOutcome.Absorb:
                attackerCellsDiff = 1;
                break;
            case AttackOutcome.Capture:
                attackerDiff = result.attackerPointsDiff
                targetDiff = result.targetPointsDiff
                attackerCellsDiff = 1;
                targetCellsDiff = -1;
                break
        }
        this.teamPoints.set(result.targetTeam+'', this.teamPoints.get(result.targetTeam+'') + targetDiff)
        this.teamPoints.set(result.attackerTeam+'', this.teamPoints.get(result.attackerTeam+'') + attackerDiff)

        this.teamCells.set(result.targetTeam+'', this.teamCells.get(result.targetTeam+'') + targetCellsDiff)
        this.teamCells.set(result.attackerTeam+'', this.teamCells.get(result.attackerTeam+'') + attackerCellsDiff)
    }

    updateFromPowerUp(team: number, value: number) {
        this.teamPoints.set(team+'', this.teamPoints.get(team+'') + value)
    }
}

export default class GameRoom extends AuthorizedRoom<ServerGameRoomState> {
    matchTimeout?: Delayed

    onSetTeam(client: Client, team: any) {
        if (this.state.inGame)
            return;
        if (typeof team === 'number') {
            if (team < 0 || team > this.state.teams.length)
                return
            const oldTeam = this.state.clients.get(client.id).team
            this.state.clients.get(client.id).team = team
            if (oldTeam === 0) {
                this.state.spectators.splice(this.state.spectators.indexOf(client.id))
            } else {
                const members = this.state.teams[oldTeam - 1].members
                members.splice(members.indexOf(client.id))
                this.state.recalculateTeamReadyValue(oldTeam)
            }
            if (team === 0) {
                this.state.spectators.push(client.id)
            } else {
                this.state.teams[team - 1].members.push(client.id)
                this.state.recalculateTeamReadyValue(team)
            }
        }
    }

    onToggleReady(client: Client) {
        if (this.state.inGame)
            return;
        const clientData = this.state.clients[client.id]
        if (clientData.team === 0)
            return;

        clientData.ready = !this.state.clients[client.id].ready

        this.state.recalculateTeamReadyValue(clientData.team)
    }

    async onSetMap(client: Client, mapID: any) {
        if (this.state.inGame || typeof mapID !== 'string')
            return;

        const map = await GameMapModel.findById(mapID).exec()
        this.state.selectedMapID = mapID
        if (this.state.teams.length === map.maxTeams)
            return
        if (this.state.teams.length > map.maxTeams) {
            for (let i = map.maxTeams; i < this.state.teams.length; i++) {
                const team = this.state.teams[i]
                this.state.spectators.push(...team.members)
                for (let memberClientID of team.members) {
                    this.state.clients[memberClientID].team = 0
                }
            }
            this.state.teams.splice(map.maxTeams, this.state.teams.length - map.maxTeams)
        } else {
            for (let i = this.state.teams.length; i < map.maxTeams; i++)
                this.state.teams.push(new TeamInfo())
        }
    }

    async onCreate(options: any): Promise<any> {
        const roomID = options.id
        if (typeof roomID !== 'string')
            throw new ServerError(400, 'invalid room options, no room id provided')

        const room = await RoomModel.findById(roomID)
        if (!room)
            throw new ServerError(404, 'no room with id ' + roomID)
        this.setState(new ServerGameRoomState({
            id: roomID,
            match: null,
            gameStartsAt: 0
        }))

        this.onMessage<number>("setTeam", this.onSetTeam.bind(this))
        this.onMessage('toggleReady', this.onToggleReady.bind(this))
        this.onMessage<string>('setMap', this.onSetMap.bind(this))
        this.onMessage("start", this.onStartGame.bind(this))
        this.initGameControls()
        this.broadcast('initialized')
    }

    async onAuth(client: Client, options: any, request?: http.IncomingMessage): Promise<User> {
        const user = await super.onAuth(client, options, request);
        // TODO ???
        return user
    }

    onJoin(client: Client, options?: any, auth?: User): void | Promise<any> {
        let team: number | undefined
        if (this.state.match) {
            if (this.state.match.participants.has(auth._id)) {
                const data = this.state.match.participants.get(auth._id)
                data.online = true
                team = data.team
            }
        }
        this.state.clients[client.id] = new ClientInfo({
            dbID: auth._id,
            username: auth.username,
            team
        })
        this.state.spectators.push(client.id)
    }

    onLeave(client: Client, consented?: boolean): void | Promise<any> {
        const data = this.state.clients[client.id]
        if (data.team == 0) {
            this.state.spectators.splice(this.state.spectators.indexOf(client.id))
        } else {
            const members = this.state.teams[data.team - 1].members
            members.splice(members.indexOf(client.id))
        }

        if (this.state.match && this.state.match.participants.has(client.id)) {
            // player left
            this.state.match.participants.get(client.auth._id).online = false
        }

        delete this.state.clients[client.id]

        return super.onLeave(client, consented);
    }

    async onStartGame(client: Client) {
        if (this.state.inGame)
            return;
        if (!this.canStartGame())
            return;


        const teams = this.state.teams.map(t => t.members.map(clientID => this.state.clients[clientID].dbID))
        const match = await Match.createMatch(this.state.id, this.state.selectedMapID, teams)
        const map = await GameMapModel.findById(match.mapId)
        this.state.match = new ServerMatchState(this.state, match, map)
        this.clock.setTimeout(() => {
            this.onNextRoundBegins()
        }, Math.max(+match.startsAt - +new Date(), 1))
    }

    private canStartGame() {
        let readyTeams = 0;
        for (let i = 0; i < this.state.teams.length; i++) {
            const team = this.state.teams[i]
            if (team.members.length > 0) {
                if (team.ready) {
                    readyTeams++
                } else {
                    return false;
                }
            }
        }
        return readyTeams >= 2;
    }

    async onAttack(client: Client, d: any) {
        if (typeof d !== 'object' || !d)
            return
        const {fromX, fromY, toX, toY} = d;

        if (!this.state.inGame ||
            typeof fromX !== 'number' || fromX < 0 ||
            typeof fromY !== 'number' || fromY < 0 ||
            typeof toX !== 'number' || toX < 0 ||
            typeof toY !== 'number' || toY < 0)
            return

        if (this.state.match.currentRoundStage !== 1)
            return;
        const clientData = this.state.match.participants[client.auth._id]
        if (!clientData || clientData.team === 0 || this.state.match.currentTeam !== clientData.team)
            return;

        if (!this.state.match.performAttack(fromX, fromY, toX, toY)) {
            client.send('invalid_move', d.returnID || null)
            return
        }

        if (this.state.match.endMatchIfHasWinner()) {
            await this.onMatchEnd()
        }
    }

    onPowerUp(client: Client, d: any) {
        if (typeof d !== 'object' || !d)
            return
        const {x, y, max} = d

        if (!this.state.inGame ||
            typeof x !== 'number' || y < 0 ||
            typeof y !== 'number' || y < 0)
            return

        if (this.state.match.currentRoundStage !== 2 || this.state.match.powerPoints === 0)
            return;
        const clientData = this.state.match.participants.get(client.auth._id)
        if (!clientData || clientData.team === 0 || this.state.match.currentTeam !== clientData.team)
            return;

        this.state.match.performPowerUp(x, y, !!max)
    }

    private initGameControls() {
        this.onMessage("attack", this.onAttack.bind(this))

        this.onMessage("powerUp", this.onPowerUp.bind(this))

        this.onMessage("setSelected", (client, message: any) => {
            if (message === null) {
                this.state.match.selectedCellKey = undefined
                return;
            }
            if (typeof message !== 'string')
                return;
            if (!this.state.match)
                return;
            const participantTeam = GameRoomState.getParticipantTeamFromClientID(this.state, client.id)
            if (MatchState.isAttackStageFor(this.state.match, participantTeam)) {
                const cells = this.state.match.mapCells
                if (cells.has(message) && cells.get(message).team === participantTeam) {
                    this.state.match.selectedCellKey = message
                }
            }
        })

        this.onMessage("skip", client => {
            if (!this.state.match)
                return
            const clientData = this.state.clients.get(client.id)
            if (!clientData)
                throw new ServerError(500, 'no client data found')
            const team = MatchState.getParticipantTeam(this.state.match, clientData.dbID)
            if (this.state.match.currentTeam === team) {
                this.onSkipRound()
            }
        })
    }

    private async onSkipRound() {
        if (!this.state.match || this.state.match.winner)
            throw new ServerError(409, 'you can\'t skip round since match does not exists or has already ended')
        if (this.state.match.endMatchIfHasWinner()) {
            await this.onMatchEnd()
            return
        }
        this.matchTimeout?.clear()
        this.state.match.roundStageEndsAt = +new Date() - 1
        this.matchTimeout = this.clock.setTimeout(this.onNextRoundBegins.bind(this), 50)
    }

    private async onNextRoundBegins() {
        const match = this.state.match
        const now = +new Date()
        if (match.roundStageEndsAt && match.roundStageEndsAt - now > 150) {
            this.matchTimeout = this.clock.setTimeout(this.onNextRoundBegins.bind(this), Math.max(0, match.roundStageEndsAt - now))
            return
        }

        logger.debug('Round began')

        if (match.currentRoundStage == 0) {
            logger.debug('Round began 0')
            match.beginAttack()
            match.nextRound()
        } else if (match.currentRoundStage == 1) {
            logger.debug('Round began 1')
            match.beginPowerUp()
        } else if (match.currentRoundStage == 2) {
            logger.debug('Round began 2')
            match.distributePowerPoints()
            match.nextRound()
            match.beginAttack()
        }

        logger.debug('Round began 1')

        if (match.endMatchIfHasWinner()) {
            logger.debug('Match ended in onNextRoundBegins')
            await this.onMatchEnd()
            return;
        }

        const time = this.state.match.roundStageEndsAt - +new Date()
        logger.debug('Next round will start in ' + time + 'ms')
        this.matchTimeout = this.clock.setTimeout(() => {
            this.onNextRoundBegins()
        }, Math.max(0, time))
    }

    private async onMatchEnd() {
        const winner = this.state.match.winner
        this.matchTimeout?.clear()
        this.state.gameStartsAt = 0
        await MatchModel.update({_id: this.state.match.id}, {winner})
        this.broadcast("gameOver", {winner})
    }
}