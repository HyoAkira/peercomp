import { model, Schema } from "mongoose";

const functionSchema = new Schema({
  name: { type: String, required: true },
  endpoint: { type: String, required: true },
  method: { type: String, enum: ["GET", "POST"], required: true },
  code: { type: String, required: true },
  author: { type: String, ref: "User", required: true },
  type: { type: String, default: "function" },
  metadata: {
    namespace: { type: String, required: true },
  },
  kvPermission: {
    enabled: { type: Boolean, default: false },
    allowedKeys: [{ type: String }],
    expiresAt: { type: Date },
    delegationToken: {
      delegatePublicKey: { type: String },
      allowedKeys: [{ type: String }],
      expiresAt: { type: Number },
      ownerSignature: { type: String },
    },
    functionIdentity: {
      publicKey: { type: String },
      privateKey: { type: String },
    },
  },
});

// DÜZELTME: İç içe alanlar için nokta notasyonu (dot notation) kullanılmalı
functionSchema.index(
  { endpoint: 1, method: 1, "metadata.namespace": 1 },
  { unique: true },
);

const FunctionModel = model("Function", functionSchema);
export default FunctionModel;
