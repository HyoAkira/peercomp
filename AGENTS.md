# Purpose
A decentralized peer-to-peer (P2P) platform for distributed function execution and key-value storage. It allows users to deploy, discover, and execute sandboxed JavaScript code across a browser-based network.

# Key Technologies
TypeScript, Node.js, Express, React, WebRTC (PeerJS), Kademlia DHT, MongoDB, Dexie.js (IndexedDB), SES (Secure EcmaScript), Docker.

# Top-Level Structure
apps/backbone: Infrastructure (Nginx ingress, MongoDB, SSL certs).
apps/node-worker-gateway: P2P node implementation and HTTP-to-P2P bridge.
apps/org: Backend API for user management and function persistence.
apps/peer_signal: WebRTC signaling server for peer discovery.
apps/web: React frontend for managing functions and P2P node interaction.
apps/web/app/lib/peer: Client-side Kademlia DHT and networking logic.
apps/web/app/lib/dexie: IndexedDB schema for local persistence.
apps/web/app/lib/encryption: Web Worker-based cryptographic services.

# Key Concepts
KademliaNode: P2P participant using XOR distance for routing and storage.
GatewayNode: Bridge connecting HTTP requests to the P2P network.
SES Sandbox: Secure EcmaScript environment for isolated code execution.
Function Execution: Distributed RPC mechanism to run code on remote peers.
K-Buckets: Routing table structure for managing peer connectivity.
Signaling Server: Intermediary for establishing initial WebRTC handshakes.
PeerJS: Library used for WebRTC data channel abstraction.
Iterative Lookup: Recursive search process for nodes or values in the DHT.
DbToLocal: Synchronization of remote database records to local peer storage.
Worker Thread: Off-main-thread execution for crypto and user code.
XOR Metric: Bitwise distance calculation between 256-bit IDs.
ALPHA: Concurrency parameter for parallel network lookups.
Identity Key: Asymmetric key pair representing a user's network identity.
Shared Key: Symmetric key derived via ECDH for encrypted data exchange.
FunctionModel: Database schema for storing executable JavaScript units.