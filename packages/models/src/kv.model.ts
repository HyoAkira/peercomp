import { model, Schema } from "mongoose";
const kvSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String },
  isEncrypted: { type: Boolean, required: true },
  encrypted: { type: Schema.Types.Buffer },
  iv: { type: Schema.Types.Buffer },
  metadata: {
    namespace: { type: String, required: true },
  },
  author: { type: String, ref: "User", required: true },
  type: { type: String, default: "kv" },
});
kvSchema.index({ key: 1, "metadata.namespace": 1 }, { unique: true });
const KVModel = model("KV", kvSchema);
export default KVModel;
