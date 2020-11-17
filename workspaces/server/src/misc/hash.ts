import bcrypt from "bcrypt"


export default class Hasher {
    public static async hash(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10)
        return await bcrypt.hash(password, salt)
    }

    public static verify(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}