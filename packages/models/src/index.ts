import mongoose from "mongoose";
import FunctionModel, { type FunctionModelType } from "./function.model";
import KVModel from "./kv.model";
import User from "./user.model";

const connectDB = async (uri: string) => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(uri);
};

export { connectDB, FunctionModel, KVModel, User };
export type { FunctionModelType };
