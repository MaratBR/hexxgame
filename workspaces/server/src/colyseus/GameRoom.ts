import AuthorizedRoom from "./AuthorizedRoom";
import http from "http"
import {Client, Delayed, ServerError} from "colyseus";
import {User} from "../models/User";
import {Room, RoomModel} from "../models/Room";
import {Schema, MapSchema, ArraySchema, type} from "@colyseus/schema";
import {GameMap, GameMapModel} from "../models/GameMap";
import {IGameLobbyState, IMatchState, MapUtils, MoveDirection} from "@hexx/common";
import {Match, MatchModel, MAX_VALUE} from "../models/Match";
import {ClientInfo} from "./ClientInfo";
import {TeamInfo} from "./TeamInfo";
import {DominationState} from "./DominationState";
import {AttackOutcome, MapCell} from "./MapCell";
import Dict = NodeJS.Dict;
import moment from "moment";

export class MatchState extends Schema implements IMatchState {
    @type('number')
    baseRoundLength: number = 20

    @type('number')
    roundLengthPerCell: number = 5

    @type('number')
    roundLengthPerPoint: number = 1.5

    @type('number')
    currentRound: number = 0;

    @type('number')
    currentRoundStage: number = 0;

    @type('string')
    id: string;

    @type({map: MapCell})
    mapCells: MapSchema<MapCell>;

    @type('number')
    roundStageEndsAt: number;

    @type('number')
    startsAt: number;

    @type(['number'])
    teamsRotation: number[];

    @type('number')
    currentTeam: number = 0

    @type('number')
    powerPoints: number = 0;

    @type(DominationState)
    domination: DominationState

    constructor(match: Match, map: GameMap) {
        super();
        this.id = match._id
        this.teamsRotation = Array.from(match.teamsRotation)
        this.startsAt = +match.startsAt
        const cells: Dict<MapCell> = {}
        for (let cell of map.cells) {
            const mapCell = new MapCell(cell)
            if (cell.initTeam && !match.teamsRotation.includes(cell.initTeam)) {
                mapCell.team = 0
            }
            cells[MapUtils.getKey()] = mapCell
        }
        this.domination = new DominationState(cells)
        this.mapCells = new MapSchema<MapCell>(cells)
    }


    get(x: number, y: number, direction?: MoveDirection): MapCell | undefined {
        if (typeof direction !== 'undefined') {
            const [xOff, yOff] = MapUtils.getOffset(x, direction)
            x += xOff
            y += yOff
        }
        return this.mapCells[y + ':' + x]
    }

    getWinner(): number | null {
        const teamsWithCells = []
        for (let team in this.domination.teamCells) {
            if (!this.domination.teamCells.hasOwnProperty(team))
                continue
            if (this.domination.teamCells[team] > 0)
                teamsWithCells.push(team)
        }
        if (teamsWithCells.length == 1)
            return teamsWithCells[0]
        return null
    }

    performAttack(fromX: number, fromY: number, direction: MoveDirection) {
        const cell = this.get(fromX, fromY)
        if (!cell)
            return
        const target = this.get(fromX, fromY, direction)
        if (!target)
            return;
        const result = cell.attack(target)
        if (result) {
            if (result.outcome == AttackOutcome.Absorb) {
                this.domination.teamCells[result.attackerTeam] += result.attackerPointsDiff
            } else {
                this.domination.teamCells[result.attackerTeam] += result.attackerPointsDiff
                this.domination.teamCells[result.targetTeam] += result.targetPointsDiff
            }
        }
    }

    performPowerUp(x: number, y: number, maxOut: boolean) {
        const cell = this.get(x, y)
        if (!cell || cell.team == 0)
            return
        let diff = maxOut ? (cell.maxValue || MAX_VALUE) - cell.value : 1
        diff = Math.min(diff, this.powerPoints)
        this.powerPoints -= diff
        cell.value += diff
        this.domination.teamCells[cell.team] += diff
    }

    beginPowerUp() {
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
            cells.sort(sorting)
            cells[0].value += 1
        } while (--this.powerPoints)
    }
}

export class GameRoomState extends Schema implements IGameLobbyState {
    @type('string')
    id?: string;

    @type('string')
    selectedMapID?: string

    @type({map: ClientInfo})
    clients: MapSchema<ClientInfo> = new MapSchema<ClientInfo>()

    @type(['string'])
    spectators: ArraySchema<string> = new ArraySchema<string>()

    @type([TeamInfo])
    teams: ArraySchema<TeamInfo> = new ArraySchema<TeamInfo>()

