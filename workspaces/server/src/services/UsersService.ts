import {Service} from "typedi";
import {GameSession, User, UserModel} from "../models/User";
import {BaseRequest} from "koa";
import {Profile} from "passport-google-oauth20";
import {NotFoundError} from "routing-controllers";

@Service()
export default class UsersService {
    async getUser(id: string): Promise<User> {
        const user = await UserModel.findById(id)
        if (!user)
            throw new NotFoundError('user not found')
        return user
    }

    getGameSession(id: string): Promise<GameSession | null> {
        return UserModel.findOne({id}).select('gameSession').exec().then(u => u ? u.gameSession : null)
    }

    async updateUser(id: string, data: Partial<User>): Promise<void> {
        await UserModel.update({_id: id}, data)
    }

    async loginAsAnon(req: BaseRequest): Promise<User | null> {
        return await UserModel.create(User.anon())
    }

    findUserByLogin(login: string): Promise<User | null> {
        return this.findUserByUsername(login)
    }

    async getGoogleUserOrCreate(profile: Profile): Promise<User> {
        const user = await UserModel.findOne({googleId: profile.id})
        if (user)
            return user
        return await this.createGoogleUser(profile)
    }

    findUserByUsername(username: string): Promise<User | null> {
        return UserModel.findOne({username}).exec()
    }

    async createGoogleUser(profile: Profile): Promise<User> {
        return UserModel.create(User.googleUser(profile))
    }
}