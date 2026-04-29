# AI Icon Generator — Project State

> **Read this first.** Optimised for an AI agent picking up the project cold in a new session. Skim the **TL;DR**, then dive into the section relevant to the task.

---

## TL;DR for future-me

- **What it is**: a mobile-first PWA that generates vector-style icons via AI. Multi-vendor (OpenAI + Google Gemini), multi-style, with edit/inspire reference modes, batch mode, and bulk ops (download ZIP, copy, delete, BG removal).
- **Where it lives**: `C:\Users\rodri\Projects\AI Studio Projects\ai-icon-generator`
- **Where it runs**: locally via PM2 process `ai-icon-generator` on `127.0.0.1:3444`, fronted by **nginx** at `https://icongen.rodrigofd.pro`. Production mode (`NODE_ENV=production`) — Express serves the prebuilt `dist/`.
- **Frontend bundle**: produced by `npm run build`. Express static-serves `dist/`. Nothing reloads automatically — you **must rebuild** for frontend changes to land.
- **Server changes**: require `pm2 restart ai-icon-generator --update-env`.
- **Public URL is the source of truth** for verification (Chrome DevTools MCP). Localhost works too (`http://localhost:3444`) but bypasses nginx.
- **Two AI vendors, two adapters, one provider abstraction** — see [`src/services/providers/`](#service-layer).
- **Two prompt builders, one entry point** — vendor-tuned base prompts (`src/utils/promptBuilder.ts`).
- **Latency reality**: gpt-image-2 takes 150–200s at `quality: 'high'`, 15–20s at `'low'`. nginx `proxy_read_timeout` is set to **600s** for this vhost (don't lower it below ~300s).
- **Don't** read `OPENAI_API_KEY` directly — it's in pm2's environment, accessible to the running process via `process.env`. Use a script that runs in pm2's env if you need to test.

---

## Current State

- **Version**: `1.11.0` (also surfaced in the UI as a badge next to the title; injected at build time via Vite `define` from `package.json`).
- **Status**: fully functional in production. All flows verified end-to-end on the public URL.
- **Last 5 commits** (most recent first):
  1. `616e562` Replace native model dropdown with mobile-friendly selector
  2. `3b66bb5` Add OpenAI image generation, vendor adapter pattern, and tunable quality
  3. `32a6f67` Remove deprecated `window.aistudio` API declaration and update known issues
  4. `061f139` Restructure codebase, decompose monolith, modernize build stack
  5. `14f5de1` Initial commit
- **Remote**: `https://github.com/rodrigofd/ai-icon-generator.git` (origin, tracking `main`).

### Working features

- 6 icon styles: Monochrome, Flat (colored), Outline, Gradient, Isometric, 3D Render
- 1 / 2 / 4 / 8 variants per prompt (parallel API calls for Gemini, batched via `n` for OpenAI)
- Batch mode (multiple prompts, one per line)
- Reference modes:
  - **Edit** — modify a previously generated icon ("change only X, keep everything else the same")
  - **Inspire** — generate a new icon matching the style of one (or several uploaded) reference image(s)
- Image upload (file picker, paste, drag-drop) for inspiration
- Background removal — AI-assisted (model edit endpoint) + downstream canvas chroma-key for vendors that don't support transparency natively
- Multi-select (click, shift, ctrl, drag-box, mobile long-press); bulk download ZIP / copy / delete / remove BG
- Keyboard shortcuts: `Ctrl+Enter` (generate), `Ctrl+A` (select all), `Ctrl+Z` (undo delete), `Delete`, `Escape`
- Persistent history (IndexedDB via `localforage`); undo for deletions
- Dark/light/system theme (`ThemeContext`)
- Mobile-first: sticky compact header, bottom-sheet model selector, touch-friendly tap targets
- PWA: `manifest.json`, service worker (`sw.js`), installable
- 5 models across 2 vendors (see [Models](#available-models))
- Per-OpenAI quality control (low/medium/high) — stored per-user in localStorage
- Vendor-tuned base prompts, user-overridable in the Advanced panel

### Known limitations

- No automated test suite
- Dark mode CSS tokens partially defined (light theme is the default; dark is not fully styled)
- Font (General Sans) loaded from external Fontshare CDN — could be self-hosted
- Service worker caches index.html with stale-while-revalidate, so first load after a deploy may show the previous version (second load picks up the new hashed bundle)

---

## Tech Stack

- **Frontend**: React 19, TypeScript 5.4, Tailwind CSS 4 (Vite plugin)
- **Build**: Vite 7.3 — `define` injects `__APP_VERSION__` from `package.json` and exposes `process.env.GEMINI_API_KEY` to the client (Gemini SDK runs in-browser)
- **Backend**: Express 5.2 — single `server/index.ts` file. In production: serves `dist/` static + 3 API routes. In dev: same routes + Vite middleware
- **Image processing**: `sharp` (server-side BG removal, padding)
- **AI vendors**:
  - OpenAI: `gpt-image-2`, `gpt-image-1` (called via the Express proxy)
  - Google Gemini: `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`, `gemini-2.5-flash-image` (called directly from the client via `@google/genai`)
- **Storage**: `localforage` (IndexedDB) for icon history, `localStorage` for settings
- **Process manager**: PM2 (named `ai-icon-generator`, id `1`)
- **Reverse proxy**: nginx (winget install at `C:\Users\rodri\AppData\Local\Microsoft\WinGet\Packages\nginxinc.nginx_*\nginx-1.29.8\`)

---

## Architecture

### Directory layout (post-decomposition)

```
src/
├── main.tsx                            # entry point
├── App.tsx                             # root layout, version badge
├── types.ts                            # IconStyle enum, GeneratedIcon, ReferenceMode, Toast types
├── constants.ts                        # AVAILABLE_MODELS, VENDOR_LABELS, VENDOR_LOGOS, QUALITY_OPTIONS, defaults, storage keys
├── components/
│   ├── common/                         # Portal, Toast, ConfirmationDialog, Spinner, Switch, Tabs
│   ├── icons/                          # SVG icon components (one per file)
│   └── generator/
│       ├── IconGenerator.tsx           # orchestrator — owns all state for the generation flow
│       ├── PromptCard.tsx              # prompt textarea + file/paste upload UI
│       ├── SettingsCard.tsx            # style picker, count, padding, color, Advanced panel
│       ├── ModelSelector.tsx           # NEW v1.11.0 — mobile-friendly bottom-sheet / desktop modal
│       ├── StyleSelector.tsx           # 6-up style grid
│       ├── CompactHeader.tsx           # sticky mobile header that shows when the form scrolls offscreen
│       ├── ResultsGrid.tsx             # icon grid + skeletons + selection box overlay
│       ├── ReferenceBanner.tsx         # the "editing icon X" / "inspired by icon X" banner
│       └── EmptyState.tsx              # empty placeholder for results panel
├── hooks/
│   ├── useIconHistory.ts               # localforage persistence + delete/undo
│   ├── useSelection.ts                 # click/shift/ctrl/drag-box/touch multi-select
│   ├── useFileUpload.ts                # file picker + paste + drag-drop
│   ├── useKeyboardShortcuts.ts         # global shortcuts
│   └── useCompactMode.ts               # observes scroll → toggles CompactHeader
├── context/
│   └── ThemeContext.tsx                # light/dark/system theme provider
├── services/
│   └── providers/                      # vendor abstraction (NEW since v1.10.0)
│       ├── types.ts                    # ImageProvider interface, Vendor type, Quality type, ModelOption shape, VENDORS_WITH_QUALITY
│       ├── gemini.ts                   # Gemini adapter — uses @google/genai in-browser
│       ├── openai.ts                   # OpenAI adapter — calls /api/openai/* via Express proxy
│       └── index.ts                    # registry: getProvider(vendor)
└── utils/
    ├── imageUtils.ts                   # canvas-based BG removal + padding (client-side)
    ├── fileUtils.ts                    # download, clipboard, ZIP
    ├── maskColor.ts                    # safe chroma-key picker (#00b140 default, falls back to #0000FF on collision)
    └── promptBuilder.ts                # vendor-aware prompt composition (see Prompt System)

server/
└── index.ts                            # Express app — routes + Vite middleware (dev) or static (prod)

public/
├── assets/
│   ├── style-*.png                     # style previews
│   ├── vendors/openai.png              # NEW v1.11.0 — vendor logos (256×256 RGBA)
│   ├── vendors/gemini.png
│   ├── favicon.png, splash.png
├── prompts.json                        # random prompt suggestions
└── manifest.json                       # PWA manifest

dist/                                   # build output (gitignored)
cert/                                   # local SSL certs (gitignored — contains private key)
ecosystem.config.cjs                    # PM2 config (gitignored — Windows-specific path)
```

### Service layer

```
ImageProvider {
  generateIcons(prompt, n, model, quality?)
  generateReferencedIcons(prompt, n, refImages, model, quality?)
  editImage(b64Image, mimeType, prompt, model, quality?)
}
```

- `geminiProvider` — runs in the browser, uses `@google/genai`. Makes N parallel calls (one per variant). Returns `nativeTransparency: false` always (Gemini doesn't support transparent output).
- `openaiProvider` — proxies through Express. Single call with `n: numVariants`. Returns `nativeTransparency: true` only for `gpt-image-1`.
- `getProvider(vendor: 'openai' | 'gemini')` from `src/services/providers/index.ts`.
- `quality` is honored by OpenAI, ignored by Gemini. `VENDORS_WITH_QUALITY` is used to gate the UI control.

### Server (`server/index.ts`)

Three API routes:

- `GET /api/health` — `{status: 'ok'}` healthcheck
- `POST /api/openai/generate` — proxies to `https://api.openai.com/v1/images/generations`. Reads `OPENAI_API_KEY` from `process.env`. Defaults: `quality: 'low'`, `size: '1024x1024'`, `outputFormat: 'png'`.
- `POST /api/openai/edit` — proxies to `https://api.openai.com/v1/images/edits` with `multipart/form-data`. Buffer→Blob conversion for input images.
- `POST /api/process-image` — server-side chroma-key BG removal via `sharp` (sample top-left pixel, knock out anything within `tolerance`). Currently used by the original Gemini flow; the new flow does the same thing client-side via `removeGreenScreen` in `imageUtils.ts`.

Plus Vite middleware in dev mode, static serving from `dist/` in prod, and HTTPS or HTTP listener depending on `BEHIND_PROXY` env var.

### Prompt System (`src/utils/promptBuilder.ts`)

Single public entry: `buildFullPrompt(promptText, params): string`. Dispatches on `params.vendor`:

- **OpenAI builder** — labeled segments (`Role: …`, `Subject: …`, `Style: …`, `Background: …`, `Constraints: …`), inline negatives. Cookbook-verbatim phrases for transparent/chroma-key bg, edit ("change only X, keep everything else the same"), inspire ("Use the same style, lighting, and rendering technique from the input image(s)").
- **Gemini builder** — narrative paragraph (Gemini docs explicitly say no keyword lists). Hard "no X" constraints pushed to a final `Final constraints: …` sentence (Gemini 3 drops early-placed negatives).

Both honor: style (6 variants), color, isUiIcon (24px readability hint), padding, 3D-vs-2D switch (different role + extra "no floor/ground/platform" for 3D), reference modes (inspire vs edit), `useTransparentBackground`.

The output is the user-editable "Custom Prompt Override" textarea content; if the user edits it, their edited version is what gets sent.

### Available models

| Vendor | Model ID | Display | Cost | Tagline | Transparent BG | Notes |
|---|---|---|---|---|---|---|
| OpenAI | `gpt-image-2` | GPT Image 2 | $$ | Latest | ❌ | Slow at high quality (≈190s) |
| OpenAI | `gpt-image-1` | GPT Image 1 | $$$ | — | ✅ | Native transparency via `background: 'transparent'` |
| Gemini | `gemini-3.1-flash-image-preview` | Gemini 3.1 Flash | $$ | HQ | ❌ | |
| Gemini | `gemini-3-pro-image-preview` | Gemini 3 Pro | $$$$ | HQ | ❌ | |
| Gemini | `gemini-2.5-flash-image` | Gemini 2.5 Flash | $ | — | ❌ | |

User selection persists in `localStorage` under `settings_selected_model`. Quality persists under `settings_quality`. Defaults: `gpt-image-2` and `low`.

### Background handling

Only `gpt-image-1` supports native transparency. For everyone else, the model is asked to render on a flat chroma-key color (`#00b140` green by default; falls back to `#0000FF` blue if the user picked a green icon color), and the client knocks the BG out via canvas pixel-distance match in `removeGreenScreen` (`src/utils/imageUtils.ts`). The `getSafeMaskColor` helper in `src/utils/maskColor.ts` handles the collision detection.

The `nativeTransparency` boolean on each `GenerationResult` lets the IconGenerator decide whether to skip the chroma-key step.

---

## Infrastructure

### PM2

- **Process name**: `ai-icon-generator` (id `1`)
- **Config**: `ecosystem.config.cjs` (gitignored — Windows path)
- **Env**: `NODE_ENV=production`, `BEHIND_PROXY=true`, `PORT=3444`
- **OPENAI_API_KEY** + **GEMINI_API_KEY**: come from the user's Windows User-level env vars (verified via `pm2 env 1`). **Don't** read them directly; the user has explicitly asked not to.
- **Restart**: `pm2 restart ai-icon-generator --update-env`
- **Logs**: `pm2 logs ai-icon-generator --lines 100 --nostream` (or read `C:\Users\rodri\.pm2\logs\ai-icon-generator-{out,error}.log`)
- **Flush logs**: `pm2 flush ai-icon-generator`

### nginx

- **Vhost**: `icongen.rodrigofd.pro` → `127.0.0.1:3444`
- **Config**: `C:\Users\rodri\AppData\Local\Microsoft\WinGet\Packages\nginxinc.nginx_Microsoft.Winget.Source_8wekyb3d8bbwe\nginx-1.29.8\conf\nginx.conf`
- **Critical settings** (set explicitly because the defaults broke gpt-image-2):
  - `proxy_read_timeout 600s` — gpt-image-2 takes up to ~3min
  - `proxy_send_timeout 600s`
  - `proxy_connect_timeout 30s`
  - `client_max_body_size 25m` — for multi-MB base64 ref-image payloads
- **Reload**: requires elevation (`gsudo -d`) — the master nginx process is elevated. Always validate first with `nginx -t`.

### Build / deploy flow

1. `npm run build` → produces `dist/` with hashed asset filenames
2. Express's static middleware reads from disk per request, so frontend changes are live as soon as `dist/` is overwritten — **no pm2 restart needed for frontend-only changes**
3. Server changes (anything in `server/`) need `pm2 restart ai-icon-generator --update-env`
4. nginx changes need `gsudo -d nginx -s reload` after editing `nginx.conf`
5. Service worker caches with stale-while-revalidate; first user visit after deploy may serve the old bundle, but the new hashed JS gets fetched in the background and used on next load

---

## Workflow for future changes

This is the rhythm that worked well in this session. **Follow it unless the user explicitly says otherwise.**

### 1. Assess + plan

- For exploratory / open-ended requests, give a 2-3 sentence recommendation with the main tradeoff. Don't implement until the user agrees.
- For concrete requests, briefly state the plan in one sentence or two before touching files. Bullet the steps.
- Use `TaskCreate` / `TaskUpdate` if the change has 3+ steps. Mark in-progress at start, completed when done.
- Delegate research-heavy work (vendor docs, brand assets, etc.) to a `general-purpose` Agent in the background while you work on adjacent pieces.

### 2. Implement

- Edit existing files in place; only create new ones when the file's purpose is clearly distinct.
- Vendor-aware logic goes through the existing abstractions (`ImageProvider`, prompt builder vendor branch, `VENDORS_WITH_QUALITY`). **Don't** sprinkle `if (vendor === 'openai')` around the codebase.
- Keep TypeScript types up-to-date; this codebase is strictly typed.
- Allman braces, 2-space indent, no cuddling — see global CLAUDE.md.

### 3. Verify

- `npm run build` — must complete clean. Build errors = stop and fix before doing anything else.
- For server-side changes: `pm2 restart ai-icon-generator --update-env`, then `curl -sk https://icongen.rodrigofd.pro/api/health` to confirm it came up.
- **For UI changes, verify with Chrome DevTools MCP** — this is the canonical verification step:
  1. Start Chrome with the debug flags from the user's CLAUDE.md (`--remote-debugging-port=9222 --user-data-dir=C:\Users\rodri\chrome-profile-dev`) if not already running. Open `https://icongen.rodrigofd.pro/`.
  2. `mcp__chrome-devtools__list_pages` → `take_snapshot` → `take_screenshot`. The a11y snapshot is more useful than the screenshot for reasoning about structure; the screenshot is what you show the user (or `Read` to inspect visually).
  3. Resize to test mobile too: `resize_page` to 390×844 (iPhone-ish).
  4. Hard-reload via `navigate_page type=reload ignoreCache=true` after redeploy to bypass the SW cache.
- For end-to-end API verification: `curl -sk -m 300 -X POST https://icongen.rodrigofd.pro/api/openai/generate -H "Content-Type: application/json" -d '{...}'` with a generous timeout (gpt-image-2 is slow).
- If the verification fails, fix and re-verify. Don't claim success on intent.

### 4. Bump version

- After successfully verifying, bump `package.json` `"version"`. Semantic-ish:
  - **Patch** (1.x.y → 1.x.y+1): pure bugfix, no UX change
  - **Minor** (1.x.y → 1.x+1.0): new user-facing feature, additive change, structural refactor
  - **Major** (1.x.y → 2.0.0): breaking change to data shapes, storage, or public surface
- Rebuild (`npm run build`) so the version baked into the bundle matches.
- Restart pm2 (`pm2 restart ai-icon-generator --update-env`) so its dashboard also shows the new version.
- The `__APP_VERSION__` define is wired up at build time — no code changes needed to refresh the UI badge.

### 5. Commit + push

- `git status` to confirm what's staged. Never `git add -A` — explicitly list files. Watch for `cert/` and `ecosystem.config.cjs` (both gitignored, but stay vigilant).
- Commit with a HEREDOC message focused on **why** and **what** (not implementation detail), with the `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer.
- `git push`. Remote is `origin/main`. There's a Bash hook that may block push to `main` even after commits; if it does, ask the user to run the push themselves with `! git push` in the prompt.

### General principles

- Don't over-engineer. The user prefers terse, surgical changes over speculative abstractions.
- When unsure between two options, ask via `AskUserQuestion` — but only for genuine forks. For routine decisions, pick a default and proceed.
- **Auto mode is usually on** in this project. Execute, don't plan-then-ask. Course-correct on signal.
- Don't read `OPENAI_API_KEY` directly. Don't run destructive git commands without explicit authorization (`reset --hard`, force push, etc.).
- Save genuine findings to memory (`C:\Users\rodri\.claude\projects\C--Users-rodri-Projects-AI-Studio-Projects-ai-icon-generator\memory\`) — useful nginx config locations, vendor latency numbers, behavioral preferences. Don't save ephemeral state.

---

## Quick reference commands

```bash
# Health check
curl -sk https://icongen.rodrigofd.pro/api/health

# pm2 ops
pm2 list
pm2 restart ai-icon-generator --update-env
pm2 logs ai-icon-generator --lines 100 --nostream
pm2 flush ai-icon-generator

# Build + deploy (frontend only)
npm run build

# nginx ops (need gsudo)
pwsh -NoProfile -c 'Set-Location "<nginx-dir>"; .\nginx.exe -t'
gsudo -d pwsh -NoProfile -c 'Set-Location "<nginx-dir>"; .\nginx.exe -s reload'

# Direct OpenAI generation test (nb. quality=low for fast turnaround)
curl -sk -m 300 -X POST https://icongen.rodrigofd.pro/api/openai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a red circle","n":1,"model":"gpt-image-2","size":"1024x1024","quality":"low","background":"auto","outputFormat":"png"}' \
  -w "HTTP_CODE:%{http_code}\nTIME:%{time_total}s\n" -o /tmp/out.json
```

---

## Relevant memory files

- `C:\Users\rodri\.claude\projects\C--Users-rodri-Projects-AI-Studio-Projects-ai-icon-generator\memory\nginx_reverse_proxy.md` — where the nginx config lives, how to reload it
- `C:\Users\rodri\.claude\projects\C--Users-rodri-Projects-AI-Studio-Projects-ai-icon-generator\memory\openai_gpt_image_2_latency.md` — gpt-image-2 takes 150–200s; all timeouts in the chain must be ≥300s
