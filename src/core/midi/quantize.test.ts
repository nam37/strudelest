import { describe, expect, it } from "vitest";
import { quantizeNormalizedMidi } from "./quantize";
import type { NormalizedMidi } from "./model";
import { DEFAULT_MIDI_IMPORT_OPTIONS } from "./types";

describe("quantizeNormalizedMidi", () => {
  it("quantizes start and duration to configured step size", () => {
    const midi: NormalizedMidi = {
      filename: "quantize.mid",
      ppq: 480,
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      beatsPerBar: 4,
      bars: 1,
      totalBeats: 1,
      tracks: [
        {
          trackIndex: 0,
          name: "Track 1",
          role: "melodic",
          channel: 0,
          program: 0,
          notes: [
            {
              pitch: 60,
              velocity: 0.8,
              startBeat: 0.03,
              durationBeats: 0.02,
              channel: 0,
              program: 0
            }
          ]
        }
      ]
    };

    const quantized = quantizeNormalizedMidi(midi, {
      ...DEFAULT_MIDI_IMPORT_OPTIONS,
      quantizeDivision: 16
    });

    expect(quantized.tracks[0].notes[0].startBeat).toBe(0);
    expect(quantized.tracks[0].notes[0].durationBeats).toBe(1 / 16);
    expect(quantized.bars).toBe(1);
  });
});
