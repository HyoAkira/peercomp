import mongoose from "mongoose";
import FunctionModel from "./function.model";
import KVModel from "./kv.model";
import User from "./user.model";
declare const connectDB: (uri: string) => Promise<typeof mongoose | undefined>;
export { connectDB, FunctionModel, KVModel, User };
//# sourceMappingURL=index.d.ts.map