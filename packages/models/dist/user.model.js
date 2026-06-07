"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
function generateNodeId() {
    const bytes = new Uint8Array(32); // 256-bit
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
const userSchema = new mongoose_1.Schema({
    _id: { type: String, default: generateNodeId },
    name: { type: String, required: true },
    surname: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    keypair: {
        publicKey: { type: String, required: false },
        privateKey: { type: String, required: false },
    },
});
const User = (0, mongoose_1.model)("User", userSchema);
exports.default = User;
