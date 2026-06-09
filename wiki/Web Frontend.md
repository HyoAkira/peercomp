---
title: "The AI Software Engineer"
source: "https://app.devin.ai/org/hyoakira/wiki/HyoAkira/bitirme2?branch=main#5"
author:
published:
created: 2026-06-09
description: "Your reliable AI software engineer"
tags:
  - "clippings"
---
## Web Frontend (apps/web)

Relevant source files

The directory contains the primary user interface for the PeerComp platform. Built with React Router v7 and Vite, it serves as the command center for users to manage serverless functions, interact with the encrypted Key-Value (KV) store, and participate in the P2P Kademlia network directly from the browser.

The application is configured as a Single Page Application (SPA) and utilizes Tailwind CSS with DaisyUI for its design system.

### System Architecture Overview

The frontend acts as a bridge between the central Org API and the decentralized P2P network. It manages authentication tokens, local databases for offline-first capabilities, and background workers for cryptographic operations.

#### Core Frontend Entities

| Entity | Responsibility |
| --- | --- |
| React Router v7 | Handles client-side routing, layout nesting, and SPA navigation. |
| Zustand Stores | Manages global state for authentication, peer node status, and data collections. |
| PeerComponent | A global provider that initializes and maintains the Kademlia node lifecycle. |
| PanelGuard | A layout-level security component that enforces JWT validity for protected routes. |
| Dexie.js | Provides IndexedDB persistence for functions and KV pairs. |

### Application Structure and Routing

The routing configuration defines a clear separation between public marketing pages, authentication flows, and the protected user dashboard.

*Diagram: High-level routing structure and layout nesting defined in.*

Sources:

- \- Route definitions and file mapping.
- \- Dependencies for UI and P2P logic.

---

### Global Providers and State

The application wraps the entire UI tree in specific logic to handle P2P connectivity and state synchronization.

#### PeerComponent

The is rendered at the root level. Its primary role is to instantiate the and ensure the browser remains a participant in the network regardless of the current sub-route. This component manages the lifecycle of the connection.

#### State Management

The application uses Zustand for lightweight, reactive state management. This includes:

- useToken: Manages JWTs and user session persistence.
- usePeerNode: Tracks the status of the local P2P node and its routing table.
- useFunctions / useKv: Synchronizes data between the Org API and the local UI.

For details on state implementation and P2P integration, see [Client-Side Libraries: State, Encryption, and Peer Integration](#5.3).

Sources:

- \- Zustand dependency.
- \- Implementation status of PeerComponent and P2P status.

---

### UI Sections

#### 5.1

Detailed breakdown of the React Router tree. This section covers how the protects user data by checking JWT expiry and how the provides a consistent sidebar-driven navigation experience for authenticated users.

#### 5.2

Deep dive into the management interfaces.

- FunctionsPage: Interface for CRUD operations on serverless functions, including code editing via.
- StoragePage: Management of the encrypted KV store, featuring visual indicators for encryption status.
- DbToLocalComponent: A background utility that synchronizes functions from the central MongoDB (via Org API) into the local Kademlia node's storage for P2P discovery.

---

### Client-Side Infrastructure

#### 5.3

Technical details on the supporting libraries:

- Web Crypto API: Offloading ECDH and AES-GCM operations to a Web Worker to keep the UI thread responsive.
- Dexie/IndexedDB: Schema definitions for and used for local persistence.
- Sandboxed Execution: Integration of and for secure code execution within the browser.

Sources:

- \- Full dependency list and build scripts.
- \- Implementation status of frontend features.