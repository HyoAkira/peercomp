import { Router } from "express";
import UserController from "../controller/user.controller";

const router = Router();

router.post("/create", async (req, res,next) => {
return await UserController.createUser(req, res, next);
});

router.post("/login", async (req, res, next) => {
    return await UserController.login(req, res, next);
});

router.get("/verify", async (req, res, next) => {
        return await UserController.verifyToken(req, res, next);
});

export default router;