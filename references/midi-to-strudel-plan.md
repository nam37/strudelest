# MIDI-to-Strudel Import Feature Plan

## Summary
Build a client-side MIDI import pipeline that converts `.mid/.midi` files into playable Strudel code and applies the result directly into the existing Strudel Output editor in the Dock panel.

## Scope
- Parse Standard MIDI Files (type 0 and type 1).
- Convert multi-track notes into layered Strudel `stack(...)` output.
- GM-aware instrument mapping with safe fallbacks.
- Drum channel mapping (channel 10) to Strudel drum tokens.
- Surface import warnings and summaries in UI.
- Replace editor code on successful import.

## Interfaces
- `src/core/midi/types.ts`
  - `MidiImportOptions`
  - `MidiImportWarning`
  - `MidiTrackReport`
  - `MidiImportResult`
- `src/core/midi/importMidi.ts`
  - `importMidiArrayBuffer(arrayBuffer, filename, options?)`
  - `importMidiFile(file, options?)`
- `src/core/midi/model.ts`
  - `NormalizedMidi`
  - `NormalizedTrack`
  - `NormalizedNote`

## Implementation Outline
1. Parse MIDI metadata/events.
2. Normalize notes and repair overlaps.
3. Quantize to deterministic step grid.
4. Map instruments (GM-aware) and drums.
5. Generate Strudel code (`setcps` + `stack`).
6. Integrate import action in Dock panel.
7. Add unit and integration tests.

## Edge Cases
- Invalid/corrupt MIDI file.
- Unsupported MIDI type 2.
- No note events.
- Large files exceeding note/track limits.
- Multiple tempo/time-signature changes.

## Acceptance Criteria
- Import `.mid/.midi` from UI without page reload.
- Generated code plays via existing Transport.
- Multi-track files produce layered `stack(...)` output.
- Drum channel is mapped distinctly.
- Ignored/unsupported content is surfaced as warnings.
- Failed imports do not overwrite current editor code.
- Build and tests pass.
