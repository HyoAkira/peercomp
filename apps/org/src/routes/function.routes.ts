import { Router } from "express";
import UserController from "../controller/user.controller";
import functionController from "../controller/function.controller";
import verifyToken from "../middlewares/auth";

const router = Router();

router.post("/create", verifyToken, async (req, res, next) => {
  return await functionController.createFunction(req, res, next);
});

router.get("/:id", verifyToken, async (req, res, next) => {
  return await functionController.readFunction(req, res, next);
});

router.put("/:id", verifyToken, async (req, res, next) => {
  return await functionController.updateFunction(req, res, next);
});

router.delete("/:id", verifyToken, async (req, res, next) => {
  return await functionController.deleteFunction(req, res, next);
});

router.get("/author/me", verifyToken, async (req, res, next) => {
  return await functionController.getFunctionsByAuthor(req, res, next);
});

export default router;
