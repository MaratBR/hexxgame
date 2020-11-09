import {getModelForClass, prop} from "@typegoose/typegoose";
import exp = require("constants");
import {Base, IDBase} from "./base";
import Hasher from "../misc/hash";
import {nanoid} from "nanoid";
import {nanoid as nanoidAsync} from "nanoid/async";

export interface GameSession {
    matchId?: string;
    online?: boolean
}

export class User extends Base{
    @prop({minlength: 1, maxlength: 50, required: true})
    username: string;

    @prop()
    anonToken?: string;

    @prop()
    passwordHash?: string;

    @prop({default: () => new Date()})
    createdAt?: Date;

    @prop({default: false})
    isAnon?: boolean;

    @prop()
    uaMD5?: string

    @prop()
    personalRoomId?: string

    @prop()
    gameSession?: GameSession;
}

export async function generateUserIdAsync(isAnon: boolean = false) {
    return (isAnon ? 'A' : 'U') + '.' + await nanoidAsync()
}


export const UserModel = getModelForClass(User)

export type UserInfoDto = {
    username: string,
    isAnon?: boolean,
    id: string
}

export function userInfo(user: User) {
    return <UserInfoDto>{
        username: user.username,
        isAnon: user.isAnon,
        id: user._id as string
    }
}