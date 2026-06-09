---
title: "The AI Software Engineer"
source: "https://app.devin.ai/org/hyoakira/wiki/HyoAkira/bitirme2?branch=main#1.1"
author:
published:
created: 2026-06-09
description: "Your reliable AI software engineer"
tags:
  - "clippings"
---
## Repository Structure and Monorepo Setup

Relevant source files

This page details the architectural layout of the PeerComp platform, a distributed browser-based serverless compute and key-value storage system. The codebase is organized as a monorepo using pnpm workspaces and Turborepo to manage dependencies and build pipelines across multiple services and shared packages.

## Monorepo Layout

The repository is divided into two main directories: for deployable services and for shared logic and configurations.

### Directory Overview

| Path | Component | Description |
| --- | --- | --- |
|  | Infrastructure | Contains Docker Compose and Nginx configurations for the core stack [memory-bank/techContext.md#19](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L19-L19) |
|  | Core API | Express-based management API for users, functions, and KV metadata [memory-bank/techContext.md#15](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L15-L15) |
|  | Frontend | React Router v7 application acting as both UI and a P2P Kademlia node [memory-bank/techContext.md#18](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L18-L18) |
|  | Gateway Node | Node.js implementation of a Kademlia node for server-side code execution [memory-bank/techContext.md#16](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L16-L16) |
|  | Signaling Server | PeerJS-based signaling for WebRTC connection establishment [memory-bank/techContext.md#17](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L17-L17) |
|  | Shared Config | Centralized service URLs and API endpoints [memory-bank/techContext.md#66-69](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L66-L69) |
|  | Shared Models | Mongoose schemas for Functions, KV, and Users [memory-bank/techContext.md#70-75](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L70-L75) |
|  | Crypto Lib | Web Worker-based cryptographic services (ECDSA, AES-GCM) [memory-bank/techContext.md#76-83](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L76-L83) |
|  | Sandbox Lib | Shared SES (Secure EcmaScript) runner logic [pnpm-lock.yaml#236-241](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L236-L241) |

### Dependency Management

The project uses workspaces. Local packages are linked using the protocol or relative file links. For example, the application consumes the shared configuration and encryption packages [pnpm-lock.yaml#139-147](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L139-L147)

Sources:

- [pnpm-lock.yaml#1-241](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L1-L241)
- [memory-bank/techContext.md#4-10](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L4-L10)
- [memory-bank/techContext.md#64-83](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L64-L83)

---

## Service Interaction and Data Flow

The PeerComp ecosystem relies on a hybrid architecture where centralized management (via ) facilitates decentralized operations (via P2P nodes).

### System Architecture Diagram

The following diagram illustrates how the five main applications interact within the monorepo structure.

Diagram: High-Level Service Interaction



Sources:

- [memory-bank/techContext.md#12-20](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L12-L20)
- [memory-bank/techContext.md#148-153](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L148-L153)
- [pnpm-lock.yaml#18-68](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L18-L68)

---

## Build System: Turborepo and pnpm

The monorepo leverages Turborepo (v2.x) to orchestrate tasks like and [memory-bank/techContext.md#7](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L7-L7) By defining workspace relationships, Turborepo ensures that shared packages (like ) are handled correctly when dependent apps are started.

### Key Scripts

- Development: The root triggers the Turborepo pipeline [memory-bank/techContext.md#125-126](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L125-L126)
- Environment Handling: Services use for configuration [pnpm-lock.yaml#29-31](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L29-L31)
- Node.js Workers: The uses the built-in for local function execution [memory-bank/techContext.md#54](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L54-L54)

### Configuration Syncing

The package serves as the single source of truth for service discovery. It contains an that defines centralized API endpoints [memory-bank/techContext.md#67-68](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L67-L68)

- : The endpoint for.
- : The endpoint for.
- : Initial bootstrap nodes for the Kademlia network.

Sources:

- [memory-bank/techContext.md#4-10](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L4-L10)
- [memory-bank/techContext.md#66-69](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L66-L69)
- [pnpm-lock.yaml#9-16](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L9-L16)

---

## Application Deep Dive

### 1\. apps/web (The Frontend & P2P Node)

The web application is a React Router v7 project [pnpm-lock.yaml#181-183](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L181-L183) It serves two roles:

1. Management UI: Allows users to manage their serverless functions and KV pairs.
2. Kademlia Node: Runs a P2P node in the browser using for WebRTC [pnpm-lock.yaml#169-171](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L169-L171) It utilizes for local persistence of the DHT state [pnpm-lock.yaml#160-162](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L160-L162) and (Secure EcmaScript) for sandboxed execution of functions [pnpm-lock.yaml#184-186](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L184-L186)

### 2\. apps/org (Management Backend)

An Express server [pnpm-lock.yaml#90-92](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L90-L92) that manages the "Source of Truth" in MongoDB. It handles:

- Authentication: JWT-based user sessions [pnpm-lock.yaml#93-95](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L93-L95)
- Metadata: Stores function code and KV metadata via [pnpm-lock.yaml#72-74](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L72-L74)

### 3\. apps/node-worker-gateway (Server-side Worker)

This is a Node.js-based participant in the P2P network. It uses for WebRTC [pnpm-lock.yaml#38-40](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L38-L40) and to safely execute user-provided JavaScript code [pnpm-lock.yaml#47-49](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L47-L49) It includes SSRF protection and a 15-second execution timeout () [memory-bank/techContext.md#160](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L160-L160)

### 4\. apps/peer\_signal (The Matchmaker)

A specialized server built with (PeerJS Server) [pnpm-lock.yaml#127-129](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L127-L129) It facilitates the exchange of WebRTC SDP offers and ICE candidates. It also exposes an HTTP endpoint for peer discovery [memory-bank/techContext.md#109-110](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L109-L110)

Diagram: Code Entity Mapping (Node & Signaling) This diagram maps logical network roles to specific implementation files and dependencies.



Sources:

- [memory-bank/techContext.md#12-19](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L12-L19)
- [pnpm-lock.yaml#18-135](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L18-L135)
- [pnpm-lock.yaml#236-241](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/pnpm-lock.yaml#L236-L241)

---

## Development Environment Infrastructure

The directory contains the environment configuration for local development.

### Nginx and TLS

To simulate a production environment locally, Nginx is used as a reverse proxy with TLS termination [memory-bank/techContext.md#148-153](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L148-L153)

- Service Ports:
	- Nginx: (Public Entry) [memory-bank/techContext.md#19](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L19-L19)
		- Org API: [memory-bank/techContext.md#15](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L15-L15)
		- GatewayNode: [memory-bank/techContext.md#16](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L16-L16)
		- Peer Signal: (HTTP) / (WS) [memory-bank/techContext.md#17](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L17-L17)
		- Vite Dev Server: [memory-bank/techContext.md#18](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L18-L18)

### Key Constants

The system behavior is governed by specific Kademlia and sandbox constants:

- : 3 (Lookup concurrency) [memory-bank/techContext.md#157](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L157-L157)
- : 20 (Bucket size) [memory-bank/techContext.md#158](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L158-L158)
- : 256 [memory-bank/techContext.md#159](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L159-L159)

Sources:

- [memory-bank/techContext.md#154-162](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L154-L162)
- [memory-bank/techContext.md#148-153](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/memory-bank/techContext.md?plain=1#L148-L153)
- [apps/web/tsconfig.json#1-30](https://github.com/HyoAkira/bitirme2/blob/7a5d8555/apps/web/tsconfig.json#L1-L30)

- [Repository Structure and Monorepo Setup](#1.1-repository-structure-and-monorepo-setup)
- [Monorepo Layout](#1.1-monorepo-layout)
- [Directory Overview](#1.1-directory-overview)
- [Dependency Management](#1.1-dependency-management)
- [Service Interaction and Data Flow](#1.1-service-interaction-and-data-flow)
- [System Architecture Diagram](#1.1-system-architecture-diagram)
- [Build System: Turborepo and pnpm](#1.1-build-system-turborepo-and-pnpm)
- [Key Scripts](#1.1-key-scripts)
- [Configuration Syncing](#1.1-configuration-syncing)
- [Application Deep Dive](#1.1-application-deep-dive)
- [1\. apps/web (The Frontend & P2P Node)](#1.1-1-appsweb-the-frontend-p2p-node)
- [2\. apps/org (Management Backend)](#1.1-2-appsorg-management-backend)
- [3\. apps/node-worker-gateway (Server-side Worker)](#1.1-3-appsnode-worker-gateway-server-side-worker)
- [4\. apps/peer\_signal (The Matchmaker)](#1.1-4-appspeer_signal-the-matchmaker)
- [Development Environment Infrastructure](#1.1-development-environment-infrastructure)
- [Nginx and TLS](#1.1-nginx-and-tls)
- [Key Constants](#1.1-key-constants)