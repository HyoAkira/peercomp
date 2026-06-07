import "ses";
import {runUserCodeInSES} from "@peercomp/worker"
import { parentPort } from "worker_threads";
lockdown({
  errorTaming: "unsafe",
  overrideTaming: "severe",
});
// ─── YARDIMCI: PRIVATE IP VE PROTOKOL KONTROLÜ (SSRF KORUMASI) ────────────────


parentPort.on("message", async ({ code, args, timeout = 15000 }) => {
  try {
    const result = await runUserCodeInSES(code, args);
    if(!result.success) throw new Error(result.error);
    parentPort.postMessage({
      success: true,
      data: result.data,
    });
  } catch (error) {
    parentPort.postMessage({
      error: error.message || "Unknown error",
    });
  }
});


