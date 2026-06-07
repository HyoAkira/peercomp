# System Patterns: PeerComp Architecture

## High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐   │
│  │   Browser   │  │   Browser        │  │   External HTTP Client      │   │
│  │  (React)    │  │  (Peer Node)     │  │   (curl, Postman, etc.)     │   │
│  └──────┬──────┘  └────────┬─────────┘  └──────────────┬──────────────┘   │
└─────────┼──────────────────┼───────────────────────────┼──────────────────┘
          │                  │                           │
          │ HTTPS/WSS        │ WebRTC DataChannel        │ HTTPS
          ▼                  ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGRESS LAYER (Nginx)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TLS Termination + Host-based Routing                               │   │
│  │  *.peercomp.com.tr → GatewayNode:3001                               │   │
│  │  /api/* → Org API:3000                                              │   │
│  │  /peerjs/* (WS upgrade) → Peer Signal:9000                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │                  │                           │
          ▼                  ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  Org API     │  │  GatewayNode     │  │  Peer Signal Server          │ │
│  │  (Express)   │  │  (Node.js DHT)   │  │  (WS + Redis Pub/Sub)        │ │
│  │  Port 3000   │  │  Port 3001       │  │  Ports 8000/9000             │ │
│  └──────┬───────┘  └────────┬─────────┘  └──────────────┬───────────────┘ │
└─────────┼───────────────────┼───────────────────────────┼─────────────────┘
          │                   │                           │
          │ MongoDB           │ P2P DHT                   │ Redis Pub/Sub
          ▼                   ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  MongoDB     │  │  IndexedDB       │  │  Redis                       │ │
│  │  (Primary)   │  │  (Dexie.js)      │  │  (Signaling Pub/Sub)         │ │
│  └──────────────┘  └──────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Kademlia DHT Implementation

### Node Identity
- **256-bit Node ID**: Generated from ECDSA P-256 public key (SHA-256 hash → hex)
- **Distance Metric**: XOR distance (`distance(a, b) = a ^ b` interpreted as integer)
- **Routing Table**: K-buckets (k=20) organized by prefix length of XOR distance

### K-Bucket Structure
```typescript
// apps/web/app/lib/peer/peer-node.ts
interface KBucket {
  contacts: Contact[];  // max 20 (K)
  range: { min: bigint; max: bigint };  // XOR distance range
  lastUpdated: number;
}
```

### Lookup Algorithm (Iterative, Parallel)
1. **Find closest α=3 nodes** from local routing table to target key
2. **Send FIND_NODE/FIND_VALUE** RPCs in parallel to those α nodes
3. **Collect responses**, update routing table with new contacts
4. **Recurse** with newly discovered closer nodes
5. **Terminate** when no closer nodes found or value retrieved

### Message Types (DHT Protocol)
| Type | Purpose | Payload |
|------|---------|---------|
| `PING` | Liveness check | `{ nonce }` |
| `PONG` | Pong response | `{ nonce }` |
| `FIND_NODE` | Request closer nodes | `{ targetId }` |
| `NODES` | Response with contacts | `{ contacts: Contact[] }` |
| `FIND_VALUE` | Request stored value | `{ key }` |
| `VALUE` | Value response | `{ key, value, signature }` |
| `STORE` | Store key-value | `{ key, value, signature, ttl }` |

### Bootstrap Process
1. GatewayNode/browser connects to **Peer Signal** (WebSocket)
2. Fetch peer list from `GET /peers` (returns PeerJS IDs of connected peers)
3. Connect to first **ALPHA=3** peers via WebRTC data channels
4. Perform initial `FIND_NODE` for own node ID to populate routing table
5. Periodic refresh: random `FIND_NODE` for IDs in empty bucket ranges

---

## 2. WebRTC Signaling Flow

```
Browser Peer A                    Peer Signal Server                    Browser Peer B
     │                                  │                                  │
     ├── WebSocket Connect ────────────►│                                  │
     │                                  │                                  │
     │◄──────── PeerJS ID assigned ─────┤                                  │
     │                                  │                                  │
     │                                  │◄────── WebSocket Connect ────────┤
     │                                  │                                  │
     │                                  │──── PeerJS ID assigned ────────►│
     │                                  │                                  │
     │── HTTP GET /peers ──────────────►│                                  │
     │◄──── Peer list (incl. B) ────────┤                                  │
     │                                  │                                  │
     ├── PeerJS call(B's ID) ─────────►│                                  │
     │                                  │── Forward offer ────────────────►│
     │                                  │◄──── Forward answer ────────────┤
     │                                  │                                  │
     │◄── ICE candidates ──────────────┤                                  │
     │                                  │── ICE candidates ───────────────►│
     │                                  │                                  │
     │═══════ WebRTC DataChannel ═══════════════════════════════════════════│
     │                                  │                                  │
```

### Peer Signal Server (`apps/peer_signal/peer-signal.ts`)
- **PeerJS Server**: Wraps `@peerjs/peerjs-server` for offer/answer/ICE relay
- **Redis Pub/Sub**: Horizontal scaling — multiple signal instances sync peer presence
- **HTTP `/peers` Endpoint**: Returns active PeerJS IDs for bootstrap
- **Custom Path**: `/peerjs/peerjs` (configured in `packages/config/api.json`)

---

## 3. GatewayNode: HTTP → P2P Bridge

### Request Flow
```
HTTP Request (e.g., GET https://myfunc.peercomp.com.tr/?arg=1)
         │
         ▼
Nginx extracts subdomain "myfunc" → Host header
         │
         ▼
GatewayNode.main.ts: app.all("/", handler)
         │
         ├── Extract key="myfunc" from host
         ├── Parse query/body as args
         ├── Determine method (GET/POST)
         │
         ├── TRY: node.call_function(key, args, method, signature)
         │       │
         │       ├── DHT: FIND_VALUE for key (function endpoint)
         │       ├── Route to closest peer storing the function
         │       ├── Peer executes in SES sandbox
         │       ├── Return result via DHT
         │       │
         │       └── SUCCESS → Return JSON response
         │
         └── CATCH (P2P fails):
                 ├── Query MongoDB: FunctionModel.findOne({ endpoint: key })
                 ├── If found: Execute locally via worker.mjs (worker_threads)
                 │       ├── 15s timeout
                 │       ├── SES sandbox (same as P2P)
                 │       └── Return result
                 └── If not found: 404
```

### GatewayNode DHT Participation (`apps/node-worker-gateway/node.ts`)
- **Hardcoded Node ID**: `0123456789abcdef...` (64 hex chars = 256 bits)
- **PeerJS Connection**: `ws://127.0.0.1:9000/peerjs/peerjs`
- **WebRTC Stack**: `node-datachannel` + `node-peerjs` (Node.js WebRTC impl)
- **Bootstrap**: `GET http://localhost:8000/peers` → connect to first 3 peers
- **Message Handling**: Implements same DHT protocol as browser peer-node.ts

---

## 4. SES Sandbox Execution Model

### Browser: Web Worker (`apps/web/app/lib/peer/worker.js`)
```javascript
// Runs in dedicated Web Worker (off main thread)
import { Compartment } from '@endo/ses';

// Create frozen realm with only safe globals
const compartment = new Compartment({
  console,        // Allow logging
  setTimeout,     // Allow timers
  fetch,          // Allow network (if needed)
}, { name: 'peercomp-sandbox' });

// Evaluate user code
const exports = compartment.evaluate(userCode);

// Call exported handler
const result = await exports.handler(args);
```

### Node.js: Worker Thread (`apps/node-worker-gateway/worker.mjs`)
```javascript
// worker_threads with 15s timeout
const { Worker } = require('worker_threads');

function executeInSandbox(code, args) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      import { Compartment } from '@endo/ses';
      const compartment = new Compartment({ console, setTimeout });
      const exports = compartment.evaluate(${JSON.stringify(code)});
      postMessage(await exports.handler(${JSON.stringify(args)}));
    `, { eval: true });
    
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Execution timeout'));
    }, 15000);
    
    worker.on('message', (result) => {
      clearTimeout(timeout);
      resolve(result);
    });
    worker.on('error', reject);
  });
}
```

### Sandbox Guarantees
- **No access to**: `fs`, `net`, `process`, `require`, `eval`, `Function` constructor
- **No prototype pollution**: All intrinsics frozen via SES
- **Deterministic**: Same code + args = same result (no external state)
- **Resource limits**: CPU time (15s), memory (V8 default), no file I/O

---

## 5. Data Synchronization: MongoDB ↔ IndexedDB

### Dexie Schema (`apps/web/app/lib/dexie/dexie.ts`)
```typescript
// Versioned schema with upgrade logic
db.version(1).stores({
  functions: '++id, endpoint, method, namespace, author, code, updatedAt',
  kv: '++id, key, namespace, author, value, isEncrypted, encrypted, iv, updatedAt',
  peers: '++id, peerId, address, lastSeen, latency',
  pendingWrites: '++id, type, payload, timestamp, retries',
});
```

### Sync Strategy (`apps/web/app/components/dbToLocal.tsx`)
| Direction | Trigger | Mechanism |
|-----------|---------|-----------|
| **MongoDB → IndexedDB** | App load, periodic (30s), manual "Sync" button | `GET /api/functions?since=<ts>`, `GET /api/kv?since=<ts>` → upsert to Dexie |
| **IndexedDB → MongoDB** | Online detection, manual "Push" | POST pendingWrites queue → `/api/functions/bulk`, `/api/kv/bulk` |
| **Conflict Resolution** | Version vectors / `updatedAt` | Server wins (authoritative); client merges non-conflicting fields |

### Offline-First Guarantees
- All reads serve from IndexedDB immediately
- Writes go to `pendingWrites` queue → background sync
- Optimistic UI updates (local state reflects writes instantly)
- Conflict UI shown if server rejects (409)

---

## 6. Authentication & Authorization Flow

### JWT Token (Org API)
```
Login/Register → POST /api/users/login
                    │
                    ▼
         { accessToken, refreshToken, user }
                    │
                    ▼
         Client stores in memory + httpOnly cookie
                    │
                    ▼
         All /api/* requests: Authorization: Bearer <accessToken>
```

### ECDSA Identity Keys (P2P)
```
User Registration → generateNodeId() (256-bit random)
                    │
                    ├── MongoDB: UserModel._id = nodeId
                    ├── Generate ECDSA P-256 keypair
                    │   ├── privateKey → stored (encrypted at rest?)
                    │   └── publicKey → stored, shared with peers
                    │
                    └── Browser: Keypair generated in Web Worker
                        ├── Stored in IndexedDB (encrypted with password-derived key)
                        └── Used for: DHT message signing, ECDH key agreement
```

### ECDH Shared Key Derivation
```
Alice (privA, pubA)                    Bob (privB, pubB)
     │                                      │
     ├── ECDH(privA, pubB) ────────────────►│
     │           = ECDH(privB, pubA) ◄──────┤
     │                                      │
     ▼                                      ▼
sharedSecret = X25519(privA, pubB)    sharedSecret = X25519(privB, pubA)
     │                                      │
     ├── HKDF-SHA256(sharedSecret, "enc")──►│
     │           = encryptionKey            │
     ├── HKDF-SHA256(sharedSecret, "auth")─►│
     │           = authKey (HMAC)           │
```

### KV Encryption Flow
```
User stores KV (key="secret", value="data", encrypt=true)
         │
         ├── Derive encryptionKey via ECDH with self (or recipient)
         ├── AES-256-GCM encrypt(value, encryptionKey) → { ciphertext, iv }
         ├── Store in MongoDB: { key, isEncrypted: true, encrypted: ciphertext, iv }
         └── Sync to IndexedDB (same structure)
```

---

## 7. Frontend State Management (Zustand)

### Store Structure (`apps/web/app/lib/store/index.ts`)
```typescript
interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  login: (creds) => Promise<void>;
  logout: () => void;
  
  // P2P
  peerNode: KademliaNode | null;
  peerId: string | null;
  connectedPeers: Contact[];
  initializePeer: () => Promise<void>;
  
  // Data (synced from IndexedDB)
  functions: FunctionDoc[];
  kvEntries: KVDoc[];
  refreshData: () => Promise<void>;
  
  // UI
  sidebarOpen: boolean;
  notifications: Notification[];
}
```

### React Integration
- `<PeerComponent />` at root (initializes P2P node on mount)
- `useStore()` hook in components for reactive state
- `dbToLocal` component handles sync UI + manual triggers

---

## 8. Error Handling & Resilience Patterns

| Layer | Pattern | Implementation |
|-------|---------|----------------|
| **P2P Lookup** | Parallel + Timeout | α=3 parallel RPCs, 5s timeout each, fallback to next closest |
| **Gateway Fallback** | Graceful Degradation | P2P → Local MongoDB → Local Worker → 503 |
| **WebRTC** | ICE Restart | On connection failure, re-negotiate via signal server |
| **MongoDB** | Retry + Circuit Breaker | Mongoose retryWrites, exponential backoff |
| **IndexedDB** | Versioned Migration | Dexie schema versions with upgrade hooks |
| **SES Sandbox** | Hard Timeout | Worker termination at 15s (both browser & Node) |
| **Network** | Offline Queue | pendingWrites persisted,