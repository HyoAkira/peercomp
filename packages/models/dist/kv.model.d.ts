import { Schema } from "mongoose";
declare const KVModel: import("mongoose").Model<{
    type: string;
    author: string;
    key: string;
    isEncrypted: boolean;
    metadata?: {
        namespace: string;
    } | null | undefined;
    value?: string | null | undefined;
    encrypted?: Buffer<ArrayBufferLike> | null | undefined;
    iv?: Buffer<ArrayBufferLike> | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    type: string;
    author: string;
    key: string;
    isEncrypted: boolean;
    metadata?: {
        namespace: string;
    } | null | undefined;
    value?: string | null | undefined;
    encrypted?: Buffer<ArrayBufferLike> | null | undefined;
    iv?: Buffer<ArrayBufferLike> | null | undefined;
}, {}, import("mongoose").DefaultSchemaOptions> & {
    type: string;
    author: string;
    key: string;
    isEncrypted: boolean;
    metadata?: {
        namespace: string;
    } | null | undefined;
    value?: string | null | undefined;
    encrypted?: Buffer<ArrayBufferLike> | null | undefined;
    iv?: Buffer<ArrayBufferLike> | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    type: string;
    author: string;
    key: string;
    isEncrypted: boolean;
    metadata?: {
        namespace: string;
    } | null | undefined;
    value?: string | null | undefined;
    encrypted?: Buffer<ArrayBufferLike> | null | undefined;
    iv?: Buffer<ArrayBufferLike> | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    type: string;
    author: string;
    key: string;
    isEncrypted: boolean;
    metadata?: {
        namespace: string;
    } | null | undefined;
    value?: string | null | undefined;
    encrypted?: Buffer<ArrayBufferLike> | null | undefined;
    iv?: Buffer<ArrayBufferLike> | null | undefined;
}>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<{
    type: string;
    author: string;
    key: string;
    isEncrypted: boolean;
    metadata?: {
        namespace: string;
    } | null | undefined;
    value?: string | null | undefined;
    encrypted?: Buffer<ArrayBufferLike> | null | undefined;
    iv?: Buffer<ArrayBufferLike> | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
export default KVModel;
//# sourceMappingURL=kv.model.d.ts.map