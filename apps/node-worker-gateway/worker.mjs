import { runUserCodeInSES } from "@peercomp/worker";
import "ses";
import { parentPort } from "worker_threads";
lockdown({
  errorTaming: "unsafe",
  overrideTaming: "severe",
});
// ─── YARDIMCI: PRIVATE IP VE PROTOKOL KONTROLÜ (SSRF KORUMASI) ────────────────

parentPort.on(
  "message",
  async ({ code, args, timeout = 15000, kvPermission }) => {
    try {
      const result = await runUserCodeInSES(parentPort, code, args, kvPermission, true);
    
      if (!result.success) throw new Error(result.error);
      parentPort.postMessage({
        success: true,
        data: result.data,
      });
    } catch (error) {
      parentPort.postMessage({
        error: error.message || "Unknown error",
      });
    }
  },
);
