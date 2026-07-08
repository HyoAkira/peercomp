import { IdentityKey } from "@peercomp/encryption/utils";

export class KvSdk {
  constructor(sys, kvPermission) {
    this.sys = sys;
    this.kvPermission = kvPermission;
  }

  // Dinleyiciyi ekler ve dinleyiciyi kaldıracak bir temizleme fonksiyonu döndürür
  _addMessageListener(callback) {
    if (typeof this.sys.addEventListener === "function") {
      this.sys.addEventListener("message", callback);
      return () => this.sys.removeEventListener("message", callback);
    } else if (typeof this.sys.on === "function") {
      this.sys.on("message", callback);
      // Node.js'de off veya removeListener kullanılır
      return () => {
        if (typeof this.sys.off === "function")
          this.sys.off("message", callback);
        else if (typeof this.sys.removeListener === "function")
          this.sys.removeListener("message", callback);
      };
    } else {
      throw new Error(
        "Sistem nesnesi (sys) desteklenen bir mesaj dinleyiciye sahip değil.",
      );
    }
  }

  _postMessage(payload) {
    if (typeof this.sys.postMessage === "function") {
      this.sys.postMessage(payload);
    } else if (typeof this.sys.send === "function") {
      this.sys.send(payload);
    } else {
      throw new Error(
        "Sistem nesnesi (sys) mesaj gönderme metoduna sahip değil.",
      );
    }
  }

  async calculateAddress(key, signature) {
    console.log("worker-signature", signature)
    const namespace = await IdentityKey.calculateNamespace(signature);
    return `${namespace}:kv:${key}`;
  }

  async get(key) {
    
    if (!this.kvPermission?.ownerPublicKey) {
      throw new Error(
        "KV get failed: ownerPublicKey is missing from kvPermission. " +
        "Lütfen fonksiyonu yeniden kaydedin.",
      );
    }
    const actualKey = await this.calculateAddress(
      key,
      this.kvPermission.ownerPublicKey,
    );

    const reqId = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);

    return new Promise((resolve, reject) => {
      let removeListener;

      const listener = (eventOrMessage) => {
        const payload =
          eventOrMessage.data !== undefined
            ? eventOrMessage.data
            : eventOrMessage;

        // Yanıtın bu spesifik isteğe (reqId) ait olduğundan emin ol
        if (
          payload &&
          payload.type === "STORAGE_GET_RESPONSE" &&
          payload.reqId === reqId
        ) {
          removeListener();

          if (payload.error) {
            reject(new Error(payload.error));
          } else {
            resolve(payload.data.value);
          }
        }
      };

      removeListener = this._addMessageListener(listener);

      this._postMessage({
        type: "STORAGE_GET_REQUEST",
        reqId: reqId, // Request ID'yi gönderiyoruz, alıcı servisin bunu geri dönmesi gerekir!
        data: {
          kvPermission: this.kvPermission,
          key: actualKey,
        },
      });
    });
  }
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
export async function runUserCodeInSES(sys, userCode, args, kvPermission) {
  const secureFetch = harden(async (url, options) => {
    // isPrivateOrInvalidIP metodunun bir yerlerde tanımlı olduğunu varsayıyoruz
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

  // Kullanıcı koduna doğrudan tüm sınıfı geçmek yerine, sadece kullanmasını
  // istediğimiz metodları içeren güvenli bir arayüz hazırlıyoruz (Güvenlik için iyi bir pratiktir)
  const kvInstance = new KvSdk(sys, kvPermission);
  const safeKv = harden({
    get: async (key) => await kvInstance.get(key),
    // ileride set, delete gibi metodları da buraya ekleyebilirsin
  });

  const compartment = new Compartment();

  try {
    // runner içerisine customKv adında üçüncü bir parametre ekledik
    const runner = compartment.evaluate(`
      harden(async (customFetch, customArgs, customKv) => {
        
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
          },
          // KV OBJESİNİ GLOBAL OLARAK EKLİYORUZ
          kv: {
            value: customKv,
            writable: false,
            enumerable: true,
            configurable: false
          }
        });

        return await (async () => {
          const fetch = customFetch;
          // Artık kullanıcı kodunda kv.get("...") yazılabilir.
          ${userCode}
        })();
      });
    `);

    // safeKv'yi runner'a paslıyoruz
    const finalResult = await runner(secureFetch, harden(args), safeKv);

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
