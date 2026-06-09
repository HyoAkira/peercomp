---
title: "The AI Software Engineer"
source: "https://app.devin.ai/org/hyoakira/wiki/HyoAkira/bitirme2?branch=main#1"
author:
published:
created: 2026-06-09
description: "Your reliable AI software engineer"
tags:
  - "clippings"
---
## PeerComp Platform Overview

Relevant source files

PeerComp is a distributed, browser-based serverless compute and encrypted key-value storage platform. It leverages modern web technologies to transform browsers into active nodes of a decentralized network, allowing for serverless function execution and data persistence without traditional centralized infrastructure [memory-bank/projectbrief.md#1-10](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/projectbrief.md?plain=1#L1-L10)

The platform is built as a monorepo using pnpm workspaces and Turborepo, integrating a React-based frontend, a Node.js gateway, an Express-based management API, and a P2P signaling service, all orchestrated behind an Nginx reverse proxy with local PKI support [memory-bank/techContext.md#3-20](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L3-L20)

## Core System Architecture

PeerComp operates on a hybrid model where management tasks (user auth, function metadata) are handled by a central API, while heavy lifting (compute and storage) is distributed across peers using a Kademlia-based Distributed Hash Table (DHT) over WebRTC [memory-bank/projectbrief.md#19-36](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/projectbrief.md?plain=1#L19-L36)

### High-Level Component Interaction




Sources: [memory-bank/projectbrief.md#56-87](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/projectbrief.md?plain=1#L56-L87) [AGENTS.md#8-13](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/AGENTS.md?plain=1#L8-L13)

## Key Technologies

The platform utilizes a modern stack to enable high-performance distributed computing:

| Category | Technology | Usage in Codebase |
| --- | --- | --- |
| P2P Networking | WebRTC / PeerJS | Real-time communication via [pnpm-lock.yaml#170](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L170-L170) |
| DHT | Kademlia | Distributed routing using XOR distance and K-buckets [AGENTS.md#18-28](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/AGENTS.md?plain=1#L18-L28) |
| Compute Sandbox | SES (Secure EcmaScript) | Hardened JS environment using [pnpm-lock.yaml#47-49](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L47-L49) |
| Storage | IndexedDB / MongoDB | Local persistence via vs. global metadata in [pnpm-lock.yaml#35-160](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L35-L160) |
| Frontend | React Router v7 / Vite | SPA with hybrid routing capabilities [pnpm-lock.yaml#148-153](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L148-L153) |
| Security | Web Crypto API | ECDH key exchange and AES-GCM encryption [memory-bank/techContext.md#76-82](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L76-L82) |

Sources: [AGENTS.md#4-6](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/AGENTS.md?plain=1#L4-L6) [memory-bank/techContext.md#21-62](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L21-L62)

## Monorepo Structure

PeerComp uses a monorepo approach to manage its five primary applications and shared packages. This ensures consistency across the API definitions and deployment environments.

### Main Applications ()

1. : Infrastructure definitions, including Nginx configurations for SSL termination and routing [AGENTS.md#8](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/AGENTS.md?plain=1#L8-L8)
2. : The core REST API (Express) responsible for user management, function metadata, and the global KV registry [memory-bank/techContext.md#15](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L15-L15)
3. : The React frontend where users manage their resources and participate as DHT nodes [AGENTS.md#12](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/AGENTS.md?plain=1#L12-L12)
4. : A server-side node that participates in the DHT and provides a sandboxed environment for function execution [AGENTS.md#9](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/AGENTS.md?plain=1#L9-L9)
5. : The signaling server that facilitates WebRTC handshakes between peers using PeerJS [AGENTS.md#11](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/AGENTS.md?plain=1#L11-L11)

### Shared Packages ()

- : Centralized API endpoints and environment configurations [memory-bank/techContext.md#66-69](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L66-L69)
- : Shared Mongoose schemas (Function, KV, User) [memory-bank/techContext.md#70-75](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L70-L75)
- : Cryptographic utilities for ECDSA/ECDH and AES [memory-bank/techContext.md#76-83](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L76-L83)
- : Shared SES sandbox runner for user code [pnpm-lock.yaml#236-241](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L236-L241)

For a deep dive into the folder hierarchy and build system, see [Repository Structure and Monorepo Setup](#1.1).

## Network Routing and Subdomains

PeerComp uses a sophisticated routing mechanism to handle multi-tenancy and P2P gateway access. Nginx handles standard API traffic while routing wildcard subdomains to the Gateway application for function invocation.

Code-to-Entity Mapping: Nginx Routing

Sources: [memory-bank/techContext.md#148-152](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L148-L152) [memory-bank/projectbrief.md#58-61](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/projectbrief.md?plain=1#L58-L61)

## Child Pages

For detailed technical documentation on specific subsystems, please refer to the following pages:

- [Repository Structure and Monorepo Setup](#1.1): Detailed look at the pnpm workspace, Turborepo integration, and the shared packages.
- [Getting Started: Local Development Setup](#1.2): Instructions for environment variables, Docker Compose (MongoDB/Nginx), and running the full stack locally.