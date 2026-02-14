# Strudelest MVP Plan and Phased Tasks

## Product Summary
`strudelest` is a browser app that generates short stylized loops using Strudel, supports live playback, editable code, local save/load, and shareable URLs.

## MVP Acceptance Criteria
- User can generate an 8-bar loop at 120 BPM and play it.
- User can edit generated code and re-run playback.
- User can save pieces locally and restore on reload.
- User can share a URL that reproduces the same piece.
- App runs as a single frontend server/port.

## Phase 0 - Foundation Decisions (Locked)
- Stack: `Vite + React + TypeScript`
- Runtime: Embedded Strudel runtime in app
- Generation mode: Template remix with seeded randomness
- Persistence: Local browser only
- Sharing: URL payload encoding
- Default piece shape: 8 bars, 120 BPM

## Phase 1 - App Scaffold and Shell
### Deliverables
- Initialize frontend structure for React + TS.
- Create base layout for:
  - Template controls
  - Editor panel
  - Transport controls
  - Saved library panel
  - Share action area
- Define core types for templates and pieces.

### Tasks
1. Create project config files (`package.json`, `tsconfig`, `vite.config`).
2. Add app shell (`src/App.tsx`, `src/main.tsx`, global styles).
3. Add initial folder layout:
   - `src/core/templates`
   - `src/core/generator`
   - `src/core/strudel`
   - `src/core/share`
   - `src/core/storage`
   - `src/types`
4. Add placeholder UI components.
5. Add baseline tests setup (Vitest + Testing Library).

### Exit Criteria
- App starts and renders all major shell sections.
- TypeScript build passes.

## Phase 2 - Template System and Generator
### Deliverables
- 4-6 style templates with parameter schemas.
- Seeded generator producing reproducible Strudel code.
- UI controls bound to template params.

### Tasks
1. Implement `TemplateDefinition` schema.
2. Add template catalog (ambient, breakbeat, minimal, polyrhythm).
3. Implement deterministic RNG utility.
4. Implement `generatePiece()` flow using seed + params.
5. Display generated code in editor.

### Exit Criteria
- Same template + seed + params always produces identical code.
- User can regenerate variations from the UI.

## Phase 3 - Strudel Runtime Integration
### Deliverables
- In-app code evaluation/playback with Start/Stop controls.
- Runtime error reporting without breaking UI state.

### Tasks
1. Implement Strudel adapter (`evaluate`, `play`, `stop`).
2. Wire transport controls to adapter.
3. Handle compile/runtime errors with visible messages.
4. Preserve last known good code for safe fallback.

### Exit Criteria
- Generated code plays reliably.
- Invalid edits show errors but do not crash app.

## Phase 4 - Persistence and Shareable URLs
### Deliverables
- Local piece library (save/update/delete/load).
- Share URL codec for reproducible piece playback.

### Tasks
1. Implement storage repo (`strudelest:pieces:v1`).
2. Implement share payload encode/decode.
3. Load piece from URL on app startup.
4. Add copy-share-link action in UI.
5. Add version guard/migration shim for payload v1.

### Exit Criteria
- Saved items survive reload.
- Share links restore the same piece config and code.

## Phase 5 - Hardening and Test Coverage
### Deliverables
- Unit and integration tests for core user flows.
- Robust handling of malformed share payloads and storage errors.

### Tasks
1. Unit tests:
   - generator reproducibility
   - param validation/clamping
   - share codec round-trip
   - storage CRUD
2. Integration tests:
   - Generate -> Play -> Stop
   - Edit -> Re-run
   - Save -> Reload -> Restore
   - URL open -> Restore
3. Add fallback behaviors for storage/runtime failures.

### Exit Criteria
- MVP quality gate scenarios pass.
- Major edge cases are covered by tests.

## Key Types and Interfaces
```ts
export interface PieceSpec {
  id: string;
  name: string;
  templateId: string;
  bpm: number;
  bars: number;
  seed: string;
  params: Record<string, number | string | boolean>;
  code: string;
  createdAt: string;
  updatedAt: string;
  version: 1;
}

export interface TemplateDefinition {
  id: string;
  label: string;
  description: string;
  defaults: {
    bpm: number;
    bars: number;
    params: Record<string, unknown>;
  };
  paramSchema: Array<{
    key: string;
    type: "number" | "select" | "boolean";
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
  }>;
  buildCode: (input: {
    bpm: number;
    bars: number;
    params: Record<string, unknown>;
    seed: string;
  }) => string;
}
```

## Risks and Mitigations
- Strudel runtime API differences:
  - Mitigation: isolate integration behind adapter.
- URL payload size growth:
  - Mitigation: include compressed payload path and code-optional strategy.
- Browser storage limits:
  - Mitigation: compact piece metadata and prune oldest items.

## Current Status
- [x] Planning complete
- [x] Phased task breakdown documented
- [x] Phase 1 scaffold complete
- [x] Phase 2 template/generator complete
- [x] Phase 3 runtime integration complete
- [x] Phase 4 persistence/share complete
- [x] Phase 5 hardening/tests complete

## Post-MVP Follow-ups
- Reduce bundle size from Strudel runtime chunking warnings.
- Add end-to-end browser tests for real audio start/stop behavior.
- Add optional cloud sync and authenticated user libraries.