    @type('number')
    gameStartsAt: number

    @type(MatchState)
    match: MatchState | null

    get inGame() { return !!this.match }

    recalculateTeamReadyValue(team: number) {
        this.teams[team - 1].ready = this.teams[team - 1].members.length && this.teams[team - 1].members.every(clientID => {
            return this.clients[clientID].ready
        })
    }
}

export default class GameRoom extends AuthorizedRoom<GameRoomState> {
    matchTimeout?: Delayed

    private async getRoom(): Promise<Room> {
        return RoomModel.findById(this.state.id);
    }

    async onCreate(options: any): Promise<any> {
        const roomID = options.id
        if (typeof roomID !== 'string')
            throw new ServerError(400, 'invalid room options, no room id provided')

        const room = await RoomModel.findById(roomID)
        if (!room)
            throw new ServerError(404, 'no room with id ' + roomID)
        this.setState(new GameRoomState({
            id: roomID,
            match: null,
            gameStartsAt: 0
        }))

        this.onMessage<number>("setTeam", (client, team) => {
            if (this.state.inGame)
                return;
            if (typeof team === 'number') {
                if (team < 0 || team > this.state.teams.length)
                    return
                const oldTeam = this.state.clients[client.id].team
                this.state.clients[client.id].team = team
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
        })

        this.onMessage('toggleReady', client => {
            if (this.state.inGame)
                return;
            const clientData = this.state.clients[client.id]
            if (clientData.team === 0)
                return;

            clientData.ready = !this.state.clients[client.id].ready

            this.state.recalculateTeamReadyValue(clientData.team)
        })

        this.onMessage<string>('setMap', async (client, mapID) => {
            if (this.state.inGame)
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

        })

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
        this.state.clients[client.id] = new ClientInfo({
            dbID: auth._id,
            username: auth.username
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
        this.state.match = new MatchState(match, map)
        this.broadcast('gameStarts', {
            matchID: match._id,
            startsAt: +match.startsAt
        })
        this.clock.setTimeout(() => {
            this.beginRound()
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

    private initGameControls() {
        this.onMessage("attack", async (client, d) => {
            if (typeof d !== 'object' || !d)
                return
            const {fromX, fromY, direction} = d;

            if (!this.state.inGame ||
                typeof fromX !== 'number' || fromX < 0 ||
                typeof fromY !== 'number' || fromY < 0 ||
                typeof direction !== 'number' ||
                direction < 0 ||
                direction > 5)
                return

            if (this.state.match.currentRoundStage !== 1)
                return;
            const clientData = this.state.clients[client.id]
            if (!clientData || clientData.team === 0 || this.state.match.currentTeam == clientData.team)
                return;

            this.state.match.performAttack(fromX, fromY, direction)

            const winner = this.state.match.getWinner()
            if (winner !== null) {
                this.onMatchEnd(winner)
                return;
            }
        })

        this.onMessage("powerUp", async (client, d) => {
            if (typeof d !== 'object' || !d)
                return
            const {x, y, max} = d

            if (!this.state.inGame ||
                typeof x !== 'number' || y < 0 ||
                typeof y !== 'number' || y < 0)
                return

            if (this.state.match.currentRoundStage !== 2 || this.state.match.powerPoints === 0)
                return;
            const clientData = this.state.clients[client.id]
            if (!clientData || clientData.team === 0 || this.state.match.currentTeam == clientData.team)
                return;

            this.state.match.performPowerUp(x, y, !!max)
        })
    }

    private beginRound() {
        const match = this.state.match
        const now = +new Date()
        if (match.roundStageEndsAt && match.roundStageEndsAt - now > 150) {
            this.clock.setTimeout(this.beginRound.bind(this), Math.max(0, match.roundStageEndsAt - now))
            return
        }

        if (match.currentRoundStage == 0) {
            match.beginAttack()
            match.nextRound()
        } else if (match.currentRoundStage == 1) {
            match.beginPowerUp()
        } else if (match.currentRoundStage == 2) {
            match.distributePowerPoints()
            match.nextRound()
            match.beginAttack()
        }

        this.matchTimeout = this.clock.setTimeout(() => {
            this.beginRound()
        }, Math.max(0, this.state.match.roundStageEndsAt - +new Date()))
    }

    private async onMatchEnd(winner: number) {
        this.matchTimeout.clear()
        this.state.gameStartsAt = 0
        await MatchModel.update({_id: this.state.match.id}, {winner})

        this.state.match = null
        this.broadcast("gameOver", {winner})
    }
}