import {Socket} from "socket.io";
import {getStoredUser, getUser} from "./sharedSession";
import {Room, RoomModel} from "../models/Room";
import executorHub from "./executor";
import {Container} from "typedi";
import GameService from "../services/GameService";
import RoomService from "../services/RoomService";
import {Namespace} from "socket.io/dist/namespace";
import moment from "moment";

export async function initSocket(socket: Socket) {

    try {
        await onGameSocketStartUp(socket)
    } catch (e) {
        socket.disconnect(true)
        return
    }

    const broadcastToRoom = (e, d) => socket.broadcast.to(room.getSocketIORoomName()).emit(e, d)

    socket.on('leave', async () => {
        const user = await getUser(socket)
        const room = await user.getRoom()
        broadcastToRoom('user_left', user.toPlayerInfo())
        // remove user from room and match so that he can't join back as player
        socket.disconnect(true)
        await room.removePlayer(user._id)
    })

    socket.on('set_team', async team => {
        if (typeof team !== 'number' || team < 0)
            return
        const user = await getUser(socket)
        const room = await user.getRoom()
        if (room.ongoingMatchId || !room.players || room.players.length <= team)
            return
        if (await room.setUserTeam(user._id, team)) {
            socket.broadcast
                .to(room.getSocketIORoomName())
                .emit('team_changed', {id: user._id, team})
        }
    })

    socket.on('chat_message', async message => {
        if (typeof message !== 'string')
            return

        const user = await getUser(socket)
        if (message.length > 3000)
            return;
        message = message.trim()
        if (message.length == 0)
            return

        const room = await user.getRoom()
        socket.broadcast
            .to(room.getSocketIORoomName())
            .emit('chat', {id: user._id, name: user.username, text: message})
    })

    socket.on('powerup', async ({index, max}) => {
        if (typeof index !== 'number')
            return
        max = !!max
        const user = await getUser(socket)
        const room = await user.getRoom()
        if (room.ongoingMatchId) {
            const executor = executorHub.getLocalExecutorOrNull(room.ongoingMatchId)
            if (executor.canPower(user)) {

            }
            if (match.state.team == room.getUserTeam(user._id)) {

            }
        }
    })
}

async function onGameSocketStartUp(socket: Socket): Promise<void> {
    const user = await getUser(socket)
    if (user.inRoom()) {
        if (await Room.exists(user.getRoomID())) {

            const room = await RoomModel.findById(user.getRoomID())

            // TODO add check if user can join room (i.e. if room is public etc)

            if (room.ongoingMatchId) {
                // if room currently has ongoing match, then we have to decide whether user can join or not

                if (room.hasPlayer(user)) {
                    // user can join
                    const match = await room.getOngoingMatch()

                    if (user.getMatchID() !== room.ongoingMatchId) {
                        // Just in Case™
                        await user.setMatch(match)
                    }

                    socket.join(match.getSocketIORoomName())

                } else {
                    // user is in the room, but match is already over
                    // TODO make user a spectator
                    // just disconnect for now
                    if (user.getMatchID()) {
                        await user.removeMatch()
                    }

                    throw new Error('user is not listed as player')
                }
            }

            socket.join(room.getSocketIORoomName())
            socket.broadcast
                .to(room.getSocketIORoomName())
                .emit('user_join', user.toPlayerInfo())
            return true

        } else {
            await user.removeRoom()
            if (user.getMatchID())
                await user.removeMatch()
        }
    } else {
        socket.emit('app_error', {t: 'no_room'})
    }

    throw new Error('user is not in the game room')
}


export async function initRoomSocket(socket: Socket, room: Room) {
    socket.join('R ' + room._id)
    const user = getStoredUser(socket)
    if (room.ongoingMatchId) {
        if (user.gameSession.matchId === room.ongoingMatchId) {
            // rejoin the match
            initMatchSocket(socket, )
        } else {
            // user is not in the match but in the room
            // let's assume they are spectating
            // TODO Implement spectating ¯\_(ツ)_/¯
            socket.emit('app_error', {t: 'spectating_is_not_implemented_because_hes_lazy', match: matchId})
            socket.disconnect(true)
            return
        }
    }
}


export function initMatchSocket(socket: Socket, matchId: string) {
    const executor = executorHub.getLocalExecutorOrNull(matchId)

    if (!executor) {
        // executor does not exist, but match is marked as ongoing
        // TODO Implement cluster support via redis or whatever
        socket.emit('app_error', {t: 'no_match_executor', match: matchId})
        socket.disconnect(true)
        return
    }

    const user = getStoredUser(socket)
    const userTeam = executor.storedMatch.participants.find(p => p.id == user._id)?.team

    if (!userTeam) {
        // spectating
        // TODO implement that (again)
        socket.emit('app_error', {t: 'spectating_is_not_implemented_because_hes_lazy', match: matchId})
        socket.disconnect(true)
        return;
    }

    socket.on("disconnect", () => {
        executor.onUserLeave(user._id)
    })

    socket.on('power', async ({index, max}) => {
        if (userTeam == executor.currentTeam && executor.isPowerStage &&
            executor.roundStage == 2 && typeof index == 'number') {
            await executor.powerCell(index, !!max)
        }
    })

    socket.on('move', async ({fromIndex, toIndex}) => {
        const cells = executor.storedMatch.state.cells
        if (typeof fromIndex !== 'number' || typeof toIndex !== 'number' || fromIndex < 0 ||
            toIndex < 0 || fromIndex >= cells.length || toIndex >= cells.length ||
            executor.currentTeam == userTeam && executor.isMoveStage) {
            return
        }
        if (executor.currentTeam == userTeam && executor.isMoveStage) {
            await executor.attemptAttack(fromIndex, toIndex)
        }
    })

    socket.on('skip', () => {
        if (executor.currentTeam == userTeam) {
            executor.skipRound()
        }
    })

    socket.on('get_state', async () => {
        socket.emit('state', {
            state: (await executor.loadMatch()).state
        })
    })
}