# Protocol Explorer

An interactive networking lab that makes the internet easier to understand. Follow animated packet exchanges, move through guided lessons, and inspect the messages behind everyday connections.

This is an independent implementation inspired by [Protocol Explorer](https://protocol-explorer-alpha.vercel.app/), with an original React interface and lesson data. It does not reuse that site's source code or assets.

## Features

- **20 complete lessons:** HTTP, HTTPS, WebSocket, TCP, UDP, QUIC, DNS, IPv4, IPv6, ICMP, ARP, DHCP, Ethernet, Wi-Fi, TLS, SSH, SMTP, IMAP, FTP, and NTP.
- Animated network diagrams and interactive sequence diagrams.
- Play, pause, restart, speed control, step navigation, and packet-by-packet progression.
- Guided and advanced learning modes, a packet inspector, and JSON trace export.
- Searchable, categorized protocol library, 24-term glossary, and protocol reference table.
- Four learning paths, lesson progress, and a knowledge check for every protocol.
- Dark and light themes, keyboard controls, reduced-motion support, and responsive mobile navigation.
- Shareable lesson URLs, for example `/?protocol=https`.

## Run locally

Requires **Node.js 22.12+** (Node 24 LTS recommended).

```bash
npm ci
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

```bash
npm run build       # TypeScript check + production bundle in dist/
npm run preview     # Serve the production bundle locally
npm test            # Lesson data and persistence validation
npm run test:e2e     # Browser interaction tests
```

Install the browser once before running end-to-end tests:

```bash
npx playwright install --with-deps chromium
```

If Chromium is already installed, use its path instead:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

## Deploy

This is a static application. There are no API keys, accounts, or backend services to configure.

### Vercel

1. Import this repository into Vercel.
2. Select the **Vite** framework preset.
3. Build command: `npm run build`. Output directory: `dist`.
4. Deploy. Query-string lesson links work without SPA route rewrites.

The same `dist/` output can be hosted on Netlify, Cloudflare Pages, or any static host. Assets use a relative base so hosting under a subdirectory is supported.

## Project structure

```text
src/
  App.tsx                      Application navigation and simulation controller
  state.ts                     Local preferences, deep links, and learning progress
  styles.css                   Responsive design system and themes
  components/
    NetworkDiagram.tsx         Network and sequence renderers
    LessonDetail.tsx           Guided explanation and knowledge checks
    PacketInspector.tsx        Message fields and decoded-content viewer
    LearningViews.tsx          Learning paths, glossary, and protocol reference
    Modal.tsx                  Accessible native dialog
  data/
    protocols.ts               Typed lesson, device, packet, and quiz definitions
    glossary.ts                Networking terminology
    protocols.test.ts          Data and progress validation
  main.tsx                     React entry point and self-hosted fonts
tests/explorer.spec.ts         Desktop and mobile browser tests
```

## Add a lesson

Add a `Protocol` in `src/data/protocols.ts`, with a unique ID, diagram devices, explanatory steps, packet exchanges, and a quiz. Every packet's `from` and `to` must match a device ID. Add the protocol ID to one learning path. The sidebar, diagrams, inspector, and reference table pick up the new lesson automatically. Run the checks after changing lesson data.

## Keyboard shortcuts

| Action                         | Shortcut            |
| ------------------------------ | ------------------- |
| Play / pause                   | Space               |
| Next / previous step           | Right / Left arrow  |
| Next packet                    | S                   |
| Jump to a step                 | 1–9                 |
| Reset lesson                   | R                   |
| Switch network / sequence view | V                   |
| Decrease / increase speed      | [ / ]               |
| Search protocols               | Ctrl+K, Cmd+K, or / |
| Switch theme                   | T                   |
| Open help                      | ?                   |

Native button keyboard behavior is preserved when a button has focus. Shortcuts do not interrupt text input or open dialogs.

## Educational scope and privacy

These are **illustrative simulations**, not live captures or a network emulator. Timings, packet sizes, and decoded content are examples. Some exchanges group messages or omit routine acknowledgments to keep the lessons readable. IP addresses use private or documentation ranges. The OSI model is approximate for some protocols.

Progress and preferences are stored in this browser's `localStorage`; they do not sync across devices. The app makes no telemetry calls. Fonts and icons are bundled locally. RFC links open the relevant primary specification.

## Stack

React 19, TypeScript, Vite, Lucide icons, DM Sans, JetBrains Mono, Vitest, and Playwright.
