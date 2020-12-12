import {Service} from "typedi";
import {GameSession, generateUserIdAsync, User, UserModel} from "../models/User";
import {BaseRequest} from "koa";
import {Profile} from "passport-google-oauth20";

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
        console.log(profile)
        return await UserModel.create({
            _id: await generateUserIdAsync(),
            googleId: profile.id,
            username: profile.displayName,
            isAnon: false
        })
    }

    private static NAMES = [
        'Eagle', 'Sheep', 'Rabbit', 'Dolphin', 'Lion', 'Mule', 'Rooster', 'Dingo', 'Chamois', 'Deer', 'Turtle',
        'Parrot', 'Cow', 'Hamster', 'Bear', 'Ox', 'Chinchilla', 'Raccoon', 'Snake', 'Buffalo', 'Pony', 'Zebra',
        'Opossum'
    ]

    private static ADJECTIVES = [
        'Dangerous', 'Suspicious', 'Recurring', 'Kind', 'Evil', 'Crazy', 'Lovely', 'Sentimental', 'Friendly', 'Silent',
        'Opaque', 'Exiled', 'Happy', 'Sad', 'Graceful', 'Wealthy', 'Romantic', 'Humble', 'Forgetful', 'Cute', 'Energetic',
        'Nervous', 'Lazy', 'Worried', 'Jealous', 'Thoughtless', 'Unbearable', 'Ultimate', 'Fancy', 'Lively', 'Wicked'
    ]

    private static generateRandomAnonymousName(): string {
        return UsersService.ADJECTIVES[Math.floor(Math.random() * UsersService.ADJECTIVES.length)] + ' ' +
            UsersService.NAMES[Math.floor(Math.random() * UsersService.NAMES.length)]

    }
}