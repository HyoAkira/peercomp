import "ses";
import {runUserCodeInSES} from "@peercomp/worker"
lockdown({
  errorTaming: "unsafe",
  overrideTaming: "severe",
});

function sanitizeCode(code) {
  if (!code || typeof code !== "string") return "";
  return code.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}
function isPrivateOrInvalidIP(hostname) {
  const host = hostname.toLowerCase().trim();

  // Localhost ve yerel isimler
  if (host === "localhost" || host === "localhost.localdomain") return true;

  // IPv4 Private ve Loopback Aralıkları
  // 127.x.x.x (Loopback)
  // 10.x.x.x (Private)
  // 192.168.x.x (Private)
  // 172.16.0.0 - 172.31.255.255 (Private)
  // 169.254.x.x (Link-Local)
  // 0.0.0.0 (Broadcast)
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^0\.0\.0\.0/.test(host)
  ) {
    return true;
  }

  const match172 = host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
  if (match172) return true;
  if (/^169\.254\./.test(host)) return true;

  // IPv6 Private ve Loopback Aralıkları (::1, fe80::, fc00::, fd00::)
  if (
    host === "::1" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc00:") ||
    host.startsWith("fd00:")
  ) {
    return true;
  }

  return false;
}

// ─── 2. OLAY DİNLEYİCİSİ (MESSAGE EVENT) ──────────────────────────────────
self.addEventListener("message", async (event) => {
  const { args, timeout = 15000 } = event.data;
  const code = sanitizeCode(event.data.code);

  try {
    const result = await runUserCodeInSES(code, args);
    if (!result.success) throw new Error(result.error);
    self.postMessage({
      success: true,
      data: result.data,
    });
  } catch (error) {
    self.postMessage({
      error: error.message || "Unknown error",
    });
  }
});

