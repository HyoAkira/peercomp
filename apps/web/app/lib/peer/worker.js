import "ses";
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


async function runUserCodeInSES(userCode, args) {
  const secureFetch = harden(async (url, options) => {
    const isPrivateOrInvalid = isPrivateOrInvalidIP(new URL(url).hostname);
    if (isPrivateOrInvalid) {
      throw new Error("Access to private or invalid IP addresses is blocked");
    }
    const response = await fetch(url, options);
    return harden({
      ok: response.ok,
      status: response.status,
      json: harden(async () => {
        const data = await response.json();
        return harden(data);
      }),
      text: harden(async () => await response.text()),
    });
  });

  const compartment = new Compartment({
    // globals: {
    //   console: harden({ log: console.log, error: console.error })
    // }
  });

  try {
    // fetch fonksiyonunu SES'e parametre olarak geçebilmek için
    // compartment içinde gizli bir "çalıştırıcı (runner)" fonksiyon oluşturuyoruz.
    // Bu runner, bizim secureFetch'imizi alacak ve kullanıcının kodunun en başına enjekte edecek!
    const runner = compartment.evaluate(`
      harden(async (customFetch, customArgs) => {
        
                const blockAPI = {
          get() { throw new Error("SecurityError: Access denied to this API in sandbox environment."); },
          set() { throw new Error("SecurityError: Access denied to this API in sandbox environment."); },
          enumerable: false,
          configurable: false
        };
 Object.defineProperties(globalThis, {
          WebSocket: blockAPI,
          RTCPeerConnection: blockAPI,
          localStorage: blockAPI,
          indexedDB: blockAPI,
          window: blockAPI,
          document: blockAPI,
          args: {
            value: customArgs,
            writable: false,
            enumerable: true,
            configurable: false
          }
        });
        return await (async () => {
          const fetch = customFetch;
          
          ${userCode}
        })();
      });
    `);

    const finalResult = await runner(secureFetch, harden(args));

    return {
      success: true,
      data: finalResult,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
