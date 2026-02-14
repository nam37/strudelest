import type { ParsedMidi, ParsedMidiNote, ParsedMidiTrack } from "./model";
import { MidiImportError } from "./types";

function readFormatType(arrayBuffer: ArrayBuffer): number {
  const data = new DataView(arrayBuffer);
  if (data.byteLength < 14) {
    throw new MidiImportError("invalid_midi", "MIDI file is too small.");
  }

  const header =
    String.fromCharCode(data.getUint8(0)) +
    String.fromCharCode(data.getUint8(1)) +
    String.fromCharCode(data.getUint8(2)) +
    String.fromCharCode(data.getUint8(3));

  if (header !== "MThd") {
    throw new MidiImportError("invalid_midi", "Missing MIDI header chunk.");
  }

  return data.getUint16(8, false);
}

export async function parseMidiArrayBuffer(buffer: ArrayBuffer): Promise<ParsedMidi> {
  const format = readFormatType(buffer);
  if (format === 2) {
    throw new MidiImportError("unsupported_midi_type", "MIDI type 2 files are not supported.");
  }

  let MidiCtor: new (midiArray?: ArrayLike<number> | ArrayBuffer) => {
    header: {
      ppq: number;
      tempos: Array<{ ticks: number; bpm: number }>;
      timeSignatures: Array<{ ticks: number; timeSignature: number[] }>;
    };
    tracks: Array<{
      name: string;
      channel: number;
      instrument: { number: number };
      notes: Array<{ midi: number; ticks: number; durationTicks: number; velocity: number }>;
      controlChanges: Record<string, Array<unknown>>;
      pitchBends: Array<unknown>;
    }>;
  };

  try {
    const tone = await import("@tonejs/midi");
    MidiCtor = tone.Midi;
  } catch {
    throw new MidiImportError("invalid_midi", "Failed to load MIDI parser dependency.");
  }

  let midi: InstanceType<typeof MidiCtor>;
  try {
    midi = new MidiCtor(new Uint8Array(buffer));
  } catch {
    throw new MidiImportError("invalid_midi", "MIDI parser rejected file content.");
  }

  const tracks: ParsedMidiTrack[] = midi.tracks.map((track, index) => {
    const notes: ParsedMidiNote[] = track.notes
      .map((note) => ({
        pitch: note.midi,
        velocity: note.velocity,
        startTick: note.ticks,
        durationTick: Math.max(1, note.durationTicks),
        channel: track.channel,
        program: track.instrument?.number ?? null
      }))
      .sort((a, b) => {
        if (a.startTick !== b.startTick) {
          return a.startTick - b.startTick;
        }
        return a.pitch - b.pitch;
      });

    const controlChangeCount = Object.values(track.controlChanges).reduce(
      (sum, events) => sum + events.length,
      0
    );
    const ignoredEvents = controlChangeCount + track.pitchBends.length;

    return {
      trackIndex: index,
      name: track.name?.trim() || `Track ${index + 1}`,
      notes,
      ignoredEvents
    };
  });

  const ignoredEvents = tracks.reduce((sum, track) => sum + track.ignoredEvents, 0);

  return {
    format,
    ppq: midi.header.ppq,
    tracks,
    tempoEvents: midi.header.tempos.map((event) => ({
      tick: event.ticks,
      bpm: event.bpm
    })),
    timeSignatureEvents: midi.header.timeSignatures
      .filter((event) => event.timeSignature.length >= 2)
      .map((event) => ({
        tick: event.ticks,
        numerator: event.timeSignature[0],
        denominator: event.timeSignature[1]
      })),
    ignoredEvents
  };
}
