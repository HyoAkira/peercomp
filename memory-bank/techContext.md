# Technology Context: PeerComp

## Monorepo & Build System
| Tool | Version | Purpose |
|------|---------|---------|
| **pnpm** | 10.33.2 | Package manager with workspace support |
| **Turborepo** | ^2.x | Build orchestration (dev task pipeline) |
| **TypeScript** | ^5.x | Primary language across all packages |
| **Vite** | ^5.x | Frontend dev server & bundler (web app) |
| **React Router** | ^7.x | File-based routing (SSR/CSR hybrid) |

## Runtime Environments
| Environment | Entry Point | Port | Description |
|-------------|-------------|------|-------------|
| **Org API** | `apps/org/src/main.ts` | 3000 | Express REST API (users, functions, KV) |
| **GatewayNode** | `apps/node-worker-gateway/main.ts` | 3001 | HTTP→P2P bridge + local worker fallback |
| **Peer Signal** | `apps/peer_signal/main.ts` | 8000/9000 | WebSocket signaling (PeerJS + Redis pub/sub) |
| **Web Frontend** | `apps/web/app/root.tsx` | 5173 (dev) | React SPA served by Vite |
| **Nginx Ingress** | `apps/backbone/nginx/nginx.conf` | 80/443 | TLS termination, reverse proxy |

## Core Dependencies by Domain

### P2P & Networking
| Package | Version | Used In |
|---------|---------|---------|
| `peerjs` | ^1.5.x | Browser WebRTC abstraction |
| `@peerjs/peerjs-server` | ^0.6.x | Signaling server (peer_signal) |
| `node-peerjs` | ^1.x | Node.js PeerJS client (GatewayNode) |
| `node-datachannel` | ^0.x | WebRTC data channels in Node.js |
| `ws` | ^8.x | WebSocket server (peer_signal) |
| `ioredis` | ^5.x | Redis client (pub/sub for signaling) |

### Cryptography & Security
| Package | Version | Purpose |
|---------|---------|---------|
| `@noble/secp256k1` | ^2.x | ECDSA signing (identity keys) |
| `@noble/hashes` | ^1.x | SHA-256, HKDF |
| `node-forge` | ^1.x | X.509, PKI utilities |
| `jsonwebtoken` | ^9.x | JWT auth (org API) |
| `bcryptjs` | ^2.x | Password hashing |
| `zod` | ^3.x | Schema validation |

### Database & Persistence
| Package | Version | Purpose |
|---------|---------|---------|
| `mongoose` | ^8.x | MongoDB ODM (org, gateway, models) |
| `dexie` | ^4.x | IndexedDB wrapper (browser local storage) |
| `redis` | ^4.x | Redis client (commented out in backbone) |

### Sandbox & Execution
| Package | Version | Purpose |
|---------|---------|---------|
| `@endo/ses` | ^1.x | Secure EcmaScript sandbox (SES) |
| `worker_threads` | built-in | Node.js worker for local function execution |

### Frontend UI
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.x | UI library |
| `react-dom` | ^18.x | DOM renderer |
| `daisyui` | ^4.x | Tailwind CSS component library |
| `tailwindcss` | ^3.x | Utility-first CSS |

## Shared Packages (Internal)

### `@peercomp/config` (`packages/config/`)
- **`api.json`**: Centralized API endpoints (`https://peercomp.com.tr.localhost` for org, signaling, gateway)
- **`index.ts`**: Type-safe config export with Zod validation

### `@peercomp/models` (`packages/models/`)
Mongoose models shared across org API and GatewayNode:
- `FunctionModel` — function registry (name, endpoint, method, code, author, namespace)
- `KVModel` — encrypted key-value store (key, value, encrypted buffers, IV, namespace)
- `UserModel` — user accounts with ECDSA keypair (custom 256-bit hex `_id`)

### `@peercomp/encryption` (`packages/encryption/`)
Web Worker-based cryptographic services:
- **Key generation**: ECDSA P-256 keypairs (identity), X25519 for ECDH
- **Signing/Verification**: EdDSA signatures for P2P messages
- **Key Agreement**: ECDH → HKDF-SHA256 → AES-256-GCM keys
- **Encryption/Decryption**: AES-GCM with 96-bit IV
- Runs in a dedicated Web Worker (`worker.js`) to avoid blocking main thread

## Environment Variables

### Required for All Services
```bash
MONGODB_URI=mongodb://[REDACTED_LOCAL_DEV_USER]:[REDACTED_LOCAL_DEV_PASSWORD]@localhost:27017
JWT_SECRET=<32+ char random string>
NODE_ENV=development|production
```

### Org API (`apps/org/`)
```bash
PORT=3000
```

### GatewayNode (`apps/node-worker-gateway/`)
```bash
PORT=3001
PEERJS_HOST=127.0.0.1
PEERJS_PORT=9000
PEERJS_PATH=/peerjs/peerjs
BOOTSTRAP_URL=http://localhost:8000/peers
```

### Peer Signal (`apps/peer_signal/`)
```bash
PORT=8000          # HTTP /peers endpoint
WS_PORT=9000       # WebSocket signaling
REDIS_URL=redis://:[REDACTED_LOCAL_DEV_PASSWORD]@localhost:6379
```

### Web Frontend (`apps/web/`)
```bash
VITE_API_BASE=https://peercomp.com.tr.localhost/api
VITE_SIGNALING_URL=wss://peercomp.com.tr.localhost/peerjs/peerjs
```

## Development Commands
```bash
# Install all dependencies
pnpm install

# Start all dev servers (via Turborepo)
pnpm dev

# Individual app dev commands
cd apps/org && pnpm dev          # tsx --watch src/main.ts
cd apps/node-worker-gateway && pnpm dev
cd apps/peer_signal && pnpm dev
cd apps/web && pnpm dev          # vite dev

# Build web for production
cd apps/web && pnpm build

# Type-check all packages
pnpm --filter "..." exec tsc --noEmit
```

## Docker & Deployment
| File | Purpose |
|------|---------|
| `apps/backbone/docker-compose.yaml` | MongoDB + Nginx (SSL certs in `nginx/certs/`) |
| `apps/web/Dockerfile` | Multi-stage build (Node → Nginx) for web frontend |
| `apps/org/docker-compose.yaml` | Org API standalone (if needed) |

### Nginx Config (`apps/backbone/nginx/nginx.conf`)
- TLS termination with self-signed certs (dev) / Let's Encrypt (prod)
- Routes `/api/*` → org:3000
- Routes `/peerjs/*` → peer_signal:9000 (WebSocket upgrade)
- Routes `*.peercomp.com.tr` → gateway:3001 (subdomain extraction)

## Key Configuration Constants
| Constant | Value | Location |
|----------|-------|----------|
| `ALPHA` | 3 | Kademlia parallel lookup concurrency |
| `K` (k-bucket size) | 20 | Max peers per k-bucket |
| `NODE_ID_BITS` | 256 | Identity key / node ID length |
| `SES_TIMEOUT` | 15000ms | Sandbox execution timeout (gateway worker) |
| `DHT_REFRESH_INTERVAL` | 30000ms | Periodic bucket refresh |

## Version Constraints & Compatibility Notes
- **Node.js**: ≥20.x (required for `node-datachannel`, modern crypto)
- **MongoDB**: ≥6.x (for retryable writes, transactions)
- **Redis**: ≥7.x (for pub/sub, commented out in backbone)
- **Browser**: WebRTC DataChannel, IndexedDB, Web Workers, Web Crypto API
- **TypeScript**: `strict: true`, `moduleResolution: bundler`, `target: ES2022`