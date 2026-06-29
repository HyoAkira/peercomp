import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { KademliaNode } from "~/lib/peer/peer-node";
import type { SerializedIdentityKey, SerializedECDHKey } from "@peercomp/encryption/utils";
type TokenStore = {
  token: string;
  setToken: (token: string) => void;
};
const useToken = create<TokenStore>()(
  persist(
    (set) => ({
      token: "",
      setToken: (token: string | null) => set({ token }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

type IdentityKeyStore = {
  keyPair: SerializedIdentityKey | null;
  setKeyPair: (keyPair: SerializedIdentityKey | null) => void;
  ecdhKeyPair: SerializedECDHKey | null;
  setEcdhKeyPair: (ecdhKeyPair: SerializedECDHKey | null) => void;
};

const useIdentityKey = create<IdentityKeyStore>()(
  persist(
    (set) => ({
      keyPair: null as SerializedIdentityKey | null,
      setKeyPair: (keyPair: SerializedIdentityKey | null) => set({ keyPair }),
      ecdhKeyPair: null as SerializedECDHKey | null,
      setEcdhKeyPair: (ecdhKeyPair: SerializedECDHKey | null) => set({ ecdhKeyPair }),
    }),
    {
      name: "identity-key-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

type FunctionItem = Readonly<{
  _id: string;
  name: string;
  method: string;
  code: string;
  endpoint: string;
  type?: string;
  metadata?: { namespace?: string };
  kvPermission?: {
    enabled: boolean;
    allowedKeys: string[];
    expiresAt: number | string;
    delegationToken?: {
      delegatePublicKey: string;
      allowedKeys: string[];
      expiresAt: number;
      ownerSignature: string;
    };
    functionIdentity?: { publicKey: string; privateKey: string };
  } | null;
}>;

const useFunctions = create<{
  functions: Array<FunctionItem>;
  setFunctions: (functions: Array<FunctionItem>) => void;
}>((set) => ({
  functions: [] as Array<FunctionItem>,
  setFunctions: (functions: Array<FunctionItem>) => set({ functions }),
}));

type AlertStore = {
  alertMsg: string;
  setAlertMsg: (msg: string) => void;
};

const useAlertMsg = create<AlertStore>()((set) => ({
  alertMsg: "",
  setAlertMsg: (msg: string) => set({ alertMsg: msg }),
}));

const useKv = create<{
  kv: Array<
    Readonly<{
      _id: string;
      key: string;
      value: string;
      isEncrypted: boolean;
      iv: string;
      metadata: Record<string, any>;
      author: string;
    }>
  >;
  setKv: (
    kv: Array<
      Readonly<{
        _id: string;
        key: string;
        value: string;
        isEncrypted: boolean;
        iv: string;
        metadata: Record<string, any>;
        author: string;
      }>
    >,
  ) => void;
}>((set) => ({
  kv: [] as Array<
    Readonly<{
      _id: string;
      key: string;
      value: string;
      isEncrypted: boolean;
      iv: string;
      metadata: Record<string, any>;
      author: string;
    }>
  >,
  setKv: (
    kv: Array<
      Readonly<{
        _id: string;
        key: string;
        value: string;
        isEncrypted: boolean;
        iv: string;
        metadata: Record<string, any>;
        author: string;
      }>
    >,
  ) => set({ kv }),
}));

const usePeerNode = create<{
  peerNode: KademliaNode | null;
  setPeerNode: (peerNode: KademliaNode | null) => void;
}>((set) => ({
  peerNode: null,
  setPeerNode: (peerNode: KademliaNode | null) => set({ peerNode }),
}));
export { useAlertMsg, useFunctions, useIdentityKey, useKv, usePeerNode, useToken };
