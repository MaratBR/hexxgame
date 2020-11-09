import {Server} from "socket.io";
import initMatchSocket from "./initSocket";
import {User} from "../models/user";
import {Container} from "typedi";
import GameService from "../services/GameService";
import {MatchExecutor} from "./MatchExecutor";


export default async function initServer(server: Server) {
    server.on('connection', async (socket) => {
        if (!socket.state.user) {
            socket.emit('app_error', {t: 'unauthorized'})
            socket.disconnect(true)
            return
        }

        const user: User = socket.state.user

        if (socket.query.matchId !== user.gameSession.matchId) {
            socket.emit('app_error', {t: 'no_match'})
            socket.disconnect(true)
            return
        }

        const gameService = Container.get(GameService)
        let executor: MatchExecutor | null
        if (!(executor = gameService.getLocalExecutorOrNull(socket.query.matchId))) {
            // TODO: send user the address of the node he/she needs to connect to
            socket.emit('app_error', {t: 'no_executor'})
            socket.disconnect(true)
            return
        }

        await initMatchSocket(socket, executor)
    })
}