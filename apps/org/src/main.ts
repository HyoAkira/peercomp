import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connect } from "mongoose";
import router from "./router";
dotenv.config();
const app = express();

function bootstrap() {
  app.use(express.json());
  app.use(
    cors({
      origin: "*",
    })
  );
  app.use("/api", router);
  app.listen(3000);
  connect(process.env.MONGODB_URI!)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

bootstrap();
