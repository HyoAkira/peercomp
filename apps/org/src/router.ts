import { Router } from "express";
import userRoutes from "./routes/user.routes";
import functionRoutes from "./routes/function.routes";
import kvRoutes from "./routes/kv.routes";
const router = Router();

router.use("/users/", userRoutes);
router.use("/functions/", functionRoutes);
router.use("/kv/", kvRoutes);

export default router;
