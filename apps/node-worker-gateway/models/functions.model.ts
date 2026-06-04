import mongoose from "mongoose";

const functionSchema = new mongoose.Schema({
  name: { type: String, required: true },

  endpoint: {
    type: String,
    required: true,
  },

  method: {
    type: String,
    enum: ["GET", "POST"],
    required: true,
  },

  code: { type: String, required: true },

  author: {
    type: String,
    ref: "User",
    required: true,
  },

  type: {
    type: String,
    default: "function",
  },
});

// endpoint + method birlikte unique
functionSchema.index({ endpoint: 1, method: 1 }, { unique: true });

const FunctionModel = mongoose.model("Function", functionSchema);

export default FunctionModel;
