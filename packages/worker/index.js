import { IdentityKey } from "@peercomp/encryption/utils";

function handler(type, payload) {
  let output;
  switch (type) {
    case "STORAGE_GET_RESPONSE": {
      output = payload.value;
      break;
    }
  }
  return output;
}
export async function runUserCodeInSES(
  sys,
  userCode,
  args,
  kvPermission,
  system = false,
) {
  if (system) {
    sys.on("message", (e) => {
      handler(e.data.type, e.data);
    });
  } else {
    sys.addEventListener("message", (e) => {
      handler(e.data.type, e.data);
    });
  }

  sys.postMessage({
    type: "STORAGE_GET_REQUEST",
    success: true,
    data: {
      kvPermission,
      key: "29852d9765538f1686096ce6bd14ac96d2ab01dac811deaea1ff621b1332d342:kv:users/1",
    },
  });
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

export class KvSdk {
  constructor(node) {
    this.node = node;
  }
  async calculateAddress(key, signature) {
    const namespace = await IdentityKey.calculateNamespace(signature);
    const actualKey = `${namespace}:kv:${key}`;
    return actualKey;
  }
  async get(key) {
    return await this.node.findValue(key);
  }
  async set(key, value, signature) {
    const calculatedKey = await this.calculateAddress(key, signature);
    await this.node.storeWithSignature(calculatedKey, value, signature);
  }
  async delete(key) {
    await this.node.kv.delete(key);
  }
}
