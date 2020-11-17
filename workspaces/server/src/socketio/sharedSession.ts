import {Socket} from "socket.io";
import http from "http";
import Application from "koa";
import {Session} from "koa-session";
import {User, UserModel} from "../models/User";
import Dict = NodeJS.Dict;
import moment from "moment";

type SocketData = Dict<any> & {
    user?: User
    state: AppState
    session: Session
    query: Dict<any>
    __lastUserFetchTime?: moment.Moment
}

export function getData(socket: Socket): SocketData {
    return (socket as any).data
}

export function putData(data: Partial<SocketData>, socket: Socket) {
    const d = getData(socket);
    (socket as any).data = {...data, ...d}
}


type AppState = {
    user?: User
} & Dict<any>

export function getState(socket: Socket): AppState {
    return (socket as any).state
}

export function getStoredUser(socket: Socket): User | undefined {
    const state = getState(socket)
    if (state)
        return state.user
}

export async function getUser(socket: Socket): Promise<User | undefined> {
    const d = getData(socket)
    if (moment().diff(d.__lastUserFetchTime, "seconds") > 15) {
        d.user = await UserModel.findById(d.user._id).exec()
        if (!d.user) {
            throw new Error("User suddenly disappeared, where did you user? Get back!")
        }
    }
    return d.user
}

export function getQuery(socket: Socket): Dict<any> {
    return (socket as any).query
}

export default function sharedSession(app: Application): (socket: Socket, next: (err?: any) => void) => void {
    return (socket, next) => {
        let error = null;
        try {
            // create a new (fake) Koa context to decrypt the session cookie
            let ctx = app.createContext(socket.request, new http.ServerResponse(socket.request));
            const data: SocketData = {
                user: ctx.state.user,
                session: ctx.session,
                state: ctx.state,
                query: ctx.query,
                __lastUserFetchTime: moment()
            }
            putData(data, socket)
        } catch (err) {
            error = err;
        }
        return next(error);
    }
}