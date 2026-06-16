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
  async (msg) => {
    if (msg.type !== "EXECUTE") return;
    const { code, args, timeout = 15000, kvPermission } = msg;
    try {
      const result = await runUserCodeInSES(parentPort, code, args, kvPermission, true);
    
      if (!result.success) throw new Error(result.error);
      parentPort.postMessage({
        type: "RESULT",
        success: true,
        data: result.data,
      });
    } catch (error) {
      parentPort.postMessage({
        type: "RESULT",
        error: error.message || "Unknown error",
      });
    }
  },
);
