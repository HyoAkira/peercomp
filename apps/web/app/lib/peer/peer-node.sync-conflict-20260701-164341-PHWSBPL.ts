// kademlia.js
import {
  bufferToBase64,
  IdentityKey,
  validateP2PWriteRequest,
  type SignedValue,
} from "@peercomp/encryption/utils";
import Peer from "peerjs";
import { FunctionDatabase, KvDatabase } from "../dexie/dexie";

type FunctionModelType = {
  name: string;
  type: string;
  endpoint: string;
  method: "GET" | "POST";
  code: string;
  author: string;
  metadata?: any;
  kvPermission?: any;
};

const K = 20; // k-bucket boyutu
const ALPHA = 3; // paralel sorgu sayısı
const ID_BITS = 256; // ID uzunluğu (PeerJS string ID için)

// --- Yardımcı Fonksiyonlar ---

function generateNodeId(): string {
  const bytes = new Uint8Array(32); // 256-bit
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// XOR mesafesini BigInt ile hesapla
function xorDistance(a: string, b: string): bigint {
  if (!a || !b) return BigInt(0); // or throw, depending on your logic

  const aInt = BigInt("0x" + a);
  const bInt = BigInt("0x" + b);
  return aInt ^ bInt;
}

function closerNodes(target, nodes) {
  return [...nodes].sort((a, b) => {
    const da = xorDistance(target, a.id);
    const db = xorDistance(target, b.id);
    if (da < db) return -1;
    else if (da > db) return 1;
    else return 0;
  });
}

// --- RPC Result Types ---

type PingResult = { pong: true };
type FindNodeResult = { nodes: any[] };
type FindValueResult =
  | { value: any; nodes?: undefined }
  | { nodes: any[]; value?: undefined };
type StoreResult = { stored: true };
type FunctionCallResult = unknown;

type RPCPayload =
  | PingResult
  | FindNodeResult
  | FindValueResult
  | StoreResult
  | FunctionCallResult;

type RPCResult<T = RPCPayload> = {
  code: number;
  message: string;
  error: boolean;
  data: T | null;
};

// --- KBucket ---

class KBucket {
  private nodes;
  constructor() {
    this.nodes = []; // { id, conn }
  }

  add(node) {
    const exists = this.nodes.find((n) => n.id === node.id);
    if (exists) return; // Zaten var
    if (this.nodes.length < K) {
      this.nodes.push(node);
    }
    // Gerçek Kademlia'da: en eski node'u PING'le, cevap vermezse çıkar
  }

  remove(id) {
    this.nodes = this.nodes.filter((n) => n.id !== id);
  }

  getAll() {
    return this.nodes;
  }
}

// key hash function
async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

class NodeMap extends Map {
  async setAsync(key, value) {
    // Persist to Dexie asynchronously
    try {
      console.log(`[Kademlia] Storing key: ${key}`, "value:", value);
      const keyToHash = value.method
        ? `${value.metadata.namespace}:${value.type}:${value.method}:${key}`
        : `${value.metadata.namespace}:${value.type}:${key}`;

      const hashedKey = await hashKey(keyToHash);
      // Always store in in-memory Map immediately with the raw key
      super.set(hashedKey, value);

      switch (value.type) {
        case "function": {
          console.log("Storing function in Dexie:", key, value);
          await FunctionDatabase.contents.put({
            id: hashedKey,
            data: value,
          });
          break;
        }
        case "kv": {
          // For generic KV pairs, also persist with a generic type
          console.log(
            "Storing KV in Dexie:",
            key,
            value,
            "hashedKey:",
            keyToHash,
          );
          await KvDatabase.contents.put({
            id: hashedKey,
            data: value,
          });
        }
      }
    } catch (err) {
      console.error("Dexie storage failed:", err);
    }
  }

  async getAsync(key) {
    const hashedKey = await hashKey(key);
    // Check in-memory Map first (synchronous, fast path)
    if (super.has(hashedKey)) return super.get(hashedKey);

    // Fall back to Dexie
    try {
      let entry;
      const type = key.split(":")[0];
      switch (type) {
        case "function":
          entry = await FunctionDatabase.contents.get({ id: hashedKey });
          break;
        case "kv":
          entry = await KvDatabase.contents.get({ id: hashedKey });
          break;
      }
      if (entry) {
        // Cache in memory for future lookups
        super.set(hashedKey, entry.data);
        return entry.data;
      }
    } catch (err) {
      console.error("Dexie get failed:", err);
    }
    return undefined;
  }

  async hasAsync(key) {
    const hashedKey = await hashKey(key);
    if (super.has(hashedKey)) return true;

    try {
      const type = key.split(":")[0];
      switch (type) {
        case "function":
          const funcCount = await FunctionDatabase.contents
            .where("id")
            .equals(hashedKey)
            .count();
          return funcCount > 0;
        case "kv":
          const count = await KvDatabase.contents
            .where("id")
            .equals(hashedKey)
            .count();
          return count > 0;
      }
    } catch (err) {
      console.error("Dexie has check failed:", err);
      return false;
    }
  }
  async deleteAsync(key) {
    try {
      const hashedKey = await hashKey(key);
      super.delete(hashedKey);
      const type = key.split(":")[1]; // "function" veya "kv" bekliyoruz
      console.log(
        `Deleting key from Dexie: ${key} (hashed: ${hashedKey}, type: ${type})`,
      );
      switch (type) {
        case "function":
          await FunctionDatabase.contents
            .where("id")
            .equals(hashedKey)
            .delete();
          break;
        case "kv":
          await KvDatabase.contents.where("id").equals(hashedKey).delete();
          break;
      }
      return true;
    } catch (error) {
      console.error("Dexie delete failed:", error);
      return false;
    }
  }
}

// --- Ana Node Sınıfı ---
// @LogClass()
export class KademliaNode {
  id: string;
  buckets: KBucket[];
  storage: NodeMap;
  connections: Map<any, any>;
  peer: Peer;
  handlers: {};
  // publicKey: CryptoKey;
  constructor(id?: string) {
    this.id = id || generateNodeId();
    this.buckets = Array.from({ length: ID_BITS }, () => new KBucket());
    this.storage = new NodeMap(); // Anahtar-değer deposu
    this.connections = new Map(); // peerId -> DataConnection
    this.peer = new Peer(this.id, {
      host: "127.0.0.1",
      port: 9000,
      path: "peerjs",
      secure: false,
    });
    this.handlers = {};
    // this.publicKey = publicKey;
  }

  // PeerJS'i başlat
  async start() {
    return new Promise((resolve, reject) => {
      this.peer.on("open", (id) => {
        console.log(`[Kademlia] Node başladı: ${id}`);
        resolve(id);
      });

      this.peer.on("connection", (conn) => {
        this._setupConnection(conn);
      });

      this.peer.on("error", reject);
    });
  }

  // Temizlik: PeerJS bağlantısını ve tüm kaynakları serbest bırak
  destroy() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.buckets.forEach((bucket) => {
      bucket.getAll().length = 0;
    });
    this.storage.clear();
    this.peer.destroy();
    console.log(`[Kademlia] Node durduruldu: ${this.id}`);
  }

  // Bootstrap: ağa ilk katılım
  // Bootstrap (Güncellenmiş)
  async bootstrap(knownPeerId: string) {
    const conn = await this._connect(knownPeerId);
    if (!conn) return;

    // Kendi ID'mizi ağda iteratif olarak ara
    // Bu işlem tüm bucket'ların dolmasını sağlar
    await this._lookup(this.id, false);

    console.log(`[Kademlia] İteratif bootstrap tamamlandı.`);
  }

  // Değer depola
  async store(key, value) {
    const hashedKey = await hashKey(key);
    const nearest = this._findClosestLocal(hashedKey, K);
    const promises = nearest.map((node) =>
      this._sendRPC(node.id, { type: "STORE", key, value }),
    );
    await Promise.allSettled(promises);
    await this.storage.setAsync(key, value); // Kendinde de tut
  }

  async storeWithSignature(key, value, signature) {
    // Örnek: "ahmet:type:profile/avatar" -> namespace: "ahmet"
    // type: "function" veya "kv" olabilir
    // key: "profile/avatar" veya "settings/theme" gibi bir şey olabilir
    const hashedKey = await hashKey(key);
    const nearest = this._findClosestLocal(hashedKey, K);

    const promises = nearest.map((node) =>
      this._sendRPC(node.id, {
        type: "STORE_WITH_SIGNATURE",
        key,
        value,
        signature,
      }),
    );
    await Promise.allSettled(promises);
    const payload = JSON.parse(value.payload);
    const targetNamespace = payload.metadata.namespace;
    const actualKey = payload.method
      ? `${payload.type}:${payload.method}:${key}`
      : `${payload.type}:${key}`;

    const check = await validateP2PWriteRequest(
      targetNamespace,
      actualKey, // Key fark etmez, owner her yere yazabilir
      value,
      signature,
    );
    if (!check) {
      console.warn(
        `STORE_WITH_SIGNATURE rejected for key ${key} due to failed validation.`,
      );
      return;
    }

    await this.storage.setAsync(key, payload); // Kendinde de tut
  }
  async delete(key) {
    const hashedKey = await hashKey(key);
    const nearest = this._findClosestLocal(hashedKey, K);
    const promises = nearest.map((node) =>
      this._sendRPC(node.id, { type: "DELETE", key }),
    );
    await Promise.allSettled(promises);
    await this.storage.deleteAsync(key); // Kendinde de sil
  }
  async _lookup(targetId: string, isValueLookup: boolean = false) {
    // actualTarget: XOR mesafe hesabında kullanılacak hex ID.
    // Value lookup'ta ham key değil, hash'i kullanılmalı.
    const actualTarget = isValueLookup ? await hashKey(targetId) : targetId;

    const shortlist = new Map<
      string,
      { id: string; seen: boolean; queried: boolean }
    >();
    // 1. Başlangıç: En yakın ALPHA kadar yerel node'u ekle
    const initialNodes = this._findClosestLocal(actualTarget, ALPHA);
    initialNodes.forEach((n) =>
      shortlist.set(n.id, { id: n.id, seen: true, queried: false }),
    );

    let closestNodeId = initialNodes.length > 0 ? initialNodes[0].id : null;

    while (true) {
      // 2. Henüz sorgulanmamış en yakın ALPHA node'u seç
      // FIX: targetId yerine actualTarget (hex hash) kullan
      const unqueried = Array.from(shortlist.values())
        .filter((n) => !n.queried)
        .sort((a, b) => {
          const da = xorDistance(actualTarget, a.id);
          const db = xorDistance(actualTarget, b.id);
          return da < db ? -1 : 1;
        })
        .slice(0, ALPHA);

      if (unqueried.length === 0) break;

      // 3. Paralel Sorgulama (ALPHA kadar)
      // FIND_VALUE için ham key (targetId) gönderilir — alıcı taraf kendi hash'ler
      // FIND_NODE için hash'lenmiş actualTarget gönderilir
      const results = await Promise.all(
        unqueried.map(async (node) => {
          node.queried = true;
          const rpcType = isValueLookup ? "FIND_VALUE" : "FIND_NODE";
          const res = await this._sendRPC(node.id, {
            type: rpcType,
            [isValueLookup ? "key" : "targetId"]: isValueLookup
              ? targetId
              : actualTarget,
          } as any);
          return { from: node.id, res };
        }),
      );

      let foundValue = null;

      for (const { from, res } of results) {
        if (!res || res.error || !res.data) continue;
        const payload = res.data as any;

        if (
          isValueLookup &&
          "value" in payload &&
          payload.value !== undefined
        ) {
          foundValue = payload.value;
          break;
        }

        if ("nodes" in payload && payload.nodes) {
          payload.nodes.forEach((n) => {
            if (!shortlist.has(n.id) && n.id !== this.id) {
              shortlist.set(n.id, { id: n.id, seen: true, queried: false });
            }
          });
        }
      }

      if (foundValue) return { value: foundValue };

      // 4. Durma Koşulu — FIX: actualTarget kullan
      const currentClosest = Array.from(shortlist.values()).sort((a, b) => {
        const da = xorDistance(actualTarget, a.id);
        const db = xorDistance(actualTarget, b.id);
        return da < db ? -1 : 1;
      })[0];

      if (currentClosest.id === closestNodeId) break;
      closestNodeId = currentClosest.id;
    }

    // FIX: actualTarget kullan
    return {
      nodes: Array.from(shortlist.values())
        .sort((a, b) =>
          Number(
            xorDistance(actualTarget, a.id) - xorDistance(actualTarget, b.id),
          ),
        )
        .slice(0, K),
    };
  }
  // async function_call(key: string) {
  //   const hashedKey = await hashKey(key);
  //   const nearest = this._findClosestLocal(hashedKey, K);
  //   if (nearest.length === 0) {
  //     throw new Error("No nodes available to call the function.");
  //   }

  //   const promises = nearest.map((node) =>
  //     this._sendRPC(node.id, { type: "FUNCTION-CALL", key }).then((res) => {
  //       if (!res) throw new Error("RPC timeout");
  //       if (res.error) throw new Error(res.message || "RPC error");
  //       return res;
  //     })
  //   );
  //   const firstResponse = await Promise.any(promises);
  //   if (!firstResponse) throw new Error("Function call failed on all nodes.");
  //   return firstResponse.data;
  // }
  async function_call(key: string) {
    const hashedKey = await hashKey(key);
    // XOR mesafesine göre en yakın düğümler sıralı gelir
    const nearest = this._findClosestLocal(hashedKey, K);
    if (nearest.length === 0) {
      throw new Error("No nodes available to call the function.");
    }

    // ALPHA / CHUNK PARAMETRESİ: Aynı anda kaç paralel istek atılacak?
    const CHUNK_SIZE = ALPHA;

    // Yakın peer listesini 3'erli paralel gruplara bölüyoruz
    // Örn: [Node1, Node2, Node3, Node4, Node5] -> [[Node1, Node2, Node3], [Node4, Node5]]
    const groups: (typeof nearest)[] = [];
    for (let i = 0; i < nearest.length; i += CHUNK_SIZE) {
      groups.push(nearest.slice(i, i + CHUNK_SIZE));
    }

    // 3'erli paralel grupları sırayla döngüye alıyoruz
    for (const currentGroup of groups) {
      try {
        // Bu gruptaki 3 isteği AYNI ANDA (paralel) ağa fırlatıyoruz
        const promises = currentGroup.map((node) =>
          this._sendRPC(node.id, { type: "FUNCTION-CALL", key }).then((res) => {
            if (!res) throw new Error("RPC timeout");
            if (res.error) throw new Error(res.message || "RPC error");
            return res;
          }),
        );

        // Gruptaki 3 paralel istekten EN HIZLI dönen başarılı yanıtı alıyoruz
        const firstResponse = await Promise.any(promises);

        // Eğer gruptan biri başarılı olduysa veriyi hemen dönüyoruz.
        // Döngü burada biter ve arkadaki diğer node'lara boşuna istek ATILMAZ.
        return firstResponse.data;
      } catch (groupError) {
        // Eğer bu gruptaki 3 node'un HEPSİ timeout olduysa veya hata verdiyse
        // Promise.any buraya düşer. continue ile sıradaki 3'lü paralel gruba geçeriz.
        continue;
      }
    }

    // Eğer tüm gruplar dönüldü ve hiçbirinden yanıt alınamadıysa
    throw new Error("Function call failed on all available nodes.");
  }
  // Değer ara
  // Değer ara (Güncellenmiş)
  async findValue(key: string) {
    const localValue = await this.storage.getAsync(key);
    if (localValue !== undefined) return localValue;

    const result = await this._lookup(key, true);

    if (result && "value" in result) {
      // Bulunan değeri yerel cache'e at (Kademlia kuralı)
      await this.storage.setAsync(key, result.value);
      return result.value;
    }
    return null;
  }

  // ---- İç Metodlar ----

  _getBucketIndex(targetId) {
    const dist = xorDistance(this.id, targetId);
    if (dist === 0n) return 0;
    // dist.toString(2).length bize en yüksek set edilmiş bitin konumunu verir.
    // 256 bitlik bir sistemde mesafe ne kadar büyükse indeks o kadar büyüktür.
    return Math.min(ID_BITS - 1, dist.toString(2).length - 1);
  }

  _addToBucket(node) {
    const idx = this._getBucketIndex(node.id);
    this.buckets[idx].add(node);
  }

  _findClosestLocal(targetId, count) {
    const all = this.buckets.flatMap((b) => b.getAll());
    return closerNodes(targetId, all).slice(0, count);
  }

  async _connect(peerId) {
    if (this.connections.has(peerId)) return this.connections.get(peerId);

    return new Promise((resolve) => {
      const conn = this.peer.connect(peerId, { reliable: true });

      conn.on("open", () => {
        this._setupConnection(conn);
        resolve(conn);
      });

      conn.on("error", () => resolve(null));
      setTimeout(() => resolve(null), 5000); // timeout
    });
  }

  _setupConnection(conn) {
    this.connections.set(conn.peer, conn);
    this._addToBucket({ id: conn.peer, conn });

    conn.on("data", (msg) => this._handleMessage(conn, msg));

    conn.on("close", () => {
      this.connections.delete(conn.peer);
      const idx = this._getBucketIndex(conn.peer);
      this.buckets[idx].remove(conn.peer);
    });
  }

  async _sendRPC(
    peerId: string,
    message:
      | { type: "PING" }
      | { type: "FIND_NODE"; targetId: string }
      | { type: "FIND_VALUE"; key: any }
      | { type: "STORE"; key: any; value: any }
      | { type: "FUNCTION-CALL"; key: any }
      | { type: "DELETE"; key: any }
      | { type: "STORE_WITH_SIGNATURE"; key: any; value: any; signature: any },
  ): Promise<RPCResult | null> {
    const conn = await this._connect(peerId);
    if (!conn) return null;

    return new Promise<RPCResult | null>((resolve) => {
      const reqId = Math.random().toString(36).slice(2);
      const timeout = setTimeout(() => resolve(null), 3000);

      // Cevap dinle
      const handler = (msg) => {
        if (msg.reqId === reqId) {
          clearTimeout(timeout);
          conn.off("data", handler);
          resolve((msg.result ?? null) as RPCResult | null);
        }
      };
      conn.on("data", handler);

      conn.send({ ...message, reqId, from: this.id });
    });
  }

  async _findNode(peerId, targetId) {
    const result = await this._sendRPC(peerId, { type: "FIND_NODE", targetId });
    if (!result || result.error || !result.data) return [];
    return "nodes" in (result.data as any)
      ? ((result.data as any).nodes ?? [])
      : [];
  }

  async _handleMessage(conn, msg) {
    const { type, reqId, from } = msg;

    // Göndereni bucket'a ekle
    this._addToBucket({ id: from, conn });

    let result: RPCResult | null = null;

    switch (type) {
      case "PING":
        result = {
          code: 200,
          message: "OK",
          error: false,
          data: { pong: true },
        };
        break;

      case "FIND_NODE":
        result = {
          code: 200,
          message: "OK",
          error: false,
          data: {
            nodes: this._findClosestLocal(msg.targetId, K).map((n) => ({
              id: n.id,
            })),
          },
        };
        break;

      case "FIND_VALUE":
        const value = await this.storage.getAsync(msg.key); // msg.key ham anahtar
        if (value !== undefined) {
          result = {
            code: 200,
            message: "OK",
            error: false,
            data: { value: value },
          };
        } else {
          // Veri yoksa ham anahtarı hashleyip en yakınları bul
          const hKey = await hashKey(msg.key);
          result = {
            code: 200,
            message: "OK",
            error: false,
            data: {
              nodes: this._findClosestLocal(hKey, K).map((n) => ({ id: n.id })),
            },
          };
        }
        break;

      case "STORE":
        console.log("message:", msg);
        await this.storage.setAsync(msg.key, msg.value);
        result = {
          code: 200,
          message: "Stored",
          error: false,
          data: { stored: true },
        };
        console.log(`[Kademlia] Değer depolandı: ${msg.key} -> ${msg.value}`);
        break;
      case "DELETE": {
        const success = await this.storage.deleteAsync(msg.key);
        if (success) {
          result = {
            code: 200,
            message: "Deleted",
            error: false,
            data: { deleted: true },
          };
          console.log(`[Kademlia] Değer silindi: ${msg.key}`);
        }

        break;
      }

      case "FUNCTION-CALL": {
        // find value ile fonksiyonun kendisi gelmeli, onu çalıştırıp sonucu döndürmeliyiz
        const funcData: FunctionModelType = await this.findValue(msg.key);
        console.log(
          "FUNCTION-CALL message received for key:",
          msg.key,
          "found funcData:",
          funcData,
        );
        if (funcData && funcData.type === "function") {
          try {
            // Web Worker oluşturup kodu izole alanda çalıştırıyoruz
            const output = await new Promise((resolve, reject) => {
              // // Çalıştırılacak fonksiyon kodunu sarmalayan işçi scripti
              // const workerScript = `
              //       self.onmessage = async function(e) {
              //           const { code, args } = e.data;
              //           try {
              //               // String halindeki kodu JavaScript fonksiyonuna dönüştür
              //               const executeMe = eval(code);

              //               // Fonksiyonu msg içinden gelen parametrelerle tetikle
              //               const output = await executeMe(args);

              //     self.postMessage({ code: 200, message: "OK", error: false, data: output });
              //           } catch (err) {
              //     self.postMessage({ code: 500, message: err.message, error: true, data: null });
              //           }
              //       };
              //   `;

              // // Scripti hafızada geçici bir URL'e dönüştür
              // const blob = new Blob([workerScript], {
              //   type: "application/javascript",
              // });
              // const workerUrl = URL.createObjectURL(blob);
              // const worker = new Worker(workerUrl);
              const worker = new Worker(
                new URL("./worker.js", import.meta.url),
                {
                  type: "module",
                },
              );

              // 5 Saniye Zaman Aşımı Koruması (Sonsuz döngüleri önlemek için)
              const timeout = setTimeout(() => {
                worker.terminate();
                // URL.revokeObjectURL(workerUrl);
                reject(
                  new Error(
                    "Execution Timeout: Fonksiyon zaman aşımına uğradı.",
                  ),
                );
              }, 5000);

              // Worker'dan sonuç geldiğinde
              worker.onerror = (err) => {
                clearTimeout(timeout);
                reject(new Error(err.message || "Worker error"));
              };

              worker.onmessage = async (event) => {
                clearTimeout(timeout);
                // worker.terminate();
                // URL.revokeObjectURL(workerUrl);

                switch (event.data.type) {
                  case "RESULT": {
                    if (!event.data?.error) {
                      resolve(event.data.data); // Başarılı sonucu Promise'e dön
                    } else {
                      reject(
                        new Error(
                          event.data.message || "Worker execution failed",
                        ),
                      );
                    }
                    break;
                  }
                  case "STORAGE_GET_REQUEST": {
                    const { kvPermission, key } = event.data.data;
                    const reqId = event.data.reqId;
                    const v = await this.findValue(key); // KV verisini bul
                    const value = JSON.parse(v.value)
                    worker.postMessage({
                      type: "STORAGE_GET_RESPONSE",
                      success: true,
                      data: { key, value },
                      reqId: reqId,
                    });
                    break;
                  }
                  // case "STORAGE_SET_REQUEST": {
                  //   const { kvPermission, key , targetNamespace} = event.data.data;
                  //   const { payload } = event.data;
                  //   const { functionIdentity, delegationToken, ownerPublicKey } = kvPermission;
                  //   const delegate = await IdentityKey.import(functionIdentity);
                  //   const delegatePayloadSigBuf = await delegate.sign(payload);

                  //   const signedValueByDelegate: SignedValue = {
                  //     payload: JSON.stringify(payload),
                  //     token: delegationToken,
                  //     delegateSignature: bufferToBase64(delegatePayloadSigBuf),
                  //   };

                  //   // Ağdaki bir node doğrular:
                  //   const result = await validateP2PWriteRequest(
                  //     targetNamespace,
                  //     key, // "posts/*" pattern'ına uyuyor!
                  //     signedValueByDelegate,
                  //     ownerPublicKey,
                  //   );
                  //   if(result) {
                  //     await this.store(key, payload); // KV verisini depola
                  //     this._sendRPC()
                  //   }
               

                  //   break;
                  // }
                  // case "STORAGE_DELETE_REQUEST": {
                  //   break;
                  // }
                }
              };

              worker.postMessage({
                type: "EXECUTE",
                code: funcData.code,
                args: msg.args || {},
                kvPermission: funcData.kvPermission,
              });
            });

            result = { code: 200, message: "OK", error: false, data: output };

            console.log(
              `[DHT RPC] '${msg.key}' başarıyla çalıştırıldı. Sonuç:`,
              output,
            );
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            console.error(
              `[DHT RPC ERROR] '${msg.key}' çalıştırılırken hata:`,
              err.message,
            );
            // Hata durumunda result değişkenine ne atamak istediğine göre burayı güncelleyebilirsin
            result = {
              code: 500,
              message: err.message,
              error: true,
              data: null,
            };
          }
        } else {
          console.warn(
            `[DHT RPC] '${msg.key}' anahtarıyla eşleşen geçerli bir fonksiyon bulunamadı.`,
          );
          result = {
            code: 404,
            message: "Function not found",
            error: true,
            data: null,
          };
        }

        // Buradan sonra mevcut kodundaki 'result' değişkenini kullanarak
        // Gateway'e veya isteği atan peer'a yanıt dönen lojiktir muhtemelen (break vb.)
        break;
      }
      case "STORE_WITH_SIGNATURE": {
        const { key, value, signature } = msg;
        const payload = JSON.parse(value.payload);
        const targetNamespace = payload.metadata.namespace;
        const actualKey = payload.method
          ? `${payload.type}:${payload.method}:${key}`
          : `${payload.type}:${key}`;

        const check = await validateP2PWriteRequest(
          targetNamespace,
          actualKey, // Key fark etmez, owner her yere yazabilir
          value,
          signature,
        );
        if (check) {
          console.log("message:", msg);
          await this.storage.setAsync(msg.key, payload);
          result = {
            code: 200,
            message: "Stored",
            error: false,
            data: { stored: true },
          };
          console.log(`[Kademlia] Değer depolandı: ${msg.key} -> ${payload}`);
        } else {
          console.warn(
            `[Kademlia] STORE-SIGNED isteği doğrulama başarısız. Namespace: ${targetNamespace}, Key: ${actualKey}`,
          );
          result = {
            code: 401,
            message: "Unauthorized: Signature validation failed",
            error: true,
            data: null,
          };
        }
        break;
      }
    }

    conn.send({ reqId, result, from: this.id });
  }
}
