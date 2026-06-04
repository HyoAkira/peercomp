import { NextFunction, Request, Response } from "express";
import KVService from "../services/kv.service";
import { Types } from "mongoose";


class KVController {
  constructor(private kvService: KVService) {}

  async createKV(req: Request, res: Response, next: NextFunction) {
    try {
      const { key, value, isEncrypted, encrypted, iv, metadata } = req.body;
      const userId = req.userId;
      const result = await this.kvService.createKV({
        key,
        value,
        isEncrypted,
        encrypted,
        iv,
        metadata,
        userId,
      });
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllKV(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId;
      const result = await this.kvService.getAllKV(userId);
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteKV(req: Request, res: Response, next: NextFunction) {
    try {
      const kvId = req.params.id;
      const userId = req.userId;
      const result = await this.kvService.deleteKV(kvId, userId);
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateKV(req: Request, res: Response, next: NextFunction) {
    try {
      const kvId = req.params.id;
      const userId = req.userId;
      const { key, value, isEncrypted, encrypted, iv, metadata } = req.body;
      const result = await this.kvService.updateKV(kvId, userId, {
        key,
        value,
        isEncrypted,
        encrypted,
        iv,
        metadata,
      });
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }
}

const kvController = new KVController(new KVService());
export default kvController;
