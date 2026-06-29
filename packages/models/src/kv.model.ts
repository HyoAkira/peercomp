import { model, Schema } from "mongoose";
const kvSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String },
  isEncrypted: { type: Boolean, required: true },
  iv: { type: String },
  metadata: {
    namespace: { type: String, required: true },
    encryptedKey: { type: String },
    keyIv: { type: String },
  },
  author: { type: String, ref: "User", required: true },
  type: { type: String, default: "kv" },
});
kvSchema.index({ key: 1, "metadata.namespace": 1 }, { unique: true });
const KVModel = model("KV", kvSchema);
export default KVModel;
