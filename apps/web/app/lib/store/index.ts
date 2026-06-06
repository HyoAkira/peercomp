import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { KademliaNode } from "~/lib/peer/peer-node";
import type { SerializedIdentityKey } from "~/lib/encryption/utils";

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
};

const useIdentityKey = create<IdentityKeyStore>()(
  persist(
    (set) => ({
      keyPair: null as SerializedIdentityKey | null,
      setKeyPair: (keyPair: SerializedIdentityKey | null) => set({ keyPair }),
    }),
    {
      name: "identity-key-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

const useFunctions = create<{
  functions: Array<
    Readonly<{ _id: string; name: string; method: string; code: string }>
  >;
  setFunctions: (
    functions: Array<
      Readonly<{ _id: string; name: string; method: string; code: string }>
    >,
  ) => void;
}>((set) => ({
  functions: [] as Array<
    Readonly<{ _id: string; name: string; method: string; code: string }>
  >,
  setFunctions: (
    functions: Array<
      Readonly<{ _id: string; name: string; method: string; code: string }>
    >,
  ) => set({ functions }),
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
