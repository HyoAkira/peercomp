"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.KVModel = exports.FunctionModel = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const function_model_1 = __importDefault(require("./function.model"));
exports.FunctionModel = function_model_1.default;
const kv_model_1 = __importDefault(require("./kv.model"));
exports.KVModel = kv_model_1.default;
const user_model_1 = __importDefault(require("./user.model"));
exports.User = user_model_1.default;
const connectDB = async (uri) => {
    if (mongoose_1.default.connection.readyState >= 1)
        return;
    return mongoose_1.default.connect(uri);
};
exports.connectDB = connectDB;
