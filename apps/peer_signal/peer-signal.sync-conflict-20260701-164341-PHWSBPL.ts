import { PeerServer } from "peer";

export default class PeerSignal {
  static connections = new Map();
  static peer: ReturnType<typeof PeerServer>;
  // redis;
  constructor(port = 9000) {
    this.createPeerServer(port);
    // this.redis = client;
  }
  async redisConnect() {
    await this.redis.connect();
  }
  createPeerServer(port: number) {
    if (PeerSignal.peer) return PeerSignal.peer;
    console.log(`Peer server started on port ${port}`);
    return (PeerSignal.peer = PeerServer({ port, path: "/peerjs" }));
  }
  async start() {
    // await this.redisConnect();
    // this.redis.set
    PeerSignal.peer.on("connection", (client) => {
      console.log("Client connected:", client.getId());
      PeerSignal.connections.set(client.getId(), client);
    });

    PeerSignal.peer.on("disconnect", (client) => {
      console.log("Client disconnected:", client.getId());
      PeerSignal.connections.delete(client.getId());
    });

    PeerSignal.peer.on("error", (err) => {
      console.error("Peer server error:", err);
    });
  }
  getConnections() {
    return Array.from(PeerSignal.connections.keys());
  }
}
