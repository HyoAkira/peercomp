---
description: Memory Bank reading rules for PeerComp project
---

# Memory Bank — Agent Reading Rules

## Purpose
This directory contains persistent context for AI agents working on the PeerComp project. Since agent memory resets between sessions, these files are the **only** way to maintain project understanding across sessions.

## Required Reading Order (Every Session)
**MUST read all 5 files in this order before starting any task:**

| Order | File | Purpose | Key Content |
|-------|------|---------|-------------|
| 1 | `projectbrief.md` | Project foundation | What PeerComp is, core value prop, target users, key capabilities, architecture diagram, success criteria |
| 2 | `techContext.md` | Technology stack | Monorepo tools, runtime environments, dependencies by domain, shared packages, env vars, dev commands, Docker, key constants |
| 3 | `systemPatterns.md` | Architecture patterns | Component diagram, Kademlia DHT, WebRTC signaling, GatewayNode flow, SES sandbox, MongoDB↔IndexedDB sync, auth flows, error handling |
| 4 | `activeContext.md` | Current state | Focus areas, technical debt, recent changes, env status, next tasks, decision log |
| 5 | `progress.md` | Implementation status | Status matrix, feature completeness tables, milestones, blockers, KPIs |

## When to Update Memory Bank
Update relevant files **after** completing significant work:
- **projectbrief.md** — Scope changes, new capabilities added
- **techContext.md** — New dependencies, version upgrades, env changes
- **systemPatterns.md** — New architectural patterns, protocol changes
- **activeContext.md** — Focus shifts, debt resolved, new decisions, blockers changed
- **progress.md** — Feature status changes, milestones completed, KPI updates

## Quick Reference: Where to Find What

| Need | Go To |
|------|-------|
| "What is this project?" | `projectbrief.md` |
| "What tech stack / how to run?" | `techContext.md` |
| "How does X work architecturally?" | `systemPatterns.md` |
| "What's broken / what's next?" | `activeContext.md` |
| "What's done / what's % complete?" | `progress.md` |

## File Format Notes
- All files are Markdown
- Tables use GitHub-flavored markdown
- Diagrams use ASCII/mermaid-compatible syntax
- Status icons: ✅ Done, 🟡 Partial, ⬜ Planned, 🔴 Blocked

## Agent Instructions
1. **Start every session** by reading all 5 files in order
2. **Reference specific sections** when answering questions (don't guess)
3. **Update files** when you make significant changes
4. **Keep entries concise** — these are reference docs, not logs
5. **Use the task_progress parameter** in tool calls to track your work