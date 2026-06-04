import { compare, genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
class UserService {

   async createUser({name, surname, username, email, password}: {name: string, surname: string, username: string, email: string, password: string}) {
        const saltRounds = 10;
        const salt = await genSalt(saltRounds);
        const hashedPassword = await hash(password, salt);
        const user = new User({name, surname, username, email, password: hashedPassword});
        await user.save();
        const userLogin = await this.login({email, password});
        const token = userLogin.data!.token;
        return {
            code: 201,
            message: "User created successfully",
            error: false,
            data: { token }
        };
    }

    async login({email, password}: {email: string, password: string}) {
        const user = await User.findOne({email});
        if (!user) {
            return {
                code: 404,
                message: "User not found",
                error: true,
                data: null
            };
        }
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
            return {
                code: 401,
                message: "Invalid password",
                error: true,
                data: null
            };
        }
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWTSECRET!, { expiresIn: "7d" });
        return {
            code: 200,
            message: "Login successful",
            error: false,
            data: { token }
        };
}

async verifyToken(token: string) {
   const verify =  jwt.verify(token, process.env.JWTSECRET!);
    return verify;
}
}

export default UserService;