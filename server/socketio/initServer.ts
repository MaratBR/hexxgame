import {Server, Socket} from "socket.io";
import {initSocket} from "./initSocket";
import {getStoredUser} from "./sharedSession";


export default async function initServer(server: Server) {
    server.on('connection', async (socket: Socket) => {
        const user = getStoredUser(socket)
        if (!user) {
            socket.emit('app_error', {t: 'unauthorized'})
            socket.disconnect(true)
            return
        }

        await initSocket(socket)
    })
}