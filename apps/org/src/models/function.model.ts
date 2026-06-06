import { model, Schema } from "mongoose";

const functionSchema = new Schema({
  name: { type: String, required: true },
  endpoint: { type: String, required: true },
  method: { type: String, enum: ["GET", "POST"], required: true },
  code: { type: String, required: true },
  author: { type: String, ref: "User", required: true },
  type: { type: String, default: "function" },
  metadata: { type: Schema.Types.Mixed, default: {} },
});
functionSchema.index({ endpoint: 1, method: 1 }, { unique: true });

const FunctionModel = model("Function", functionSchema);
export default FunctionModel;
