import {Service} from "typedi";
import {GameSession, generateUserIdAsync, User, UserModel} from "../models/user";
import {BaseRequest} from "koa";

@Service()
export default class UsersService {
    getUser(id: string): Promise<User | null> {
        return UserModel.findById(id).exec()
    }

    getGameSession(id: string): Promise<GameSession | null> {
        return UserModel.findOne({id}).select('gameSession').exec().then(u => u ? u.gameSession : null)
    }

    async updateUser(id: string, data: Partial<User>): Promise<void> {
        await UserModel.update({_id: id}, data)
    }

    async loginAsAnon(req: BaseRequest): Promise<User | null> {
        return await UserModel.create({
            _id: await generateUserIdAsync(true),
            username: UsersService.generateRandomAnonymousName(),
            isAnon: true
        })
    }

    findUserByLogin(login: string): Promise<User | null> {
        return this.findUserByUsername(login)
    }

    findUserByUsername(username: string): Promise<User | null> {
        return UserModel.findOne({username}).exec()
    }

    private static NAMES = ['Eagle', 'Sheep', 'Rabbit', 'Dolphin', 'Lion']

    private static generateRandomAnonymousName(): string {
        return 'Anonymous ' + UsersService.NAMES[Math.floor(Math.random() * UsersService.NAMES.length)]
    }
}