import { Schema, Types } from "mongoose";
import KVModel from "../models/kv.model";

/**
 * KV Storage System
 * KV sistemi key value şeklinde bir depolamadır.
 * Binary, Text ve Json verileri tutar.
 */
export default class KVService {
  async createKV({
    key,
    value,
    isEncrypted,
    metadata,
    userId,
    encrypted,
    iv,
  }: {
    key: string;
    value: string;
    isEncrypted: boolean;
    metadata: JSON;
    userId: string;
    encrypted?: Schema.Types.Buffer;
    iv?: Schema.Types.Buffer;
  }) {
    const check = await checkExist(key, userId);
    if (check?.error) {
      return check;
    }
    const kv = new KVModel({
      key,
      value,
      isEncrypted,
      encrypted: encrypted || undefined,
      metadata,
      author: userId,
    });
    await kv.save();
    return {
      code: 201,
      message: "KV created successfully",
      error: false,
      data: kv,
    };
  }
  async getAllKV(userId: string) {
    const allKV = await KVModel.find({ author: userId });
    return {
      code: 200,
      message: "KVs retrieved successfully",
      error: false,
      data: allKV,
    };
  }
  async deleteKV(kvId: Types.ObjectId, userId: string) {
    const kv = await KVModel.findById(kvId);
    if (!kv) {
      return {
        code: 404,
        message: "KV not found",
        error: true,
        data: null,
      };
    }

    if (kv.author.toString() !== userId) {
      return {
        code: 403,
        message: "Access denied. You are not the author of this KV.",
        error: true,
        data: null,
      };
    }
    await kv.deleteOne();
    return {
      code: 200,
      message: "KV deleted successfully",
      error: false,
      data: kv,
    };
  }
  async updateKV(
    kvId: string,
    userId: string,
    {
      key,
      value,
      isEncrypted,
      metadata,
      encrypted,
      iv,
    }: {
      key?: string;
      value?: string;
      isEncrypted?: boolean;
      metadata?: JSON;
      encrypted?: Types.Buffer;
      iv?: Types.Buffer;
    }
  ) {
    const kv = await KVModel.findById(kvId);
    if (!kv) {
      return {
        code: 404,
        message: "KV not found",
        error: true,
        data: null,
      };
    }
    const check = await checkExist(key, userId, kvId);
    if (check?.error) {
      return check;
    }
    if (kv.author.toString() !== userId) {
      return {
        code: 403,
        message: "Access denied. You are not the author of this KV.",
        error: true,
        data: null,
      };
    }
    if (key) kv.key = key;
    if (value) kv.value = value;
    if (isEncrypted !== undefined) kv.isEncrypted = isEncrypted;
    if (metadata) kv.metadata = metadata;
    if (encrypted) kv.encrypted = encrypted;
    if (iv) kv.iv = iv;
    await kv.save();
    return {
      code: 200,
      message: "KV updated successfully",
      error: false,
      data: kv,
    };
  }
}

async function checkExist(key?: string, author?: string, excludeId?: string) {
  if (!key || !author) return;
  const check = await KVModel.findOne({ key, author });
  if (check && check._id.toString() !== excludeId) {
    return {
      code: 400,
      message: "You already have a KV with this key",
      error: true,
      data: null,
    };
  }
}
