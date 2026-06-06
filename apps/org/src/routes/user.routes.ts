import { Router } from "express";
import UserController from "../controller/user.controller";
import verifyToken from "../middlewares/auth";

const router = Router();

router.post("/create", async (req, res, next) => {
  return await UserController.createUser(req, res, next);
});

router.post("/login", async (req, res, next) => {
  return await UserController.login(req, res, next);
});
router.get("/me", verifyToken, async (req, res, next) => {
  return await UserController.getUserById(req, res, next);
});

router.get("/verify", async (req, res, next) => {
  return await UserController.verifyToken(req, res, next);
});

router.post("/change-password", verifyToken, async (req, res, next) => {
  return await UserController.changePassword(req, res, next);
});
router.post("/update-profile", verifyToken, async (req, res, next) => {
  return await UserController.updateProfile(req, res, next);
});

export default router;
