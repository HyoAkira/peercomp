# PeerComp

**Serverless JavaScript on a Kademlia DHT over WebRTC — every browser tab is a compute node. No compute cluster, no single point of control.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-5FA04E?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7.14-CA4246?style=flat-square&logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-10.33-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.9-000000?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](#license)

BSc graduation project · Full-stack · TypeScript monorepo

<!-- TODO: add screenshot: panel UI with the function editor and P2P status indicator -->

## What it is

PeerComp is a peer-to-peer platform for deploying and running **sandboxed JavaScript functions**, plus an **encrypted key-value store**. Every browser tab that loads the app joins a Kademlia DHT as a full node. Functions are stored in the DHT keyed by `namespace:function:<METHOD>:<endpoint>`, and any peer can execute any other peer's code inside a SES `Compartment` — a hardened object-capability sandbox with no access to the DOM, network primitives, or host globals.

There is no compute cluster. The only centralized components are a REST API for accounts and function metadata, and a WebRTC signaling server for the initial handshake. Once two peers are connected, function discovery, invocation, and state exchange happen directly between them.

## Why it exists

Serverless platforms moved the cost of *running* code, but left the cost of *owning* it exactly where it was: one provider, one billing account, one region, one chokepoint. Outages, price changes, rate limits, and takedown orders all land on the same door. The compute was never the hard part — the clients already have idle CPUs sitting behind them.

PeerComp asks a simple question: if the clients already have the silicon, why does the cloud have to rent it back to them? A DHT gives you the missing primitive — content-addressed lookup across an unreliable, churning set of participants — and WebRTC gives you a direct, NAT-traversable data channel between two browsers once a signaling server introduces them.

The result is a deployment model where the registry is small and auditable, the compute is borrowed from the crowd, and there is no single process whose failure takes the platform down.

<!-- TODO: add diagram: serverless chokepoint vs peer mesh -->

## Architecture

```
                                 https://peercomp.com.tr.localhost
                                            │
                                    ┌───────▼────────┐
                                    │  Nginx  :80/:443│   TLS termination
                                    │  (backbone)     │   host-based routing
                                    └───┬────┬────┬───┘
              ┌─────────────────────────┘    │    └──────────────────┐
              │                              │                       │
              │ /api/v1/                     │ /api/v1/peerserver/   │ *.peercomp.com.tr.localhost
              ▼                              ▼                       ▼
    ┌───────────────────┐        ┌────────────────────┐    ┌──────────────────────────┐
    │  apps/org         │        │  apps/peer_signal  │    │ apps/node-worker-gateway │
    │  Express 5 +      │        │  PeerJS signaling  │    │ GatewayNode (HTTP → P2P) │
    │  Mongoose :3000   │        │  WS :9000          │    │ node-datachannel :3001   │
    └─────────┬─────────┘        │  peer list :8000   │    └────────────┬─────────────┘
              │                  └─────────┬──────────┘                 │
              ▼                            │                            │
      ┌───────────────┐                    │                            │
      │   MongoDB     │◄───────────────────┘                WebRTC DataChannel
      │   :27017      │                                    (node-datachannel ↔ PeerJS)
      │  docker       │                                            │
      └───────────────┘                                            │
                                                                 ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │  PEER MESH  —  Kademlia DHT, K=20, ALPHA=3, XOR distance over 256-bit IDs  │
   │                                                                           │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
   │  │ Browser Tab A│  │ Browser Tab B│  │ Browser Tab C│  │ GatewayNode  │  │
   │  │ KademliaNode │◄►│ KademliaNode │◄►│ KademliaNode │◄►│ DHT member   │  │
   │  │  + Dexie/IDB │  │  + Dexie/IDB │  │  + Dexie/IDB │  │              │  │
   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
   │         │                 │                 │                             │
   │    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐                        │
   │    │  SES    │       │  SES    │       │  SES    │   sandboxed execution  │
   │    │Compart. │       │Compart. │       │Compart. │   (Compartment +        │
   │    │WebWorker│       │WebWorker│       │WebWorker│    lockdown())           │
   │    └─────────┘       └─────────┘       └─────────┘                        │
   └───────────────────────────────────────────────────────────────────────────┘
```

<!-- TODO: add diagram: the full flowchart image as a fallback for the mermaid below -->

```mermaid
flowchart TB
  Client["Browser tab<br/>React UI + KademliaNode"]

  subgraph Edge["Edge — TLS termination"]
    Nginx["Nginx · apps/backbone<br/>:80 / :443"]
  end

  subgraph Meta["Central metadata plane — holds no function code, no results"]
    Org["apps/org<br/>Express 5 + Mongoose<br/>:3000"]
    Signal["apps/peer_signal<br/>signaling + peer list<br/>:9000 WS / :8000 HTTP"]
    Mongo[("MongoDB<br/>:27017")]
  end

  subgraph Mesh["Peer mesh — Kademlia DHT, K=20, ALPHA=3, XOR distance"]
    DHT["DHT routing table<br/>signed STORE / FIND_VALUE / FUNCTION-CALL"]
    Gw["GatewayNode<br/>apps/node-worker-gateway<br/>node-datachannel :3001"]
  end

  subgraph Exec["Sandbox — SES Compartment + lockdown()"]
    Sess["Browser Web Worker<br/>or Node worker_threads"]
  end

  Client -->|"HTTPS"| Nginx
  Nginx -->|"/api/v1/"| Org
  Nginx -->|"/api/v1/peerserver/"| Signal
  Nginx -->|"*.peercomp.com.tr.localhost"| Gw
  Org -->|"metadata"| Mongo

  Client <-->|"signaling handshake"| Signal
  Gw <-->|"signaling handshake"| Signal

  Client <-->|"PeerJS data channel"| DHT
  Gw <-->|"FUNCTION-CALL"| DHT
  DHT -->|"run code"| Sess

  Gw -.->|"fallback: reads code"| Mongo
  Gw -.->|"fallback: runs locally"| Sess
```

Three planes, and it matters which is which:

| Plane | Components | Role |
| --- | --- | --- |
| **Edge** | Nginx (`apps/backbone`) | Terminates TLS, routes by host and path. The only public entry point. |
| **Metadata plane** | `apps/org`, MongoDB, `apps/peer_signal` | Accounts, function metadata, bootstrap handshake, peer list. Deliberately small — it holds no function code and no function results. |
| **Peer mesh** | Browser `KademliaNode`s + `GatewayNode` | Function storage, discovery, and **execution**. Scales with the users, not with a cluster. |

Nginx routing, from `apps/backbone/nginx/nginx.conf`:

| Request | Upstream | Port |
| --- | --- | --- |
| `/` | Vite dev server (`apps/web`) | 5173 |
| `/api/v1/` | `apps/org` | 3000 |
| `/api/v1/peerserver/` | `apps/peer_signal` (signaling WS) | 9000 |
| `/api/v1/peers/` | `apps/peer_signal` (peer list) | 8000 |
| `*.peercomp.com.tr.localhost` | `apps/node-worker-gateway` | 3001 |

That last row is the whole idea in one line: every deployed function gets its own subdomain, and DNS-style host routing dispatches it straight into the P2P mesh.

## How a function is deployed and invoked

This is the real code path, not an idealized one.

1. **Register.** The client `POST`s the function (name, endpoint, HTTP method, source, namespace) to `apps/org` with a JWT. `FunctionModel` persists it to MongoDB. There is a unique compound index on `(endpoint, method, namespace)` so a deployment cannot silently collide.

2. **Announce.** The client signs the deployment and pushes it into the DHT with `STORE_WITH_SIGNATURE`, keyed `` `${namespace}:function:${method}:${endpoint}` ``. Routing uses SHA-256 of the key against a 256-bit node-id space, with `K = 20` per k-bucket and `ALPHA = 3` concurrent queries.

3. **Verify.** Every peer that receives `STORE_WITH_SIGNATURE` calls `validateP2PWriteRequest` *before* accepting the write. It recomputes the namespace from the owner's SPKI public key, checks it matches the claimed namespace, then accepts either a direct owner signature or an owner-signed **delegation token** that is unexpired and whose key patterns cover the target key. A peer that does not agree rejects the write and logs why.

4. **Route.** The caller sends an ordinary HTTP request to `https://<function>.peercomp.com.tr.localhost`. Nginx matches the wildcard `server_name`, strips the subdomain, and proxies to `GatewayNode` on `:3001`.

5. **Locate.** `GatewayNode.call_function` derives the namespace from the `x-targetnamespace` header, rebuilds the DHT key, and sorts its known peers by XOR distance to the hashed key. It walks the sorted list in groups of `CHUNK_SIZE = 3` and races each group with `Promise.any` — first success wins, and no further groups are contacted.

6. **Invoke.** The winning peer receives a `FUNCTION-CALL` RPC, resolves the key with `findValue`, and spawns a worker running the function's code. Timeouts are enforced by the callers, not by the sandbox: `GatewayNode._sendRPC` gives up after 4s, and the browser-side `FUNCTION-CALL` handler terminates the worker after 5s. Both worker entrypoints also destructure a `timeout = 15000` field from the message payload, but neither currently acts on it.

7. **Fallback.** If every peer group fails, `GatewayNode` does not give up: it loads the function from MongoDB and executes it locally in a Node `worker_threads` thread through the same SES sandbox. The response is tagged `system: true` so the caller can tell the difference.

## Security model

| Concern | Mechanism | Where |
| --- | --- | --- |
| Identity | ECDSA P-256 keypair per user; namespace id is the SHA-256 digest of the SPKI public key, so the key *is* the address | `packages/encryption/utils.ts` (`IdentityKey`) |
| Transport | TLS terminated at Nginx; dev PKI with a local root CA | `apps/backbone/nginx/nginx.conf`, `apps/backbone/nginx/certs/` |
| Key agreement | ECDH P-256; the ephemeral key is signed by the identity key, so a MITM cannot substitute it | `packages/encryption/utils.ts` (`CryptoSession`) |
| Bulk encryption | AES-GCM-256 with a fresh 96-bit IV per message | `packages/encryption/utils.ts` |
| DHT write authorization | Owner signature or owner-signed delegation token; token expiry and key-pattern scope checked on **every** write | `packages/encryption/utils.ts` (`validateP2PWriteRequest`) |
| Key-pattern scoping | `doesKeyMatchPattern` limits a delegate to a set of glob key patterns | `packages/encryption/utils.ts` |
| Untrusted code | SES `Compartment` + `lockdown({ errorTaming: "unsafe", overrideTaming: "severe" })`; intrinsics frozen | `apps/node-worker-gateway/worker.mjs`, `apps/web/app/lib/peer/worker.js` |
| Capability removal | `WebSocket`, `RTCPeerConnection`, `localStorage`, `indexedDB`, `window`, `document` replaced with descriptors whose get/set **throw** `SecurityError` | `packages/worker/index.js` |
| Runaway code | Caller-side wall clock: the gateway abandons a peer RPC after 4s, the browser-side `FUNCTION-CALL` handler calls `worker.terminate()` after 5s | `apps/node-worker-gateway/node.ts`, `apps/web/app/lib/peer/peer-node.ts` |
| SSRF from sandbox | `isPrivateOrInvalidIP` blocks `localhost`, loopback, RFC1918 (`10/8`, `172.16/12`, `192.168/16`), link-local, broadcast and IPv6 private/ULA ranges before the request leaves the sandbox | `apps/web/app/lib/peer/worker.js` — **but see Known issues** |
| Password storage | bcrypt | `apps/org` |
| API auth | JWT access + refresh, `httpOnly` cookie, role check (`admin` / `user`) | `apps/org/src/middlewares/auth/index.ts` |

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript 5.9 (strict), JavaScript for two worker entrypoints |
| Runtime | Node.js >= 20 |
| Monorepo | pnpm workspaces 10.33 + Turborepo 2.9 |
| Frontend | React 19.2, React Router 7.14, Vite 8, Tailwind 4.2, DaisyUI 5.5, Zustand, Dexie 4.4 |
| Backend | Express 5.2, Mongoose 9.6, Zod 4.4, bcrypt 6, jsonwebtoken |
| P2P transport | WebRTC DataChannels — PeerJS 1.5.5 (browser + signaling), node-datachannel 0.32.3 (gateway) |
| DHT | Custom Kademlia implementation (`K = 20`, `ALPHA = 3`, XOR distance over 256-bit ids) |
| Crypto | Web Crypto API — ECDSA P-256, ECDH P-256, AES-GCM-256, SHA-256 |
| Sandbox | SES (`ses` 2.1.0) `Compartment` + `lockdown()` |
| Local persistence | IndexedDB via Dexie, with a MongoDB ↔ IndexedDB sync queue |
| Routing / TLS | Nginx reverse proxy, local root CA |
| Packaging | Docker Compose (MongoDB, Nginx, Redis) |
| Intermediary data | Redis 5 (wired in `peer_signal`, currently not deployed) |

## Features

**Distributed execution**

- Browser tabs are first-class DHT nodes — no dedicated compute host required
- Function store and lookup over a real Kademlia DHT with signed writes
- RPC fan-out in groups of 3 with `Promise.any` racing and graceful degradation to the next group
- Automatic P2P → MongoDB → local-worker fallback when no peer answers
- The same sandbox runs in a browser Web Worker and in a Node `worker_threads` thread
- Endpoint-based routing: `<function>.peercomp.com.tr.localhost` maps to a function

**Security**

- ECDSA P-256 identities; namespace derived from the public key digest
- ECDH P-256 sessions with signed ephemeral keys (MITM-evident handshake)
- AES-GCM-256 with per-message 96-bit IVs for KV payloads
- Owner-signed, expiring, key-pattern-scoped delegation tokens
- Every DHT write re-validated on the receiving peer, not just on the sender
- SES object-capability sandbox; ambient authority removed rather than filtered
- JWT access + refresh with role-based access control

**Platform**

- Offline-first UI: every read from IndexedDB, writes queued and replayed
- Per-user, per-namespace encrypted key-value store
- Full function and KV management panel with a code editor
- MongoDB ↔ IndexedDB bidirectional sync with optimistic local updates
- Signaling server with peer list endpoint and LRU-cached session state

**Engineering**

- pnpm workspaces + Turborepo monorepo, one `pnpm dev` for all five services
- Shared internal packages: `config`, `models`, `encryption`, `worker`
- Nginx host-based routing with a local PKI for secure-context development
- Domain concepts documented across 27 wiki pages and a structured memory bank
- TypeScript strict mode across packages

## Getting started

### Prerequisites

- **Node.js >= 20**
- **pnpm** (`corepack enable pnpm` is fine)
- **Docker + Docker Compose**
- A browser with WebRTC and Web Crypto — both require a **secure context**, which is why the dev setup below is HTTPS rather than plain localhost

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the backbone (MongoDB + Nginx)

```bash
cd apps/backbone
docker volume create org_peercomp_data   # the compose file expects this external volume
docker compose up -d
```

This brings up MongoDB on `:27017` and Nginx on `:80` / `:443`. Credentials are in `apps/backbone/docker-compose.yaml`: `[REDACTED_LOCAL_DEV_USER]` / `[REDACTED_LOCAL_DEV_PASSWORD]`.

### 3. Map the dev domain

```bash
# /etc/hosts  (sudo on Linux/macOS, edit as Administrator on Windows)
127.0.0.1 peercomp.com.tr.localhost
```

The wildcard cert covers `*.peercomp.com.tr.localhost`, and each function is served from its own subdomain, so the root entry is what makes host-based routing resolve at all.

### 4. Trust the dev certificate

The root CA is at `apps/backbone/nginx/certs/rootCA.pem`. Import it into your OS and browser trust store, or every WebRTC and Web Crypto call fails on an insecure context.

```bash
# macOS
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  apps/backbone/nginx/certs/rootCA.pem

# Linux (Debian/Ubuntu)
sudo cp apps/backbone/nginx/certs/rootCA.pem \
  /usr/local/share/ca-certificates/peercomp-rootCA.crt
sudo update-ca-certificates
```

### 5. Environment variables

```env
MONGODB_URI=mongodb://[REDACTED_LOCAL_DEV_USER]:[REDACTED_LOCAL_DEV_PASSWORD]@localhost:27017/peercomp?authSource=admin
JWTSECRET=<a long random string>
NODE_ENV=development
```

> **Note the name.** The JWT secret variable is `JWTSECRET`, not `JWT_SECRET`. See `apps/org/src/middlewares/auth/index.ts`. There is a committed `.env` in `apps/node-worker-gateway`; treat its values as development-only.

### 6. Run the services

```bash
pnpm dev          # turbo dev — starts every app with a persistent dev task
```

Or one at a time:

```bash
pnpm --filter web dev                                   # apps/web            :5173
pnpm --filter org dev                                   # apps/org            :3000
pnpm --filter node-worker-gateway dev                   # gateway             :3001
pnpm --filter peer_signal dev                           # signaling     :9000 / :8000
cd apps/backbone && docker compose up -d                # mongo :27017, nginx :80/:443
```

### 7. Verify it works

1. Open **`https://peercomp.com.tr.localhost`** in two browser tabs. The lock icon must be clean — a TLS warning means the CA is not trusted and crypto will not initialize.
2. Register an account in tab A. `apps/org` mints a JWT pair and generates your ECDSA P-256 keypair at registration.
3. In tab B, register a second account. Both tabs are now separate DHT nodes.
4. Watch the **P2P status indicator** in the panel. Once both tabs complete the signaling handshake, each should report connected peers. PeerJS assigns a fresh peer id per session, so this is where flakiness shows up first.
5. Create a function in tab A — for example an endpoint `hello` with `return "hi from " + args.name`. It is written to MongoDB and announced into the DHT.
6. Call it: `curl -X POST https://hello.peercomp.com.tr.localhost -H 'Content-Type: application/json' -d '{"args":["peer"]}' -H 'x-targetnamespace: <SPKI public key>'`.
7. Look at the gateway log. If a peer answered you get the peer's result; if the response body carries `system: true`, the P2P path failed and the gateway executed the function from MongoDB locally instead. Both are correct behavior — the second one is the fallback working.

## Project structure

```
peercomp/
├── apps/
│   ├── web/                        React Router 7 SPA + browser KademliaNode
│   │   └── app/
│   │       ├── components/         Panel UI, function/KV editors
│   │       ├── lib/
│   │       │   ├── dexie/          IndexedDB schema + sync queue
│   │       │   ├── peer/           peer-node.ts (DHT), worker.js (SES)
│   │       │   └── store/          Zustand state
│   │       ├── pages/              Landing, auth, panel
│   │       └── root.tsx            Mounts the root P2P node
│   ├── org/                        Express 5 REST API + Mongoose        :3000
│   │   └── src/{routes,controller,services,middlewares}
│   ├── node-worker-gateway/        HTTP → P2P bridge (GatewayNode)      :3001
│   │   ├── main.ts  node.ts  worker.mjs
│   ├── peer_signal/                WebRTC signaling                     :9000 / :8000
│   └── backbone/                   Nginx + MongoDB + local PKI
│       ├── docker-compose.yaml
│       └── nginx/{nginx.conf,certs/}
├── packages/
│   ├── config/                     Centralized, Zod-validated API endpoints
│   ├── models/                     Mongoose schemas (user, function, kv)
│   ├── encryption/                 IdentityKey, CryptoSession, validateP2PWriteRequest
│   └── worker/                     SES Compartment runner
├── wiki/                           27 technical pages
├── memory-bank/                    Structured project memory (see AGENTS.md)
├── Ön Rapor/rapor.md               Graduation pre-report (Turkish)
└── AGENTS.md
```

## Project documents

| Document | What it covers |
| --- | --- |
| [PeerComp Platform Overview](wiki/PeerComp%20Platform%20Overview.md) | System-level introduction |
| [Getting Started: Local Development Setup](wiki/Getting%20Started%20Local%20Development%20Setup.md) | Full environment bring-up |
| [Repository Structure and Monorepo Setup](wiki/Repository%20Structure%20and%20Monorepo%20Setup.md) | pnpm + Turborepo layout |
| [P2P Network Layer](wiki/P2P%20Network%20Layer.md) | Kademlia design, routing, RPC |
| [Browser KademliaNode](wiki/Browser%20KademliaNode.md) | The in-browser DHT node |
| [GatewayNode and Worker Execution](wiki/GatewayNode%20and%20Worker%20Execution.md) | HTTP → P2P bridge and fallback |
| [PeerSignal Signaling Server](wiki/PeerSignal%20Signaling%20Server.md) | Handshake and peer list |
| [Sandboxed Code Execution](wiki/Sandboxed%20Code%20Execution.md) | SES Compartment design |
| [Security Architecture](wiki/Security%20Architecture.md) | Threat model and controls |
| [End-to-End Encryption for KV Storage](wiki/End-to-End%20Encryption%20for%20KV%20Storage.md) | ECDH + AES-GCM flow |
| [Nginx Reverse Proxy and Routing](wiki/Nginx%20Reverse%20Proxy%20and%20Routing.md) | Host-based routing table |
| [TLS / PKI Configuration](wiki/TLS%20-%20PKI%20Configuration.md) | Local certificate authority |
| [Infrastructure and Backbone](wiki/Infrastructure%20and%20Backbone.md) | Docker Compose stack |
| [Org API Service](wiki/Org%20API%20Service.md) · [User Management API](wiki/User%20Management%20API.md) · [Functions API](wiki/Functions%20API.md) · [Key-Value Storage API](wiki/Key-Value%20Storage%20API.md) | REST surface |
| [Web Frontend](wiki/Web%20Frontend.md) · [Routing and Page Structure](wiki/Routing%20and%20Page%20Structure.md) · [User Panel](wiki/User%20Panel%20-%20Functions%20and%20KV%20Management.md) | Frontend |
| [Shared Packages](wiki/Shared%20Packages.md) | `config`, `models`, `encryption`, `worker` |
| [Glossary](wiki/Glossary.md) | Term definitions |
| [Ön Rapor (Turkish)](Ön%20Rapor/rapor.md) | The graduation pre-report |
| [`memory-bank/`](memory-bank/) | `projectbrief` · `techContext` · `systemPatterns` · `activeContext` · `progress` |
| [`AGENTS.md`](AGENTS.md) | Reading rules and update procedure for the memory bank |

## Status

This is a graduation project and it is not finished. What follows is the honest state of it, including the parts that do not work yet.

### Working

- `apps/org` REST API: users, functions, KV CRUD, JWT auth, Zod validation
- Browser `KademliaNode`: k-buckets, iterative lookup, the full RPC set, signed writes
- SES sandbox in both browser Web Worker and Node `worker_threads`, with ambient-authority removal
- `validateP2PWriteRequest`: namespace binding, owner signatures, expiring scoped delegation tokens
- `GatewayNode`: HTTP → P2P invocation, group-of-3 fan-out, MongoDB → local-worker fallback
- Offline-first panel: Dexie-backed reads, write queue, bidirectional sync
- Nginx host-based routing and TLS termination with the local PKI

### Known issues

| Issue | Detail |
| --- | --- |
| **No automated tests** | 0% coverage. `packages/encryption/test.ts` is a manual demo script, not a suite. No Vitest, no Playwright. |
| **No CI** | No GitHub Actions. Builds are manual. |
| **SSRF guard not in scope in `packages/worker`** | `isPrivateOrInvalidIP` is defined in `apps/web/app/lib/peer/worker.js` but is *called* from `packages/worker/index.js`, where it is not defined. Sandboxed `fetch` therefore throws `ReferenceError` instead of being guarded. Effectively sandboxed `fetch` is broken rather than blocked. |
| **Sandbox KV SDK never injected** | `kvPermission` is received in `worker.mjs` and then dropped; `runUserCodeInSES(code, args)` is called without it, and the KV SDK is never passed into the compartment. Functions cannot touch the key-value store from inside the sandbox. |
| **No persistent peer identity** | PeerJS assigns an ephemeral peer id per session, and `GatewayNode.id` is a hardcoded constant (`"6761…3031"`). A browser restart means a new identity. |
| **No TURN server** | STUN only (`stun.l.google.com`). Symmetric NATs are unreachable — hence the ~80% connection rate. |
| **Peer reconnection / ICE restart** | In progress on a separate branch; not merged. |
| **Redis wired but not deployed** | The `peer_signal` pub/sub code is written; the compose service is commented out. |
| **Sync conflict rate ~5%** | Against a <1% target. Server-wins resolution plus clock skew; needs hybrid logical clocks. |
| **P2P lookup p95 ~3–5s** | Against a <2s target. |
| **Gateway fallback cold start ~800ms** | Against a <200ms target. |
| **Peer connection success ~80%** | Against a >95% target. NAT traversal. |
| **`apps/web/Dockerfile` is broken** | Runs `npm ci` against a `package-lock.json` that does not exist in a pnpm workspace. The web image does not build as written. |
| **Production TLS** | Let's Encrypt automation not implemented; dev certs are self-signed. |
| **Observability** | `console.log` only. No structured logging, no health checks, no metrics. |

### Not started

- Function versioning and rollback
- Execution logs and metrics
- Scheduled / cron functions
- Function composition (chaining)
- True P2P KV replication (only MongoDB ↔ IndexedDB sync exists today)
- Peer reputation and scoring
- An incentive layer for peer participation
- Production observability, CI/CD, and load testing

## License

MIT © 2026 Umut Can Akçay. See [LICENSE](LICENSE).