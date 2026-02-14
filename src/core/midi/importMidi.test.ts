import { describe, expect, it } from "vitest";
import { Midi } from "@tonejs/midi";
import { importMidiArrayBuffer } from "./importMidi";
import { MidiImportError } from "./types";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function buildSimpleMidiBuffer(): ArrayBuffer {
  const midi = new Midi();
  const track = midi.addTrack();
  track.name = "Lead";
  track.channel = 0;
  track.instrument.number = 0;
  track.addNote({
    midi: 60,
    ticks: 0,
    durationTicks: 480,
    velocity: 0.8
  });
  track.addNote({
    midi: 64,
    ticks: 480,
    durationTicks: 480,
    velocity: 0.75
  });
  return toArrayBuffer(midi.toArray());
}

function buildMultiTrackMidiBuffer(): ArrayBuffer {
  const midi = new Midi();

  const melody = midi.addTrack();
  melody.name = "Melody";
  melody.channel = 0;
  melody.instrument.number = 80;
  melody.addNote({ midi: 67, ticks: 0, durationTicks: 240, velocity: 0.9 });
  melody.addNote({ midi: 69, ticks: 240, durationTicks: 240, velocity: 0.8 });

  const drums = midi.addTrack();
  drums.name = "Drums";
  drums.channel = 9;
  drums.instrument.number = 0;
  drums.addNote({ midi: 36, ticks: 0, durationTicks: 120, velocity: 0.9 });
  drums.addNote({ midi: 38, ticks: 240, durationTicks: 120, velocity: 0.85 });

  return toArrayBuffer(midi.toArray());
}

function buildTempoSignatureChangeBuffer(): ArrayBuffer {
  const midi = new Midi();
  midi.header.tempos = [
    { ticks: 0, bpm: 120 },
    { ticks: 960, bpm: 90 }
  ];
  midi.header.timeSignatures = [
    { ticks: 0, timeSignature: [4, 4] },
    { ticks: 960, timeSignature: [3, 4] }
  ];
  midi.header.update();

  const track = midi.addTrack();
  track.name = "Tempo Test";
  track.channel = 0;
  track.instrument.number = 0;
  track.addNote({ midi: 60, ticks: 0, durationTicks: 240, velocity: 0.8 });
  track.addNote({ midi: 62, ticks: 240, durationTicks: 240, velocity: 0.8 });
  track.addNote({ midi: 64, ticks: 480, durationTicks: 240, velocity: 0.8 });
  track.addNote({ midi: 65, ticks: 720, durationTicks: 240, velocity: 0.8 });
  return toArrayBuffer(midi.toArray());
}

function buildType2MidiBuffer(): ArrayBuffer {
  const bytes = Uint8Array.from([
    0x4d,
    0x54,
    0x68,
    0x64, // MThd
    0x00,
    0x00,
    0x00,
    0x06, // header length
    0x00,
    0x02, // format 2
    0x00,
    0x01, // tracks
    0x01,
    0xe0, // division 480
    0x4d,
    0x54,
    0x72,
    0x6b, // MTrk
    0x00,
    0x00,
    0x00,
    0x04, // length
    0x00,
    0xff,
    0x2f,
    0x00 // end of track
  ]);
  return toArrayBuffer(bytes);
}

describe("importMidiArrayBuffer", () => {
  it("imports single-track melody MIDI into strudel code", async () => {
    const buffer = buildSimpleMidiBuffer();
    const result = await importMidiArrayBuffer(buffer, "single.mid");

    expect(result.bpm).toBe(120);
    expect(result.tracksImported).toBe(1);
    expect(result.code).toContain("setcps(1.000);");
    expect(result.code).not.toContain("gm_");
    expect(result.code).toContain("stack(");
    expect(result.code).toContain("note(");
  });

  it("imports multi-track MIDI and maps drum track to Linn9000 bank", async () => {
    const buffer = buildMultiTrackMidiBuffer();
    const result = await importMidiArrayBuffer(buffer, "arrangement.mid");

    expect(result.tracksImported).toBe(2);
    expect(result.code).toContain('.bank("Linn9000")');
    expect(result.trackReports.some((report) => report.role === "drum")).toBe(true);
    expect(result.trackReports.some((report) => report.role === "melodic")).toBe(true);
  });

  it("reports ignored tempo and time-signature changes", async () => {
    const buffer = buildTempoSignatureChangeBuffer();
    const result = await importMidiArrayBuffer(buffer, "tempo-change.mid");

    expect(result.warnings.some((warning) => warning.code === "tempo_changes_ignored")).toBe(true);
    expect(
      result.warnings.some((warning) => warning.code === "time_signature_changes_ignored")
    ).toBe(true);
  });

  it("rejects unsupported MIDI type 2 files", async () => {
    const buffer = buildType2MidiBuffer();

    await expect(importMidiArrayBuffer(buffer, "type2.mid")).rejects.toBeInstanceOf(MidiImportError);
    await expect(importMidiArrayBuffer(buffer, "type2.mid")).rejects.toMatchObject({
      code: "unsupported_midi_type"
    });
  });
});
