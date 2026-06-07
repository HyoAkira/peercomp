export async function runUserCodeInSES(userCode, args) {
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
