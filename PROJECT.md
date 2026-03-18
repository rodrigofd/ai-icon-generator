# AI Icon Generator - Project State

## Overview

AI-powered icon generation web app using Google Gemini API. Generates professional vector-style icons from text prompts with multiple styles, batch processing, reference-based generation, and background removal.

## Tech Stack

- **Frontend**: React 19, TypeScript 5.4, Tailwind CSS (CDN)
- **Build**: Vite 7.3
- **Backend**: Express 5.2, Sharp (image processing)
- **AI**: Google Gemini API (@google/genai)
- **Storage**: localforage (IndexedDB), JSZip (CDN)

## Architecture

### Directory Structure

```
src/
├── main.tsx                          # Entry point
├── App.tsx                           # Root layout
├── types.ts                          # Shared types & global declarations
├── constants.ts                      # App-wide constants (models, styles, defaults)
├── components/
│   ├── common/                       # Reusable UI primitives
│   │   ├── Portal.tsx, Toast.tsx, ConfirmationDialog.tsx
│   │   ├── Spinner.tsx, Switch.tsx, Tabs.tsx
│   ├── icons/                        # SVG icon components (13 files)
│   ├── generator/                    # Icon generation feature
│   │   ├── IconGenerator.tsx         # Orchestrator (~330 lines)
│   │   ├── PromptCard.tsx            # Prompt input + file upload
│   │   ├── SettingsCard.tsx          # Style, count, padding, color, advanced
│   │   ├── StyleSelector.tsx         # Style grid picker
│   │   ├── CompactHeader.tsx         # Mobile sticky header
│   │   ├── ResultsGrid.tsx           # Icon grid display
│   │   ├── ReferenceBanner.tsx       # Edit/Inspire reference banner
│   │   └── EmptyState.tsx            # Empty results placeholder
│   ├── IconCard.tsx                  # Individual icon card
│   ├── IconCardSkeleton.tsx          # Loading skeleton
│   └── SelectionToolbar.tsx          # Floating bulk actions toolbar
├── hooks/                            # Custom hooks (extracted from IconGenerator)
│   ├── useIconHistory.ts             # History persistence & undo
│   ├── useSelection.ts              # Multi-select, drag-select, touch
│   ├── useFileUpload.ts             # File upload, paste, drag-drop
│   ├── useKeyboardShortcuts.ts      # Keyboard shortcuts
│   └── useCompactMode.ts            # Mobile compact form detection
├── context/
│   └── ThemeContext.tsx              # Light/dark/system theme
├── services/
│   └── geminiService.ts             # Gemini API integration
└── utils/
    ├── imageUtils.ts                 # Canvas-based bg removal & padding
    ├── fileUtils.ts                  # Download, clipboard, ZIP
    └── promptBuilder.ts              # Prompt generation logic
server/
    └── index.ts                      # Express dev server + image processing API
public/
    ├── assets/                       # Style previews, favicon, splash
    ├── prompts.json                  # Random prompt suggestions
    └── manifest.json                 # PWA manifest
```

## Current Status: 100% functional (v1.9.5)

### Working Features

- Icon generation with 6 styles (Monochrome, Flat, Outline, Gradient, Isometric, 3D)
- Batch mode (multiple prompts)
- 1/2/4/8 variants per prompt
- Reference-based generation (Edit & Inspire modes)
- Image upload (file, paste, drag-drop) for inspiration
- Background removal (AI-assisted + canvas chroma-key)
- Multi-select (click, shift, ctrl, drag-box, mobile long-press)
- Bulk operations (download ZIP, copy, delete, remove BG)
- Keyboard shortcuts (Ctrl+Enter, Ctrl+A, Ctrl+Z, Delete, Escape)
- Persistent history (IndexedDB via localforage)
- Dark/light/system theme
- Mobile responsive with compact sticky header
- PWA-ready (manifest, service worker)
- Multiple Gemini model selection

### Known Issues / Notes

- No test suite
- `window.aistudio` API is specific to AI Studio hosting — needs fallback for standalone deployment
- Dark mode CSS tokens not fully defined (only light theme set)
- Font (General Sans) still loaded via external Fontshare CDN link
