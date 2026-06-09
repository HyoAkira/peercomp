import { InferSchemaType, Schema } from "mongoose";
declare const functionSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<{
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
declare const FunctionModel: import("mongoose").Model<{
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}, {}, import("mongoose").DefaultSchemaOptions> & {
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<{
    name: string;
    type: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata?: {
        namespace: string;
    } | null | undefined;
    kvPermission?: {
        enabled: boolean;
        allowedKeys: string[];
        expiresAt?: NativeDate | null | undefined;
        delegationToken?: {
            allowedKeys: string[];
            expiresAt?: number | null | undefined;
            delegatePublicKey?: string | null | undefined;
            ownerSignature?: string | null | undefined;
        } | null | undefined;
        functionIdentity?: {
            publicKey?: string | null | undefined;
            privateKey?: string | null | undefined;
        } | null | undefined;
    } | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
type FunctionModelType = InferSchemaType<typeof functionSchema>;
export default FunctionModel;
export type { FunctionModelType };
//# sourceMappingURL=function.model.d.ts.map