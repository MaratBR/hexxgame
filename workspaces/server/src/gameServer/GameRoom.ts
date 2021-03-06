import http from "http"
import {Client, Delayed, ServerError} from "colyseus";
import AuthorizedRoom from "./AuthorizedRoom";
import {emptyMovesStats, User} from "../models/User";
import {Match, MatchModel} from "../models/Match";
import {GameMapModel} from "../models/GameMap";
import {ClientInfo, MapUtils, MatchState, MovesStats, RoundHistory, TeamInfo} from "@hexx/common";
import {ServerMatchState} from "./ServerMatchState";
import {ServerGameRoomState} from "./ServerGameRoomState";
import GameService from "../services/GameService";
import {Container} from "typedi";
import {plainToClass} from "class-transformer";
import {NotFoundError} from "routing-controllers";
import Dict = NodeJS.Dict;
import logger from "../init/logger";
import {AttackOutcome} from "./MapCell";

class GameRoomOptions {
    id?: string
}

type InnerState = {
    userConnections: Dict<Client>
    currentMatch: {
        roundHistoryRecord: RoundHistory
        roundStartedAt: number
        playersMoves: Dict<MovesStats>
    }
}

const roundRecord = (stage: number, team: number) => <RoundHistory>{attacks: [], powerUps: [], team, stage}

export default class GameRoom extends AuthorizedRoom<ServerGameRoomState> {
    private readonly service: GameService = Container.get(GameService)
    private matchTimeout?: Delayed
    private winnerTimeout?: Delayed
    private readonly innerState: InnerState = {
        userConnections: {},
        currentMatch: {
            roundStartedAt: 0,
            roundHistoryRecord: roundRecord(0, 0),
            playersMoves: {}
        },
    }

    async onCreate(_opts: any): Promise<any> {
        await this.setPrivate()
        const options = plainToClass(GameRoomOptions, _opts)

        if (options.id) {
            if (await this.service.roomExists(options.id))
                throw new ServerError(409, 'this room already exists')
            this.roomId = options.id
        } else {
            this.roomId = await this.service.generateRoomId()
        }

        this.setState(new ServerGameRoomState({
            match: undefined
        }))

        this.onMessage<number>("setTeam", this.onSetTeam.bind(this))
        this.onMessage('toggleReady', this.onToggleReady.bind(this))
        this.onMessage<string>('setMap', this.onSetMap.bind(this))
        this.onMessage("start", this.onMatchStart.bind(this))
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

        const clientInfo = new ClientInfo({
            ready: false,
            username: auth.username,
            team: 0
        })

        if (this.state.inGame) {
            // if user is found in match participants' list, set online to true
            const participants = this.state.match.participants
            if (participants.has(auth._id)) {
                const pData = participants.get(auth._id)
                clientInfo.ready = true
                clientInfo.team = pData.team
                const onlineParticipants = Array.from(this.state.match.participants.values()).filter(p => p.online)
                const onlineTeams = new Set(onlineParticipants.map(p => p.team))
                if (onlineTeams.size === 1 && pData.team !== onlineTeams[0]) {
                    this.winnerTimeout?.clear()
                    this.winnerTimeout = undefined
                }
                pData.online = true
            } else {
                // this user is a spectator
                // TODO do something here

            }
        } else {
            // just add user to the spectators list
            this.state.spectators.push(auth._id)
        }

        this.state.clients.set(auth._id, clientInfo)
    }

