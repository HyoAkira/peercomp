import { decrypt, encrypt, generateIdentityKey, generateSharedKey } from "./utils"

export enum EventType {
  CREATE_IDENTITY = "create-identity",
  GENERATE_SHARED_KEY = "generate-shared-key",
  ENCRYPT_DATA = "encrypt-data",
  DECRYPT_DATA = "decrypt-data",
}
export interface IEventData {
  type: EventType;
  payload: {
    // identity için boş, shared key için { publicKey, identityPrivateKey }, encrypt/decrypt için { sharedKey, data, dataType }
    publicKey?: CryptoKey;
    identityPrivateKey?: CryptoKey;
    sharedKey?: CryptoKey;
    data?: string | ArrayBuffer;
    dataType: "string" | "image";
    iv?: Uint8Array;
  };
}

export type returnMessageType =
  | { type: "identity-created"; payload: CryptoKeyPair }
  | { type: "shared-key-generated"; payload: JsonWebKey }
  | { type: "data-encrypted"; payload: { encrypted: ArrayBuffer; iv: Uint8Array } }
  | { type: "data-decrypted"; payload: ArrayBuffer };
globalThis.onmessage = async (event) => {
  const { type, payload }: IEventData = event.data;
  try {
    switch (type) {
      case "create-identity": {
        const identity = await generateIdentityKey();
        // const exportedIdentity = await crypto.subtle.exportKey(
        //   "jwk",
        //   identity.privateKey
        // );
        self.postMessage({
          type: "identity-created",
          payload: identity,
        });
        break;
      }
      case "generate-shared-key": {
        const { publicKey, identityPrivateKey } = payload;
        const sharedKey = await generateSharedKey(
          publicKey,
          identityPrivateKey
        );
        const exportedSharedKey = await crypto.subtle.exportKey("jwk", sharedKey);
        self.postMessage({
          type: "shared-key-generated",
          payload: exportedSharedKey,
        });
        break;
      }
      case "encrypt-data": {
        const { sharedKey, data, dataType } = payload;
        const encryptedData = await encrypt(
          sharedKey,
          data,
          dataType
        );
        self.postMessage({
          type: "data-encrypted",
          payload: encryptedData,
        });
        break;
      }
      case "decrypt-data": {
        const { sharedKey, data, iv } = payload;
        const decryptedData = await decrypt(
          sharedKey,
          data,
          iv
        );
        self.postMessage({
          type: "data-decrypted",
          payload: decryptedData,
        });
        break;
      }
    }
  } catch (error) {
    console.error("Error in crypto web worker:", error);
  }
};
