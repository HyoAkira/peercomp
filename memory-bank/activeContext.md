# Active Context: PeerComp Development Status

## Current Focus Areas (as of latest commit d6c6b35)

### 1. P2P Network Stability
- **Issue**: Browser peers occasionally fail to bootstrap when Peer Signal server restarts
- **Root Cause**: PeerJS ID assignment is ephemeral; no persistent peer identity across sessions
- **Mitigation**: GatewayNode uses hardcoded Node ID; browser peers need similar persistence (stored in IndexedDB)

### 2. SES Sandbox Completeness
- **Current**: Basic `console`, `setTimeout`, `fetch` allowed
- **Missing**: 
  - KV storage API inside sandbox (would enable functions to read/write KV)
  - HTTP client with timeout controls
  - Crypto primitives (Web Crypto API already available in worker context)
- **Priority**: High — needed for useful serverless functions

### 3. IndexedDB Sync Reliability
- **Issue**: `dbToLocal` sync occasionally creates duplicate entries on conflict
- **Cause**: `updatedAt` comparison doesn't account for clock skew between client/server
- **Fix Planned**: Use vector clocks or hybrid logical clocks (HLC)

### 4. GatewayNode Fallback Performance
- **Current**: MongoDB query + worker_threads spawn on every P2P miss
- **Optimization**: Cache function code in memory (LRU, TTL 5min) to avoid DB round-trip
- **Impact**: Reduces cold-start latency from ~800ms to ~150ms

### 5. Signaling Server Scaling
- **Current**: Single PeerJS instance + Redis pub/sub (commented out in backbone)
- **Blocker**: Redis container not in docker-compose; peer_signal/redis.ts has connection logic but unused
- **Action**: Uncomment Redis in backbone/docker-compose.yaml, verify pub/sub works

---

## Known Technical Debt

| Area | Debt Item | Severity | Effort |
|------|-----------|----------|--------|
| **Security** | Private keys stored in plaintext in MongoDB (UserModel.keypair.privateKey) | High | Medium |
| **Security** | No rate limiting on Org API endpoints | Medium | Low |
| **P2P** | No peer reputation/scoring — malicious peers can poison DHT | High | High |
| **P2P** | No NAT traversal beyond STUN (no TURN server configured) | Medium | Medium |
| **Frontend** | No automated tests (unit, integration, e2e) | Medium | High |
| **Gateway** | Hardcoded Node ID — should derive from persistent keypair | Low | Low |
| **Sync** | No background sync service worker for offline push | Medium | Medium |
| **Types** | `any` types in peer-node.ts message handlers | Low | Low |

---

## Recent Changes (Git History)

### Latest Commits (from `git log --oneline -10`)
```
d6c6b35 feat: add dbToLocal sync component and Dexie schema
a1f2c8e fix: gateway fallback worker timeout handling
7e9b4f3 refactor: extract encryption package to Web Worker
3m2k1p9 feat: add Kademlia DHT implementation in peer-node.ts
8n4v6x2 chore: setup Turborepo + pnpm workspace
```

### In-Progress Branches
- `feature/function-versioning` — adds version field to FunctionModel, not merged
- `fix/peer-reconnection` — handles WebRTC ICE restart, WIP

---

## Environment Status

### Local Development
```bash
# All services running via Turborepo
pnpm dev
# → org:3000, gateway:3001, signal:8000/9000, web:5173

# MongoDB + Nginx via Docker
cd apps/backbone && docker compose up -d
# → mongo:27017, nginx:80/443
```

### Required for Full P2P Test
1. Start MongoDB + Nginx (backbone)
2. Start Peer Signal (`cd apps/peer_signal && pnpm dev`)
3. Start Org API (`cd apps/org && pnpm dev`)
4. Start GatewayNode (`cd apps/node-worker-gateway && pnpm dev`)
5. Start Web (`cd apps/web && pnpm dev`)
6. Open **two browser tabs** to `https://peercomp.com.tr.localhost` (needs `/etc/hosts` entry)
7. Register two users, deploy functions, test cross-peer execution

### Known Env Issues
- Self-signed certs in `backbone/nginx/certs/` cause browser warnings
- `/etc/hosts` must map `peercomp.com.tr.localhost` → `127.0.0.1`
- WebRTC requires HTTPS (works on localhost with cert warnings accepted)

---

## Next Immediate Tasks

1. **Fix private key storage** — encrypt at rest using envelope encryption (master key in env)
2. **Enable Redis** in backbone/docker-compose.yaml and verify peer_signal pub/sub
3. **Add KV API to SES sandbox** — expose `kv.get(key)`, `kv.set(key, value)` to user functions
4. **Implement HLC timestamps** for conflict-free sync
5. **Add rate limiting** middleware to Org API (express-rate-limit)
6. **Write integration tests** for GatewayNode fallback path

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01 | Use PeerJS over raw WebRTC | Faster prototyping; handles signaling/ICE |
| 2025-01 | SES over `vm2` or `isolated-vm` | Standards-based, browser-compatible, actively maintained |
| 2025-01 | Dexie.js over raw IndexedDB | Type-safe, reactive, handles schema migrations |
| 2025-01 | Turborepo over Nx | Simpler config, sufficient for this scale |
| 2025-01 | React Router v7 (framework mode) | File-based routes, SSR-ready, active development |
| 2025-01 | X25519 for ECDH (not P-256) | Better performance, same security level, widely supported |
| 2025-01 | ALPHA=3, K=20 | Standard Kademlia defaults; balances latency vs. redundancy |