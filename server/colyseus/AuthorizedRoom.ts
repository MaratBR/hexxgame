import {Client, Room, ServerError} from "colyseus";
import http from "http"
import Tokens from "../auth/tokens";
import {User} from "../models/User";

export default class AuthorizedRoom<S = any, M = any> extends Room<S, M> {
    async onAuth(client: Client, options: any, request?: http.IncomingMessage) {
        if (typeof options.accessToken == 'string') {
            let user: User
            try {
                user = await Tokens.getUserFromToken(options.accessToken)
            } catch (e) {
                throw new ServerError(400, 'bad access token')
            }
            if (user === null)
                throw new ServerError(500, 'user not found')
            return user
        }
        throw new ServerError(401, 'no token provided')
    }
}