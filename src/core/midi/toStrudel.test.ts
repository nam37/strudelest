import { describe, expect, it } from "vitest";
import { buildStrudelFromMidi } from "./toStrudel";
import type { MappedMidi } from "./model";
import { DEFAULT_MIDI_IMPORT_OPTIONS } from "./types";

describe("buildStrudelFromMidi", () => {
  it("builds layered strudel code with comments and drum mapping", () => {
    const midi: MappedMidi = {
      filename: "fixture.mid",
      ppq: 480,
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      beatsPerBar: 4,
      bars: 2,
      totalBeats: 8,
      tracks: [
        {
          trackIndex: 0,
          name: "Lead",
          role: "melodic",
          channel: 0,
          program: 80,
          instrument: "Synth Lead",
          sound: "sawtooth",
          gain: 0.46,
          notes: [
            {
              pitch: 60,
              velocity: 0.8,
              startBeat: 0,
              durationBeats: 1,
              channel: 0,
              program: 80
            }
          ]
        },
        {
          trackIndex: 1,
          name: "Drums",
          role: "drum",
          channel: 9,
          program: 0,
          instrument: "Drums",
          sound: "Linn9000",
          gain: 0.3,
          notes: [
            {
              pitch: 36,
              velocity: 0.9,
              startBeat: 0,
              durationBeats: 0.5,
              channel: 9,
              program: 0
            }
          ]
        }
      ]
    };

    const result = buildStrudelFromMidi(midi, "fixture.mid", DEFAULT_MIDI_IMPORT_OPTIONS);

    expect(result.code).toContain("// MIDI import: fixture");
    expect(result.code).toContain("setcps(1.000);");
    expect(result.code).toContain("stack(");
    expect(result.code).toContain("note(");
    expect(result.code).toContain('.bank("Linn9000")');
    expect(result.sectionSummary[0]).toContain("Imported MIDI");
    expect(result.sectionSummary.some((line) => line.includes("Track 1"))).toBe(true);
  });
});
