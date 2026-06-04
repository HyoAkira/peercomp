import { model, Schema } from "mongoose";
const kvSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String },
  isEncrypted: { type: Boolean, required: true },
  encrypted: { type: Schema.Types.Buffer },
  iv: { type: Schema.Types.Buffer },
  metadata: Schema.Types.Mixed,
  author: { type: String, ref: "User", required: true },
});

const KVModel = model("KV", kvSchema);
export default KVModel;
