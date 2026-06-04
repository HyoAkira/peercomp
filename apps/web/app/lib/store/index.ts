import { create } from "zustand";
import { KademliaNode } from "~/lib/peer/peer-node";
import { createJSONStorage, persist } from "zustand/middleware";
import { use } from "react";

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
    }
  )
);

const useFunctions = create<{
  functions: Array<
    Readonly<{ _id: string; name: string; method: string; code: string }>
  >;
  setFunctions: (
    functions: Array<
      Readonly<{ _id: string; name: string; method: string; code: string }>
    >
  ) => void;
}>((set) => ({
  functions: [] as Array<
    Readonly<{ _id: string; name: string; method: string; code: string }>
  >,
  setFunctions: (
    functions: Array<
      Readonly<{ _id: string; name: string; method: string; code: string }>
    >
  ) => set({ functions }),
}));

const useAlertMsg = create((set) => ({
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
    >
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
    >
  ) => set({ kv }),
}));

const usePeerNode = create<{
  peerNode: KademliaNode | null;
  setPeerNode: (peerNode: KademliaNode | null) => void;
}>((set) => ({
  peerNode: null,
  setPeerNode: (peerNode: KademliaNode | null) => set({ peerNode }),
}));
export { useToken, useFunctions, useAlertMsg, useKv, usePeerNode };
