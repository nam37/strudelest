import type { MappedMidi, MappedTrack, NormalizedMidi } from "./model";
import type { MidiImportWarning, MidiTrackReport } from "./types";

interface ProgramMap {
  min: number;
  max: number;
  instrument: string;
  sound: string;
  gain: number;
}

const PROGRAM_MAPS: ProgramMap[] = [
  { min: 0, max: 7, instrument: "Piano", sound: "triangle", gain: 0.5 },
  { min: 8, max: 15, instrument: "Chromatic Percussion", sound: "sine", gain: 0.45 },
  { min: 16, max: 23, instrument: "Organ", sound: "square", gain: 0.46 },
  { min: 24, max: 31, instrument: "Guitar", sound: "sawtooth", gain: 0.5 },
  { min: 32, max: 39, instrument: "Bass", sound: "square", gain: 0.54 },
  { min: 40, max: 47, instrument: "Strings", sound: "triangle", gain: 0.44 },
  { min: 48, max: 55, instrument: "Ensemble", sound: "sine", gain: 0.42 },
  { min: 56, max: 63, instrument: "Brass", sound: "sawtooth", gain: 0.52 },
  { min: 64, max: 71, instrument: "Reed", sound: "square", gain: 0.5 },
  { min: 72, max: 79, instrument: "Pipe", sound: "sine", gain: 0.48 },
  { min: 80, max: 87, instrument: "Synth Lead", sound: "sawtooth", gain: 0.46 },
  { min: 88, max: 95, instrument: "Synth Pad", sound: "triangle", gain: 0.4 },
  { min: 96, max: 103, instrument: "Synth FX", sound: "square", gain: 0.36 },
  { min: 104, max: 111, instrument: "Ethnic", sound: "triangle", gain: 0.46 },
  { min: 112, max: 119, instrument: "Percussive", sound: "square", gain: 0.45 },
  { min: 120, max: 127, instrument: "SFX", sound: "sawtooth", gain: 0.35 }
];

const DRUM_MAPPINGS: Array<{ midi: number; token: string }> = [
  { midi: 35, token: "bd" },
  { midi: 36, token: "bd" },
  { midi: 38, token: "sd" },
  { midi: 40, token: "sd" },
  { midi: 42, token: "hh" },
  { midi: 44, token: "hh" },
  { midi: 46, token: "hh" },
  { midi: 45, token: "sd" },
  { midi: 47, token: "sd" },
  { midi: 50, token: "sd" },
  { midi: 49, token: "cr" },
  { midi: 57, token: "cr" }
];

function resolveProgram(program: number | null): {
  instrument: string;
  sound: string;
  gain: number;
  fallback: boolean;
} {
  if (program !== null) {
    const mapped = PROGRAM_MAPS.find((entry) => program >= entry.min && program <= entry.max);
    if (mapped) {
      return {
        instrument: mapped.instrument,
        sound: mapped.sound,
        gain: mapped.gain,
        fallback: false
      };
    }
  }

  return {
    instrument: "Fallback Synth",
    sound: "sawtooth",
    gain: 0.42,
    fallback: true
  };
}

export function mapDrumNoteToToken(midiNote: number): { token: string; fallback: boolean } {
  const exact = DRUM_MAPPINGS.find((entry) => entry.midi === midiNote);
  if (exact) {
    return { token: exact.token, fallback: false };
  }

  const nearest = DRUM_MAPPINGS
    .map((entry) => ({ entry, diff: Math.abs(entry.midi - midiNote) }))
    .sort((a, b) => a.diff - b.diff)[0]?.entry;

  return {
    token: nearest?.token ?? "bd",
    fallback: true
  };
}

export function mapNormalizedMidi(
  midi: NormalizedMidi,
  baseReports: MidiTrackReport[]
): {
  midi: MappedMidi;
  warnings: MidiImportWarning[];
  trackReports: MidiTrackReport[];
} {
  let fallbackCount = 0;
  const mappedTracks: MappedTrack[] = midi.tracks.map((track) => {
    if (track.role === "drum") {
      return {
        ...track,
        instrument: "Drums",
        sound: "Linn9000",
        gain: 0.3
      };
    }

    const mapping = resolveProgram(track.program);
    if (mapping.fallback) {
      fallbackCount += 1;
    }
    return {
      ...track,
      instrument: mapping.instrument,
      sound: mapping.sound,
      gain: mapping.gain
    };
  });

  const reportsByTrack = new Map(baseReports.map((report) => [report.trackIndex, report]));
  const trackReports = mappedTracks.map((track) => {
    const existing = reportsByTrack.get(track.trackIndex);
    return {
      trackIndex: track.trackIndex,
      name: existing?.name ?? track.name,
      role: track.role,
      noteCount: track.notes.length,
      channel: track.channel,
      program: track.program,
      instrument: track.instrument,
      skipped: existing?.skipped
    } satisfies MidiTrackReport;
  });

  const warnings: MidiImportWarning[] = [];
  if (fallbackCount > 0) {
    warnings.push({
      code: "unmapped_instrument_fallback",
      message: "Some tracks used fallback instruments due to unmapped/unknown MIDI programs.",
      count: fallbackCount
    });
  }

  return {
    midi: {
      ...midi,
      tracks: mappedTracks
    },
    warnings,
    trackReports
  };
}
