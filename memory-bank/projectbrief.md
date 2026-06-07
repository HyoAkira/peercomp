# Project Brief: PeerComp — Decentralized P2P Function Execution Platform

## Overview
PeerComp is a decentralized peer-to-peer (P2P) platform for **distributed JavaScript function execution** and **encrypted key-value storage**. It enables users to deploy, discover, and execute sandboxed JavaScript code across a browser-based network without centralized compute infrastructure.

## Core Value Proposition
- **Serverless without servers**: Functions execute on peer nodes (browsers or Node.js gateways) instead of cloud functions
- **Censorship-resistant**: No single point of control; functions replicate across the P2P network
- **Privacy-preserving**: End-to-end encryption via ECDH-derived shared keys; optional AES encryption for KV storage
- **Local-first**: Browser peers persist data in IndexedDB (Dexie.js); syncs with MongoDB backend when online

## Target Users
- Developers wanting to deploy edge functions without cloud costs
- Privacy-conscious applications needing distributed compute
- Researchers exploring P2P systems, Kademlia DHT, and WebRTC

## Key Capabilities

### 1. Distributed Function Execution (RPC over P2P)
- Users register functions via the **org** backend API (REST, MongoDB persistence)
- Functions are discoverable by **endpoint + HTTP method + namespace**
- Execution requests route through the **GatewayNode** (Node.js HTTP→P2P bridge) or directly from browser peers
- Code executes in a **SES (Secure EcmaScript) sandbox** — isolated, no access to host APIs unless explicitly granted
- Fallback: if P2P lookup fails, GatewayNode executes locally via Node.js worker_threads

### 2. Encrypted Key-Value Storage
- Per-user, per-namespace key-value store
- Optional AES-256-GCM encryption (keys derived from user's ECDH keypair)
- Syncs between MongoDB (authoritative) and local IndexedDB (offline-first)

### 3. P2P Network Layer (Kademlia DHT)
- **KademliaNode** (browser): Joins via PeerJS signaling server, maintains k-buckets, performs iterative lookups
- **GatewayNode** (Node.js): Same DHT logic but with Node.js WebRTC implementation (`node-datachannel`, `node-peerjs`)
- XOR distance metric on 256-bit node IDs
- ALPHA=3 parallel lookups for resilience

### 4. Identity & Access Control
- User accounts with JWT authentication (org backend)
- Each user gets an ECDSA P-256 keypair (identity key) for P2P signing
- ECDH key agreement derives symmetric shared keys for encrypted messaging

## Project Scope (Current Phase)
- ✅ Monorepo structure with Turborepo + pnpm
- ✅ Org backend API (users, functions, KV)
- ✅ Peer signaling server (WebSocket + Redis pub/sub)
- ✅ GatewayNode (HTTP→P2P bridge with MongoDB fallback)
- ✅ Browser KademliaNode (WebRTC via PeerJS)
- ✅ SES sandbox execution (web worker)
- ✅ IndexedDB schema (Dexie) for local persistence
- ✅ React frontend (React Router v7) with panel for function/KV management
- ⬜ Production hardening (TLS, scaling, monitoring)
- ⬜ Mobile browser support
- ⬜ Function versioning & rollback
- ⬜ Incentive/reputation layer for peer participation

## High-Level Architecture
```
┌─────────────┐     HTTPS      ┌──────────────┐
│   Browser   │◄──────────────►│   Org API    │ (Express + MongoDB)
│  (React)    │   REST/WS      │  (port 3000) │
└──────┬──────┘                └──────────────┘
       │                              ▲
       │ WebRTC                       │ MongoDB
       ▼                              │
┌──────────────────┐                  │
│  KademliaNode    │◄── P2P DHT ──────┤  (sync via
│  (PeerJS)        │   (browser)      │   dbToLocal)
└──────┬───────────┘                  │
       │                              │
       │ WebRTC                       │
       ▼                              │
┌──────────────────┐                  │
│  GatewayNode     │◄── P2P DHT ──────┤
│  (Node.js)       │   (Node)         │
└──────┬───────────┘                  │
       │ HTTP                         │
       ▼                              │
┌──────────────┐                      │
│  Worker      │                      │
│  (SES/Sandbox)                     │
└──────────────┘                      │
                                      │
                          ┌───────────┴───────────┐
                          │    Peer Signal        │
                          │  (WebSocket + Redis)  │
                          └───────────────────────┘
```

## Success Criteria
- Functions execute reliably across ≥3 browser peers
- KV operations sync between local IndexedDB and MongoDB within 5s
- P2P lookup latency < 2s for 95th percentile
- Zero-downtime deployments via Nginx ingress (backbone)