    onLeave(client: Client, consented?: boolean): void | Promise<any> {
        // remove user from spectators list or from lobby
        const data = this.state.clients[client.auth._id]
        if (data.team == 0) {
            const index = this.state.spectators.indexOf(client.auth._id)
            if (index !== -1)
                this.state.spectators.splice(index, 1)
        } else {
            const members = this.state.teams[data.team - 1].members
            const index = members.indexOf(client.auth._id)
            if (index !== -1)
                    members.splice(index, 1)
        }

        // remove user from match if user was participating
        if (this.state.inGame && this.state.match.participants.has(client.auth._id)) {
            // player left
            const pdata = this.state.match.participants.get(client.auth._id)
            pdata.online = false


            // if there's only one team left, make them winners
            const onlineParticipants = Array.from(this.state.match.participants.values()).filter(p => p.online)
            const onlineTeams = new Set(onlineParticipants.map(p => p.team))
            if (onlineTeams.size === 1) {
                // one team left, make them winner in 10 seconds
                this.winnerTimeout = this.clock.setTimeout(async () => {
                    this.state.match.setWinner(onlineTeams.values().next().value)
                    await this.onMatchEnd()
                }, 10000)
            }
        }

        // remove user connection
        if (this.innerState.userConnections[client.auth._id] === client)
            delete this.innerState.userConnections[client.auth._id]

        this.state.clients.delete(client.auth._id)

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
            this.state.spectators.splice(this.state.spectators.indexOf(client.auth._id), 1)
        } else {
            const members = this.state.teams[oldTeam - 1].members
            members.splice(members.indexOf(client.auth._id), 1)
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

    private async onMatchStart() {
        if (this.state.inGame)
            return;
        if (!this.canStartGame())
            return;


        // create match object and init inner state
        const teams = this.state.teams.map(t => [...t.members])

        // create new match and match history
        const match = await this.service.createMatch(this.roomId, this.state.selectedMapID, teams)
        await this.service.createMatchHistory(match)

        // find map with given id
        const map = await GameMapModel.findById(match.mapId)

        // reset inner state
        this.resetMatchInnerData()
        for (let players of teams)
            for (let playerID of players)
                this.innerState.currentMatch.playersMoves[playerID] = emptyMovesStats()

        // prepare initial state
        this.state.match = new ServerMatchState(this.state, match, map)
        this.state.teams.forEach(team => {
            team.members.forEach(memberID => {
                this.state.clients.get(memberID).ready = false
            })
        })

        this.broadcast('gameStarts')
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

        const attackResult = this.state.match.performAttack(fromX, fromY, toX, toY)
        if (!attackResult) {
            client.send('invalid_move', d.returnID || null)
            return
        } else {
            this.innerState.currentMatch.roundHistoryRecord.attacks.push({
                fromX, fromY, toX, toY,
                attackerPoints: this.state.match.get(fromX, fromY).value,
                targetPoints: this.state.match.get(toX, toY).value,
            })
            const stats = this.innerState.currentMatch.playersMoves[client.auth._id]
            stats.total++
            switch (attackResult.outcome) {
                case AttackOutcome.Tie:
                    stats.tie++
                    break
                case AttackOutcome.Capture:
                    stats.capture++
                    break
                case AttackOutcome.Absorb:
                    stats.absorb++
                    break
                case AttackOutcome.Suicide:
                    stats.suicide++
                    break
            }
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

        const match = this.state.requireMatch()
        const clientData = match.participants.get(client.auth._id)
        if (!clientData || clientData.team === 0 || this.state.match.currentTeam !== clientData.team)
            return;

        if (match.mapCells.get(MapUtils.getKey(x, y)).team !== clientData.team)
            return;
        const points = this.state.match.performPowerUp(x, y, !!max)
        this.innerState.currentMatch.roundHistoryRecord.powerUps.push({
            x, y, points
        })
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

        if (match.currentRoundStage !== 0) {
            await this.submitRoundRecord()
        }
        logger.debug('Round began')

        if (match.currentRoundStage == 0) {
            logger.debug('Round began 0')
            match.beginAttack()
            match.nextRound()
            this.innerState.currentMatch.roundHistoryRecord = roundRecord(1, match.currentTeam)
        } else {
            // if current stage was not 0, it means it was not the first round and we need to
            // collect round history
            await this.submitRoundRecord()

            if (match.currentRoundStage == 1) {
                logger.debug('Round began 1')
                match.beginPowerUp()
            } else if (match.currentRoundStage == 2) {
                logger.debug('Round began 2')
                match.distributePowerPoints()
                match.nextRound()
                match.beginAttack()
            }
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

    private async submitRoundRecord() {
        if (this.innerState.currentMatch.roundHistoryRecord) {
            try {
                await this.service.addRoundData(this.state.match.id, this.innerState.currentMatch.roundHistoryRecord)
            } catch (e) {
                // we'll just log it and do nothing, this error is not THAT bad
                logger.error(e)
            }
            this.resetRoundRecord()
        }
    }

    private async submitPlayersStats() {
        await this.service.submitMatchPlayersStats(
            this.state.requireMatch().id,
            this.state.requireMatch(),
            this.innerState.currentMatch.playersMoves)
    }

    private resetRoundRecord() {
        this.innerState.currentMatch.roundHistoryRecord =
            roundRecord(this.state.match.currentRoundStage, this.state.match.currentTeam)
    }

    private resetMatchInnerData() {
        this.innerState.currentMatch = {
            roundHistoryRecord: roundRecord(0, 0),
            roundStartedAt: 0,
            playersMoves: {}
        }
    }

    private async onMatchEnd() {
        await this.submitRoundRecord()
        await this.submitPlayersStats()
        const winner = this.state.match.winner
        this.matchTimeout?.clear()
        this.state.gameStartsAt = 0
        this.state.teams.forEach((_, index) => this.state.recalculateTeamReadyValue(index + 1))
        await MatchModel.update({_id: this.state.match.id}, {winner})
        this.broadcast("gameOver", {winner})
    }
}