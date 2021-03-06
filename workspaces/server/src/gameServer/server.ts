import {Server} from "colyseus";
import http from "http";
import Tokens from "../auth/tokens";
import MatchLobbyRoom from "./GameRoom";

export default function getColyseus(server: http.Server) {
    const gameServer = new Server({
        server,
        verifyClient: async (info, callback) => {
            callback(true)
        }
    })

    gameServer.define('gameLobby', MatchLobbyRoom)
    //gameServer.simulateLatency(160)

    return gameServer
}