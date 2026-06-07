/**
 * Bu bileşen giriş yapmış kullanıcının fonksiyonlarını alır ve düğümlere kaydeder.
 * Bu sayede aktif kullanıcın fonksiyonları peer içinde dağılır.
 */

import { api } from "@peercomp/config";
import {
  bufferToBase64,
  IdentityKey,
  type SerializedIdentityKey,
} from "@peercomp/encryption/utils";
import { useEffect } from "react";

import {
  useFunctions,
  useIdentityKey,
  useKv,
  usePeerNode,
  useToken,
} from "~/lib/store";

export default function DbToLocalComponent() {
  const keyPair = useIdentityKey((state) => state.keyPair);
  const setKeyPair = useIdentityKey((state) => state.setKeyPair);
  const setKv = useKv((state) => state.setKv);
  const setFunctions = useFunctions((state) => state.setFunctions);
  const token = useToken((state) => state.token);
  const node = usePeerNode((state) => state.peerNode);
  useEffect(() => {
    (async () => {
      if (!token) return;
      const url = `${api.baseURL}${api.apiURL}functions/author/me`;
      const options = {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setFunctions(data.data);
        // save to Dexie
        if (node && keyPair) {
          const owner = await IdentityKey.import(keyPair);

          for (const func of data.data) {
            const ownerPayload = JSON.stringify(func);
            const ownerSigBuf = await owner.sign(ownerPayload);
            const ownerSignature = bufferToBase64(ownerSigBuf);
            const signedValueByOwner = {
              payload: ownerPayload,
              ownerSignature: ownerSignature,
            };
            await node.storeWithSignature(
              func.endpoint,
              signedValueByOwner,
              keyPair.publicKey,
            );
          }
        }
      } catch (error) {
        console.error(error);
      }
    })();

    (async () => {
      const url = `${api.baseURL}${api.apiURL}kv/author/me`;
      const options = {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setKv(data.data);
        // save to Dexie
        if (node && keyPair) {
          const owner = await IdentityKey.import(keyPair);

          for (const kv of data.data) {
            const ownerPayload = JSON.stringify(kv);
            const ownerSigBuf = await owner.sign(ownerPayload);
            const ownerSignature = bufferToBase64(ownerSigBuf);
            const signedValueByOwner = {
              payload: ownerPayload,
              ownerSignature: ownerSignature,
            };
            await node.storeWithSignature(
              kv.key,
              signedValueByOwner,
              keyPair.publicKey,
            );
          }
        }
      } catch (error) {
        console.error("Failed to load key-value pairs:", error);
      }
    })();

    (async () => {
      const url = `${api.baseURL}${api.apiURL}/users/keypair`;
      const options = {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      };

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (
          response.ok &&
          data.data &&
          data.data.publicKey &&
          data.data.privateKey
        ) {
          setKeyPair(data.data as SerializedIdentityKey);
        }
      } catch (error) {
        console.error("Failed to load keypair:", error);
      }
    })();
  }, [token, node]);
  return <></>;
}
