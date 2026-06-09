import { IdentityKey } from "@peercomp/encryption/utils";
import { connectDB, FunctionModel } from "@peercomp/models";

import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { Worker } from "worker_threads";
import { GatewayNode } from "./node";

dotenv.config();

const domain = "peercomp.com.tr";

const app = express();
const node = new GatewayNode();

app.use(express.json());

function subdomains(req: Request, res: Response, next: Function) {
  const host = req.headers.host?.split(":")[0];

  if (host && host.includes(domain)) {
    req.subdomain = host.split(".")[0];
  }

  next();
}

app.use(subdomains);

app.all("/", async (req: Request, res: Response) => {
  try {
    const key = req.subdomain;
    const args = req.body?.args || [];
    const method = req.method;
    const publicKeyForTargetNamespace = req.headers["x-targetnamespace"] as
      | string
      | undefined;
    const result = await handleRequest(
      key,
      args,
      method,
      publicKeyForTargetNamespace,
    );

    if (!result) {
      return res.status(404).json({
        code: 404,
        message: "Function not found",
        error: true,
        data: null,
      });
    }
    return res.json(result);
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error?.message || "Internal server error",
      error: true,
      data: null,
    });
  }
});

async function bootstrap() {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      "mongodb://[REDACTED_LOCAL_DEV_USER]:[REDACTED_LOCAL_DEV_PASSWORD]@localhost:27017/peercomp?authSource=admin";

    await connectDB(mongoUri);
    console.log("MongoDB connected");

    await node.start();
    await node.bootstrap();

    app.listen(3001, () => {
      console.log("Server running on :3001");
    });
  } catch (err) {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  }
}

bootstrap();

async function handleRequest(
  key: string,
  args: string[],
  method: string,
  publicKeyForTargetNamespace: string,
) {
  try {
    const result = await node.call_function(
      key,
      args,
      method,
      publicKeyForTargetNamespace,
    );
    return {
      code: 200,
      message: "OK",
      error: false,
      data: result,
    };
  } catch (e) {
    console.log(`Error calling function ${key} via node:`, e);
    try {
      if (!publicKeyForTargetNamespace) {
        throw new Error(
          "Public key for target namespace is required for FUNCTION-CALL",
        );
      }
      const targetNamespace = await IdentityKey.calculateNamespace(
        publicKeyForTargetNamespace,
      );

      const funcData: FunctionModelType = await FunctionModel.findOne({
        endpoint: key,
        method: method,
        "metadata.namespace": targetNamespace,
      });

      if (!funcData) {
        throw new Error("Function not found");
      }
      function sanitizeCode(code) {
        if (!code || typeof code !== "string") return "";

        return (
          code
            // 1. Windows satır sonlarını (\r\n) standart Unix satır sonuna (\n) çevirir
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")

            // 2. Kodun en başındaki ve en sonundaki gereksiz tüm boş satırları/boşlukları temizler
            .trim()
        );
      }
      function wrapCode(code: string): string {
        code = sanitizeCode(code);
        return `(async () => {\n${code}\n})()`;
      }

      // executeInWorker'a göndermeden önce:
      const wrappedCode = wrapCode(funcData.code);

      const output = await executeInWorker(sanitizeCode(funcData.code), args,funcData.kvPermission);

      return {
        code: 200,
        message: "OK",
        error: false,
        data: output.data,
        system: true,
      };
    } catch (e: any) {
      console.log(`Error executing function ${key}:`, e);
      return {
        code: 500,
        message: e?.message || "Unknown error",
        error: true,
        data: null,
      };
    }
  }
}

function executeInWorker(code: string, args: any, kvPermission): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.mjs", import.meta.url), {
      eval: false,
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Execution timeout"));
    }, 15000);

    worker.on("message", (res) => {
      clearTimeout(timeout);
      worker.terminate();

      if (!res.success) {
        reject(new Error(res.error ?? "Unknown worker error"));
      } else {
        resolve(res);
      }
    });

    worker.on("error", (err) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(err);
    });

    worker.postMessage({ code, args });
  });
}
