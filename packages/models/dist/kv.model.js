"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const kvSchema = new mongoose_1.Schema({
    key: { type: String, required: true },
    value: { type: String },
    isEncrypted: { type: Boolean, required: true },
    encrypted: { type: mongoose_1.Schema.Types.Buffer },
    iv: { type: mongoose_1.Schema.Types.Buffer },
    metadata: {
        namespace: { type: String, required: true },
    },
    author: { type: String, ref: "User", required: true },
    type: { type: String, default: "kv" },
});
kvSchema.index({ key: 1, "metadata.namespace": 1 }, { unique: true });
const KVModel = (0, mongoose_1.model)("KV", kvSchema);
exports.default = KVModel;
