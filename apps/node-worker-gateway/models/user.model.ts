import { model, Schema } from "mongoose";
function generateNodeId(): string {
  const bytes = new Uint8Array(32); // 256-bit
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
const userSchema = new Schema({
  _id: { type: String, default: generateNodeId },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
});

const User = model("User", userSchema);
export default User;
