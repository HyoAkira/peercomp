/**
 * Bu bileşen giriş yapmış kullanıcının fonksiyonlarını alır ve düğümlere kaydeder.
 * Bu sayede aktif kullanıcın fonksiyonları peer içinde dağılır.
 */

import { api } from "@peercomp/config";
import type { SerializedIdentityKey } from "@peercomp/encryption/utils";
import { useEffect } from "react";


import {
  useFunctions,
  useIdentityKey,
  usePeerNode,
  useToken,
} from "~/lib/store";

export default function DbToLocalComponent() {
  const keyPair = useIdentityKey((state) => state.keyPair);
  const setKeyPair = useIdentityKey((state) => state.setKeyPair);

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
        setFunctions(data.data);
        // save to Dexie
        if (node) {
          for (const func of data.data) {
            func.type = "function";

            await node.store(func.endpoint, func);
          }
        }
      } catch (error) {
        console.error(error);
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
