import {Socket} from "socket.io";
import {MatchModel} from "../models/match";
import {MatchExecutor} from "./MatchExecutor";
import {User} from "../models/user";

export default async function initSocket(socket: Socket, executor: MatchExecutor) {
    socket.join('match ' + executor.storedMatch._id)

    const user: User = socket.state.user
    const userTeam = executor.storedMatch.participants.find(members => members.id == user._id).team

    socket.emit('state', {
        state: (await executor.loadMatch()).state
    })

    socket.on("disconnect", () => {
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