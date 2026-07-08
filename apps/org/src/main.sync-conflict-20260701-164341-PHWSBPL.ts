import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "@peercomp/models";
import router from "./router";
dotenv.config();
const app = express();

function bootstrap() {
  app.use(express.json());
  app.use(
    cors({
      origin: "*",
    }),
  );
  app.use("/api", router);
  app.listen(3000);

  connectDB(process.env.MONGODB_URI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB", err);
    });
}

bootstrap();
