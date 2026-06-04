import { Router } from "express";

import verifyToken from "../middlewares/auth";
import kvController from "../controller/kv.controller";

const router = Router();

router.post("/create", verifyToken, async (req, res, next) => {
  return await kvController.createKV(req, res, next);
});

router.put("/:id", verifyToken, async (req, res, next) => {
  return await kvController.updateKV(req, res, next);
});

router.delete("/:id", verifyToken, async (req, res, next) => {
  return await kvController.deleteKV(req, res, next);
});

router.get("/author/me", verifyToken, async (req, res, next) => {
  return await kvController.getAllKV(req, res, next);
});
export default router;



