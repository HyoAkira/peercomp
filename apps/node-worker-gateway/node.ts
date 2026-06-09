/**
 * node.ts — Node.js Gateway
 *
 * Düzeltmeler:
 * 1. BinaryPack: Browser PeerJS veriyi peerjs-js-binarypack ile pack'ler.
 *    Gateway de aynı codec'i kullanmak zorunda.
 * 2. OFFER payload: connectionId, label, serialization, reliable zorunlu.
 *    Browser peer.connect() çağrısında bunları üretir; gateway mirror etmeli.
 * 3. ANSWER handler: Browser'daki DataConnection.handleMessage() sadece
 *    payload.sdp'yi okur, wrapleme yok.
 * 4. DataChannel send: dc.send(bp.pack(data)) — arraybuffer olarak gönderilmeli.
 */

import { IdentityKey } from "@peercomp/encryption/utils";
import * as nodeDc from "node-datachannel";
import * as crypto from "node:crypto";
import { Worker } from "node:worker_threads";
import { pack, unpack } from "peerjs-js-binarypack";
import WebSocket from "ws";

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

function xorDistance(a: string, b: string): bigint {
  if (!a || !b) return BigInt(0);
  return BigInt("0x" + a) ^ BigInt("0x" + b);
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateNodeId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** PeerJS connectionId formatı: "dc_" + random token */
function generateConnectionId(): string {
  return "dc_" + Math.random().toString(36).substring(2, 10);
}

// ─── Storage ─────────────────────────────────────────────────────────────────

class GatewayStorage extends Map<string, any> {
  setLocal(key: string, value: any) {
    const hashedKey = hashKey(`${value.type}:${key}`);
    super.set(hashedKey, value);
  }

  async getAsync(key: string): Promise<any> {
    return super.get(hashKey(key));
  }
}

// ─── GatewayNode ─────────────────────────────────────────────────────────────

export class GatewayNode {
  id: string;
  private K = 20;
  private ALPHA = 3;

  private iceServers = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:3478",
  ];

  // peerId → node-datachannel PeerConnection
  private peerConnections = new Map<string, nodeDc.PeerConnection>();
  // peerId → node-datachannel DataChannel (açık kanallar)
  private activeChannels = new Map<string, nodeDc.DataChannel>();
  // reqId → {resolve, reject}
  private pendingRequests = new Map<
    string,
    { resolve: (v: any) => void; reject: (e: any) => void }
  >();

  storage = new GatewayStorage();
  ws!: WebSocket;

  private signallingURL: string;
  peersEndpoint: string;

  constructor(
    signallingURL = "ws://127.0.0.1:9000/peerjs/peerjs?token=peerjs&key=peerjs",
    peersEndpoint = "http://localhost:8000/peers",
  ) {
    this.id =
      "67617465776179736572766572676174657761797365727665726e6f64653031";
    this.signallingURL = `${signallingURL}&id=${this.id}`;
    this.peersEndpoint = peersEndpoint;
    console.log(`[GATEWAY] Node ID: ${this.id}`);
  }

  // ── Başlatma ────────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(this.signallingURL);
      let resolved = false;

      this.ws.on("open", () => {
        console.log("[GATEWAY] Signalling WS bağlandı, OPEN bekleniyor...");
        setInterval(() => {
          if (this.ws.readyState === WebSocket.OPEN)
            this.ws.send(JSON.stringify({ type: "HEARTBEAT" }));
        }, 5000);
      });

      this.ws.on("message", (raw: Buffer) => {
        const text = raw.toString();
        this._handleSignalling(text);

        // PeerJS server kayıt onayı — bu geldikten sonra peer listesi çekilebilir
        if (!resolved) {
          try {
            const msg = JSON.parse(text);
            if (msg.type === "OPEN") {
              console.log(
                "[GATEWAY] Signalling server kaydı onaylandı (OPEN).",
              );
              resolved = true;
              resolve();
            }
          } catch {}
        }
      });

      this.ws.on("error", (e) => console.error("[GATEWAY] WS hata:", e));

      // Fallback: 3s sonra OPEN gelmezse de devam et
      setTimeout(() => {
        if (!resolved) {
          console.warn(
            "[GATEWAY] OPEN mesajı gelmedi, yine de devam ediliyor.",
          );
          resolved = true;
          resolve();
        }
      }, 3000);
    });
  }

  // ── Peer Listesi ────────────────────────────────────────────────────────────

  async getPeers(): Promise<string[]> {
    try {
      const res = await fetch(this.peersEndpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // PeerJS server /peers → string[] döner (connections değil)
      const list: string[] = Array.isArray(data)
        ? data
        : data.connections || [];
      return list.filter((id) => id !== this.id);
    } catch (e) {
      console.warn("[GATEWAY] getPeers hatası:", e);
      return [];
    }
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  async bootstrap(): Promise<void> {
    const peers = await this.getPeers();
    if (peers.length === 0) {
      console.log("[GATEWAY] Ağda başka node yok.");
      return;
    }
    console.log(
      `[GATEWAY] Bootstrap: ${peers.length} peer bulundu:`,
      peers.map((p) => p.slice(0, 8)),
    );
    for (const peerId of peers.slice(0, this.ALPHA)) {
      this._initiateConnection(peerId);
    }

    // 8 saniye sonra hâlâ bağlı değilsek kalan peer'lara da dene
    setTimeout(async () => {
      const unconnected = peers.filter((id) => !this.activeChannels.has(id));
      if (unconnected.length > 0) {
        console.log(
          `[GATEWAY] Retry bootstrap: ${unconnected.length} peer hâlâ bağlı değil, yeniden deneniyor.`,
        );
        for (const peerId of unconnected) {
          this.peerConnections.delete(peerId); // eski yarım bağlantıyı temizle
          this._initiateConnection(peerId);
        }
      }
    }, 8000);
  }

  // ── WebRTC Bağlantı Başlatıcı (Caller tarafı) ───────────────────────────────

  private _initiateConnection(peerId: string) {
    if (this.peerConnections.has(peerId)) return;

    const connectionId = generateConnectionId();
    console.log(
      `[GATEWAY] → Bağlantı başlatılıyor: ${peerId.slice(
        0,
        8,
      )}.. (connId: ${connectionId})`,
    );
    const pc = new nodeDc.PeerConnection(this.id, {
      iceServers: this.iceServers,
    });
    this.peerConnections.set(peerId, pc);

    const dc = pc.createDataChannel(connectionId);
    this._bindChannel(peerId, dc);

    pc.onLocalDescription((sdp, type) => {
      console.log(
        `[GATEWAY] onLocalDescription: type=${type} peer=${peerId.slice(0, 8)}`,
      );
      if (type !== "offer") return;
      /**
       * FIX #1: payload'a connectionId, label, serialization, reliable ekle.
       * Browser PeerJS bu alanlardan DataConnection tipini belirler.
       * serialization: "raw" → browser tarafı pack/unpack yapmaz,
       * sadece arraybuffer'ı olduğu gibi iletir.
       *
       * UYARI: Browser'ın peer.connect() çağrısında serialization: "raw"
       * kullanılması gerekir. Aksi hâlde browser binarypack ile gönderir
       * ve gateway decode etmek zorunda kalır (aşağıda _recvMsg hallediyor).
       */
      const payload = {
        sdp: { type: "offer", sdp },
        type: "data",
        connectionId,
        label: connectionId,
        serialization: "raw", // browser'a "raw mod" sinyali
        reliable: true,
        metadata: null,
      };

      this.ws.send(
        JSON.stringify({ type: "OFFER", src: this.id, dst: peerId, payload }),
      );
      console.log(
        `[GATEWAY] OFFER gönderildi → ${peerId.slice(0, 8)}.. payload:`,
        JSON.stringify(payload).slice(0, 200),
      );
    });

    pc.onLocalCandidate((candidate, mid) => {
      this.ws.send(
        JSON.stringify({
          type: "CANDIDATE",
          src: this.id,
          dst: peerId,
          payload: {
            candidate: { candidate, sdpMid: mid },
            type: "data",
            connectionId,
          },
        }),
      );
    });
  }

  // ── Signalling Handler ───────────────────────────────────────────────────────

  private _handleSignalling(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const { type, src: peerId, payload } = msg;
    if (!peerId || peerId === this.id) return;

    if (type === "OPEN") {
      console.log("[GATEWAY] Signalling OPEN alındı.");
      return;
    }

    if (type === "OFFER") {
      console.log(`[GATEWAY] OFFER alındı ← ${peerId}`);
      const connectionId = payload?.connectionId || generateConnectionId();

      const pc = new nodeDc.PeerConnection(this.id, {
        iceServers: this.iceServers,
      });
      this.peerConnections.set(peerId, pc);

      // Callee tarafı: browser DataChannel açacak, biz ondatachannel bekleriz
      pc.onDataChannel((dc) => {
        console.log(`[GATEWAY] DataChannel alındı ← ${peerId}`);
        this._bindChannel(peerId, dc);
      });

      pc.onLocalDescription((sdp, type) => {
        if (type !== "answer") return;
        /**
         * FIX #2: ANSWER payload'ında da connectionId zorunlu.
         * Browser DataConnection.handleMessage() → case Answer:
         * payload.sdp'yi okur; connectionId ile doğru connection'ı bulur.
         */
        this.ws.send(
          JSON.stringify({
            type: "ANSWER",
            src: this.id,
            dst: peerId,
            payload: {
              sdp: { type: "answer", sdp },
              type: "data",
              connectionId,
            },
          }),
        );
        console.log(`[GATEWAY] ANSWER gönderildi → ${peerId}`);
      });

      pc.onLocalCandidate((candidate, mid) => {
        this.ws.send(
          JSON.stringify({
            type: "CANDIDATE",
            src: this.id,
            dst: peerId,
            payload: {
              candidate: { candidate, sdpMid: mid },
              type: "data",
              connectionId,
            },
          }),
        );
      });

      pc.setRemoteDescription(payload.sdp.sdp, "offer");
      return;
    }

    if (type === "ANSWER") {
      const pc = this.peerConnections.get(peerId);
      if (!pc) return;
      console.log(`[GATEWAY] ANSWER alındı ← ${peerId}`);
      pc.setRemoteDescription(payload.sdp.sdp, "answer");
      return;
    }

    if (type === "CANDIDATE") {
      const pc = this.peerConnections.get(peerId);
      if (!pc || !payload?.candidate) return;
      pc.addRemoteCandidate(
        payload.candidate.candidate,
        payload.candidate.sdpMid,
      );
      return;
    }
  }

  // ── DataChannel Event Binding ────────────────────────────────────────────────

  private _bindChannel(peerId: string, dc: nodeDc.DataChannel) {
    // node-datachannel API: onOpen / onClosed  (onOpened değil)
    dc.onOpen(() => {
      console.log(`[GATEWAY] ✓ DataChannel AÇIK ↔ ${peerId}`);
      this.activeChannels.set(peerId, dc);
    });

    dc.onClosed(() => {
      console.log(`[GATEWAY] DataChannel kapandı: ${peerId}`);
      this.activeChannels.delete(peerId);
      this.peerConnections.delete(peerId);
    });

    dc.onError((err: string) => {
      console.error(`[GATEWAY] DataChannel hata (${peerId}):`, err);
    });

    dc.onMessage((rawMsg) => {
      this._recvMsg(peerId, rawMsg);
    });
  }

  private _recvMsg(peerId: string, rawMsg: string | Buffer | ArrayBuffer) {
    let parsed: any;
    try {
      if (typeof rawMsg === "string") {
        parsed = JSON.parse(rawMsg);
      } else {
        const buf =
          rawMsg instanceof ArrayBuffer
            ? Buffer.from(rawMsg)
            : (rawMsg as Buffer);
        parsed = unpack(buf);
      }
    } catch (e) {
      console.warn(
        `[GATEWAY] Decode hatası (${peerId.slice(0, 8)}):`,
        e,
        "| tip:",
        typeof rawMsg,
        "| uzunluk:",
        (rawMsg as any)?.byteLength ?? (rawMsg as any)?.length,
      );
      return;
    }

    console.log(
      `[GATEWAY] ← Mesaj (${peerId.slice(0, 8)}..):`,
      JSON.stringify(parsed).slice(0, 120),
    );
    this._handleMsg(peerId, parsed);
  }

  // ── Mesaj Yönlendirici ───────────────────────────────────────────────────────

  private async _handleMsg(fromPeerId: string, msg: any) {
    // Durum A: Bizim gönderdiğimiz RPC'ye gelen yanıt
    if (msg.reqId && this.pendingRequests.has(msg.reqId)) {
      const p = this.pendingRequests.get(msg.reqId)!;
      this.pendingRequests.delete(msg.reqId);
      p.resolve(msg.result ?? null);
      return;
    }

    // Durum B: Ağdan gelen RPC isteği
    if (msg.type && msg.reqId) {
      const result = await this._processRPC(msg);
      this._sendToChannel(fromPeerId, {
        reqId: msg.reqId,
        result,
        from: this.id,
      });
    }
  }

  private async _processRPC(msg: any): Promise<any> {
    switch (msg.type) {
      case "PING":
        return { code: 200, message: "OK", error: false, data: { pong: true } };

      case "FIND_NODE":
        return {
          code: 200,
          message: "OK",
          error: false,
          data: {
            nodes: this._findClosest(msg.targetId, this.K).map((id) => ({
              id,
            })),
          },
        };

      case "FIND_VALUE": {
        // const value = await this.storage.getAsync(msg.key);
        const value = undefined;
        // if (value !== undefined)
        //   return { code: 200, message: "OK", error: false, data: { value } };
        return {
          code: 200,
          message: "OK",
          error: false,
          data: {
            nodes: this._findClosest(hashKey(msg.key), this.K).map((id) => ({
              id,
            })),
          },
        };
      }

      // case "STORE":
      //   this.storage.setLocal(msg.key, msg.value);
      //   return {
      //     code: 200,
      //     message: "Stored",
      //     error: false,
      //     data: { stored: true },
      //   };

      // case "FUNCTION-CALL": {
      //   const funcData = await this.findValue(msg.key);
      //   if (!funcData || funcData.type !== "function")
      //     return {
      //       code: 404,
      //       message: "Function not found",
      //       error: true,
      //       data: null,
      //     };
      //   try {
      //     const output = await this._executeInWorker(
      //       funcData.code,
      //       msg.args || {},
      //     );
      //     return { code: 200, message: "OK", error: false, data: output };
      //   } catch (e: any) {
      //     return { code: 500, message: e.message, error: true, data: null };
      //   }
      // }

      default:
        return {
          code: 400,
          message: "Unknown RPC type",
          error: true,
          data: null,
        };
    }
  }

  // ── Kanal Yazıcı ────────────────────────────────────────────────────────────

  /**
   * FIX #4: Gönderirken de BinaryPack kullan (browser default binary modundaysa).
   * Eğer browser "raw" modda bağlandıysa JSON string yeterli.
   * Güvenli yol: her zaman BinaryPack — her iki durumu da kapsar.
   */
  private _sendToChannel(peerId: string, data: any) {
    const dc = this.activeChannels.get(peerId);
    if (!dc) {
      console.warn(
        `[GATEWAY] sendToChannel: ${peerId.slice(0, 8)}.. için aktif kanal yok`,
      );
      return;
    }
    console.log(
      `[GATEWAY] → Mesaj (${peerId.slice(0, 8)}..):`,
      JSON.stringify(data).slice(0, 120),
    );
    const packed = pack(data) as ArrayBuffer;
    dc.sendMessageBinary(Buffer.from(packed));
  }

  // ── RPC Gönderici ───────────────────────────────────────────────────────────

  async _sendRPC(peerId: string, message: any): Promise<any> {
    if (!this.activeChannels.has(peerId)) return null;

    return new Promise((resolve, reject) => {
      const reqId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        resolve(null);
      }, 4000);

      this.pendingRequests.set(reqId, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      this._sendToChannel(peerId, { ...message, reqId, from: this.id });
    });
  }

  // ── Kademlia Yardımcıları ────────────────────────────────────────────────────

  private _findClosest(targetId: string, count: number): string[] {
    return Array.from(this.activeChannels.keys())
      .sort((a, b) => {
        const da = xorDistance(targetId, a);
        const db = xorDistance(targetId, b);
        return da < db ? -1 : da > db ? 1 : 0;
      })
      .slice(0, count);
  }

  // ── Genel API ────────────────────────────────────────────────────────────────

  async findValue(key: string): Promise<any | null> {
    // const local = await this.storage.getAsync(key);
    const local = undefined;
    if (local !== undefined) return local;

    const nearest = this._findClosest(hashKey(key), this.ALPHA);
    if (nearest.length === 0) return null;

    const res = await this._sendRPC(nearest[0], { type: "FIND_VALUE", key });
    return res?.data?.value ?? null;
  }

  // async store(key: string, value: any): Promise<void> {
  //   const nearest = this._findClosest(hashKey(key), this.K);
  //   await Promise.allSettled(
  //     nearest.map((id) => this._sendRPC(id, { type: "STORE", key, value }))
  //   );
  //   this.storage.setLocal(key, value);
  // }

  // async call_function(
  //   key: string,
  //   args: any = {},
  //   method: string
  // ): Promise<any> {
  //   try {
  //     key = `function:${method}:${key}`; // Fonksiyon anahtarları "function:" prefix'li olsun
  //     const nearest = this._findClosest(hashKey(key), this.K);
  //     if (nearest.length === 0) throw new Error("Aktif peer yok.");
  //     const alpha = 3;
  //     const targetPeers = nearest.slice(0, alpha);

  //     const results = await Promise.any(
  //       targetPeers.map((id) =>
  //         this._sendRPC(id, { type: "FUNCTION-CALL", key, args }).then(
  //           (res) => {
  //             if (!res || res.error)
  //               throw new Error(res?.message ?? "RPC failed");
  //             return res;
  //           }
  //         )
  //       )
  //     );
  //     return results.data;
  //   } catch (error) {
  //     throw new Error(
  //       `FUNCTION-CALL hatası: ${
  //         error instanceof Error ? error.message : error
  //       }`
  //     );
  //   }
  // }

  async call_function(
    key: string,
    args: any = {},
    method: string,
    signature: string,
  ): Promise<any> {
    try {
      if (!signature) {
        throw new Error("Signature is required for FUNCTION-CALL");
      }
      const targetNamespace = await IdentityKey.calculateNamespace(signature);

      key = `${targetNamespace}:function:${method}:${key}`;
      const nearest = this._findClosest(hashKey(key), this.K); // XOR mesafesine göre en yakınlar sıralı
      if (nearest.length === 0) throw new Error("Aktif peer yok.");

      const CHUNK_SIZE = 3; // Her adımda kaçar kişi denenecek?

      // En yakın peer listesini CHUNK_SIZE (3'erli) parçalara bölüyoruz
      // Örn: [1,2,3,4,5,6,7] -> [[1,2,3], [4,5,6], [7]]
      const groups: string[][] = [];
      for (let i = 0; i < nearest.length; i += CHUNK_SIZE) {
        groups.push(nearest.slice(i, i + CHUNK_SIZE));
      }

      // 3'erli grupları sırayla döngüye sokuyoruz
      for (const currentGroup of groups) {
        try {
          // O anki 3 kişilik gruptan ilk başarılı döneni bekliyoruz
          const result = await Promise.any(
            currentGroup.map((id) =>
              this._sendRPC(id, { type: "FUNCTION-CALL", key, args }).then(
                (res) => {
                  if (!res || res.error)
                    throw new Error(res?.message ?? "RPC failed");
                  return res;
                },
              ),
            ),
          );

          // Eğer bu gruptan BİRİ BİLE başarılı döndüyse, fonksiyondan veriyi çıkarıyoruz.
          // Döngü burada kırılır (break) ve sonraki gruplara istek ATILMAZ.
          return result.data;
        } catch (groupError) {
          // Bu gruptaki 3 kişinin HEPSİ patlarsa Promise.any buraya düşer.
          // console.warn(`Bu gruptaki peer'lar yanıt vermedi, sonraki 3'lü deneniyor...`);
          // Döngü devam eder ve bir sonraki 'currentGroup' denenir.
          continue;
        }
      }

      // Eğer döngü bittiyse ve return yapılamadıysa, ağdaki tüm gruplar denenmiş ve patlamış demektir.
      throw new Error("Denenen tüm komşu peer grupları başarısız oldu.");
    } catch (error) {
      throw new Error(
        `FUNCTION-CALL hatası: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  // ── Worker Thread Executor ──────────────────────────────────────────────────

  // private _executeInWorker(code: string, args: any): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     const script = `
  //       const { parentPort } = require('worker_threads');
  //       parentPort.on('message', async ({ code, args }) => {
  //         try {
  //           const fn = eval(code);
  //           const out = await fn(args);
  //           parentPort.postMessage({ error: false, data: out });
  //         } catch (err) {
  //           parentPort.postMessage({ error: true, message: err.message });
  //         }
  //       });
  //     `;

  //     const worker = new Worker(script, { eval: true });
  //     const timeout = setTimeout(() => {
  //       worker.terminate();
  //       reject(new Error("Execution timeout"));
  //     }, 5000);

  //     worker.on("message", (res) => {
  //       clearTimeout(timeout);
  //       worker.terminate();
  //       res.error ? reject(new Error(res.message)) : resolve(res.data);
  //     });

  //     worker.on("error", (e) => {
  //       clearTimeout(timeout);
  //       worker.terminate();
  //       reject(e);
  //     });
  //     worker.postMessage({ code, args });
  //   });
  // }
}
