import { Schema } from "mongoose";
declare const User: import("mongoose").Model<{
    _id: string;
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
    role: "admin" | "user";
    keypair?: {
        publicKey?: string | null | undefined;
        privateKey?: string | null | undefined;
    } | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    _id: string;
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
    role: "admin" | "user";
    keypair?: {
        publicKey?: string | null | undefined;
        privateKey?: string | null | undefined;
    } | null | undefined;
}, {}, import("mongoose").DefaultSchemaOptions> & {
    _id: string;
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
    role: "admin" | "user";
    keypair?: {
        publicKey?: string | null | undefined;
        privateKey?: string | null | undefined;
    } | null | undefined;
} & Required<{
    _id: string;
}> & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    _id: string;
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
    role: "admin" | "user";
    keypair?: {
        publicKey?: string | null | undefined;
        privateKey?: string | null | undefined;
    } | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    _id: string;
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
    role: "admin" | "user";
    keypair?: {
        publicKey?: string | null | undefined;
        privateKey?: string | null | undefined;
    } | null | undefined;
}>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<{
    _id: string;
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
    role: "admin" | "user";
    keypair?: {
        publicKey?: string | null | undefined;
        privateKey?: string | null | undefined;
    } | null | undefined;
}> & Required<{
    _id: string;
}> & {
    __v: number;
}>>;
export default User;
//# sourceMappingURL=user.model.d.ts.map