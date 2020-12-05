import http from "http"
import {Client, Delayed, ServerError} from "colyseus";
import AuthorizedRoom from "./AuthorizedRoom";
import {User} from "../models/User";
import {Match, MatchModel} from "../models/Match";
import {GameMapModel} from "../models/GameMap";
import {ClientInfo, GameRoomState, MatchState, TeamInfo} from "@hexx/common";
import {ServerMatchState} from "./ServerMatchState";
import {ServerGameRoomState} from "./ServerGameRoomState";
import GameService from "../services/GameService";
import {Container} from "typedi";
import {plainToClass} from "class-transformer";
import {NotFoundError} from "routing-controllers";
import Dict = NodeJS.Dict;
import logger from "../init/logger";

class GameRoomOptions {
    id?: string
}

type InnerState = {
    userConnections: Dict<Client>
}

export default class GameRoom extends AuthorizedRoom<ServerGameRoomState> {
    private readonly service: GameService = Container.get(GameService)
    private matchTimeout?: Delayed
    private readonly innerState: InnerState = {
        userConnections: {}
    }

    async onCreate(_opts: any): Promise<any> {
        await this.setPrivate()
        const options = plainToClass(GameRoomOptions, _opts)

        if (options.id) {
            try {
                const room = await this.service.getRoomByID(options.id)
                this.roomId = room._id
            } catch (exc) {
                if (exc instanceof NotFoundError)
                    throw new ServerError(404, 'room not found')
                throw new ServerError(500, 'unexpected error: ' + exc.toString())
            }
        } else {
            try {
                const room = await this.service.createRoom()
                this.roomId = room._id
            } catch (exc) {
                throw new ServerError(500, 'unexpected error: ' + exc.toString())
            }
        }

        this.setState(new ServerGameRoomState({
            match: undefined
        }))

        this.onMessage<number>("setTeam", this.onSetTeam.bind(this))
        this.onMessage('toggleReady', this.onToggleReady.bind(this))
        this.onMessage<string>('setMap', this.onSetMap.bind(this))
        this.onMessage("start", this.onStartGame.bind(this))
        this.initGameControls()
    }

    private initGameControls() {
        this.onMessage("attack", this.onAttack.bind(this))

        this.onMessage("powerUp", this.onPowerUp.bind(this))

        this.onMessage("setSelected", (client, selected: any) => {
            if (selected === null) {
                this.state.match.selectedCellKey = undefined
                return;
            }
            if (typeof selected !== 'string')
                return;
            if (!this.state.match)
                return;
            const participantTeam = this.state.match.participants.get(client.auth._id).team
            if (MatchState.isAttackStageFor(this.state.match, participantTeam)) {
                const cells = this.state.match.mapCells
                if (cells.has(selected) && cells.get(selected).team === participantTeam) {
                    this.state.match.selectedCellKey = selected
                }
            }
        })

        this.onMessage("skip", this.onSkipRound.bind(this))
    }

    async onAuth(client: Client, options: any, request?: http.IncomingMessage): Promise<User> {
        const user = await super.onAuth(client, options, request);

        if (typeof this.innerState.userConnections[user._id] !== 'undefined')
            throw new ServerError(409, 'you are already logged in to this room from another device')

        this.innerState.userConnections[user._id] = client

        return user
    }

    onJoin(client: Client, options?: any, auth?: User): void | Promise<any> {
        // if match is ongoing, set online to true
        // otherwise, add user to the lobby

        if (this.state.match.id) {
            // if user is found in match participants' list, set online to true
            const participants = this.state.match.participants
            if (participants.has(auth._id)) {
                participants.get(auth._id).online = true
            } else {
                // this user is a spectator
                // TODO do something here
            }
        } else {
            // just add use to the lobby
            this.state.clients.set(auth._id, new ClientInfo({
                ready: false,
                username: auth.username,
                team: 0
            }))
            this.state.spectators.push(auth._id)
        }
    }

    onLeave(client: Client, consented?: boolean): void | Promise<any> {
        // remove user from spectators list or from lobby
        const data = this.state.clients[client.auth._id]
        if (data.team == 0) {
            this.state.spectators.splice(this.state.spectators.indexOf(client.auth._id))
        } else {
            const members = this.state.teams[data.team - 1].members
            members.splice(members.indexOf(client.auth._id))
        }

        // remove user from match if user was participating
        if (this.state.match && this.state.match.participants.has(client.auth._id)) {
            // player left
            const pdata = this.state.match.participants.get(client.auth._id)
            pdata.online = false
        }

        // remove user connection
        if (this.innerState.userConnections[client.auth._id] === client)
            delete this.innerState.userConnections[client.auth._id]

        return super.onLeave(client, consented);
    }

    //#region message handlers

    private onSetTeam(client: Client, team: any) {
        if (this.state.inGame)
            return;
        if (typeof team !== 'number' || team < 0 || team > this.state.teams.length)
            return;


        const clientData = this.state.clients.get(client.auth._id)
        const oldTeam = clientData.team
        clientData.team = team

        if (oldTeam === 0) {
            this.state.spectators.splice(this.state.spectators.indexOf(client.auth._id))
        } else {
            const members = this.state.teams[oldTeam - 1].members
            members.splice(members.indexOf(client.auth._id))
            this.state.recalculateTeamReadyValue(oldTeam)
        }
        if (team === 0) {
            this.state.spectators.push(client.auth._id)
        } else {
            this.state.teams[team - 1].members.push(client.auth._id)
            this.state.recalculateTeamReadyValue(team)
        }
    }

    private onToggleReady(client: Client) {
        if (this.state.inGame)
            return;
        const clientData = this.state.clients[client.auth._id]
        if (clientData.team === 0)
            return;

        clientData.ready = !clientData.ready

        this.state.recalculateTeamReadyValue(clientData.team)
    }

    private async onSetMap(client: Client, mapID: any) {
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

    private async onStartGame(client: Client) {
        if (this.state.inGame)
            return;
        if (!this.canStartGame())
            return;


        const teams = this.state.teams.map(t => [...t.members])
        const match = await this.service.createMatch(this.roomId, this.state.selectedMapID, teams)
        const map = await GameMapModel.findById(match.mapId)
        this.state.match = new ServerMatchState(this.state, match, map)
        this.clock.setTimeout(() => {
            this.onNextRoundBegins()
        }, Math.max(+match.startsAt - +new Date(), 1))
    }

    private async onAttack(client: Client, d: any) {
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
        const clientData = this.state.match.participants.get(client.auth._id)
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

    private onPowerUp(client: Client, d: any) {
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

    private async onSkipRound(client: Client) {
        if (!this.state.match)
            return
        const team = this.state.match.participants.get(client.auth._id).team
        if (this.state.match.currentTeam === team) {
            if (this.state.match.endMatchIfHasWinner()) {
                await this.onMatchEnd()
                return
            }

            this.matchTimeout?.clear()
            this.matchTimeout = this.clock.setTimeout(this.onNextRoundBegins.bind(this), 50)
        }
    }

    //#endregion

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

    private async onNextRoundBegins() {
        const match = this.state.match

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