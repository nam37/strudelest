import type { MidiImportOptions, MidiImportWarning, MidiTrackReport } from "./types";
import { MidiImportError } from "./types";
import type { NormalizedMidi, NormalizedNote, NormalizedTrack, ParsedMidi } from "./model";

interface NormalizeResult {
  midi: NormalizedMidi;
  warnings: MidiImportWarning[];
  trackReports: MidiTrackReport[];
}

interface WarningAccumulator {
  code: MidiImportWarning["code"];
  message: string;
  count: number;
}

function pushWarning(map: Map<string, WarningAccumulator>, warning: WarningAccumulator): void {
  const existing = map.get(warning.code);
  if (existing) {
    existing.count += warning.count;
    return;
  }
  map.set(warning.code, warning);
}

function toWarnings(map: Map<string, WarningAccumulator>): MidiImportWarning[] {
  return Array.from(map.values()).map((entry) => ({
    code: entry.code,
    message: entry.message,
    count: entry.count
  }));
}

function getDominantNumber(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

function repairAndNormalizeTrackNotes(
  track: ParsedMidi["tracks"][number],
  ppq: number,
  minDuration: number
): { notes: NormalizedNote[]; overlapRepairs: number } {
  const byPitchEnd = new Map<number, number>();
  let overlapRepairs = 0;

  const normalizedNotes = track.notes
    .map((note) => ({
      pitch: note.pitch,
      velocity: note.velocity,
      startBeat: note.startTick / ppq,
      durationBeats: Math.max(minDuration, note.durationTick / ppq),
      channel: note.channel,
      program: note.program
    }))
    .sort((a, b) => {
      if (a.startBeat !== b.startBeat) {
        return a.startBeat - b.startBeat;
      }
      return a.pitch - b.pitch;
    })
    .map((note) => {
      const priorEnd = byPitchEnd.get(note.pitch) ?? -Infinity;
      let startBeat = note.startBeat;
      let durationBeats = note.durationBeats;

      if (startBeat < priorEnd) {
        startBeat = priorEnd;
        overlapRepairs += 1;
      }

      if (durationBeats <= 0) {
        durationBeats = minDuration;
        overlapRepairs += 1;
      }

      if (startBeat + durationBeats <= priorEnd) {
        durationBeats = minDuration;
        overlapRepairs += 1;
      }

      byPitchEnd.set(note.pitch, startBeat + durationBeats);
      return {
        ...note,
        startBeat,
        durationBeats
      };
    });

  return {
    notes: normalizedNotes,
    overlapRepairs
  };
}

export function normalizeParsedMidi(
  parsed: ParsedMidi,
  filename: string,
  options: MidiImportOptions
): NormalizeResult {
  const warningMap = new Map<string, WarningAccumulator>();
  const limitedTracks = parsed.tracks.slice(0, options.maxTracks);
  const totalNoteCount = limitedTracks.reduce((sum, track) => sum + track.notes.length, 0);
  if (totalNoteCount > options.maxNotes) {
    throw new MidiImportError(
      "note_limit_exceeded",
      `MIDI note limit exceeded (${totalNoteCount} > ${options.maxNotes}).`
    );
  }

  if (parsed.tempoEvents.length > 1) {
    pushWarning(warningMap, {
      code: "tempo_changes_ignored",
      message: "Additional tempo changes were ignored.",
      count: parsed.tempoEvents.length - 1
    });
  }

  if (parsed.timeSignatureEvents.length > 1) {
    pushWarning(warningMap, {
      code: "time_signature_changes_ignored",
      message: "Additional time signature changes were ignored.",
      count: parsed.timeSignatureEvents.length - 1
    });
  }

  if (parsed.ignoredEvents > 0) {
    pushWarning(warningMap, {
      code: "events_ignored",
      message: "Some non-note MIDI events were ignored.",
      count: parsed.ignoredEvents
    });
  }

  const firstTempo = parsed.tempoEvents[0]?.bpm ?? 120;
  const firstTimeSignature = parsed.timeSignatureEvents[0] ?? {
    tick: 0,
    numerator: 4,
    denominator: 4
  };
  const beatsPerBar = Math.max(1, firstTimeSignature.numerator * (4 / firstTimeSignature.denominator));
  const minDuration = 1 / options.quantizeDivision;

  const normalizedTracks: NormalizedTrack[] = [];
  const trackReports: MidiTrackReport[] = [];

  for (const track of limitedTracks) {
    if (track.notes.length === 0) {
      pushWarning(warningMap, {
        code: "track_skipped_no_notes",
        message: "Some tracks were skipped because they contain no notes.",
        count: 1
      });
      trackReports.push({
        trackIndex: track.trackIndex,
        name: track.name,
        role: "melodic",
        noteCount: 0,
        channel: null,
        program: null,
        instrument: "Skipped",
        skipped: true
      });
      continue;
    }

    const dominantChannel = getDominantNumber(track.notes.map((note) => note.channel));
    const dominantProgram = getDominantNumber(
      track.notes.map((note) => (note.program === null ? -1 : note.program))
    );

    const role = dominantChannel === 9 ? "drum" : "melodic";
    const { notes, overlapRepairs } = repairAndNormalizeTrackNotes(track, parsed.ppq, minDuration);

    if (overlapRepairs > 0) {
      pushWarning(warningMap, {
        code: "overlap_repaired",
        message: "Overlapping notes were repaired during normalization.",
        count: overlapRepairs
      });
    }

    normalizedTracks.push({
      trackIndex: track.trackIndex,
      name: track.name,
      role,
      channel: dominantChannel,
      program: dominantProgram === -1 ? null : dominantProgram,
      notes
    });

    trackReports.push({
      trackIndex: track.trackIndex,
      name: track.name,
      role,
      noteCount: notes.length,
      channel: dominantChannel,
      program: dominantProgram === -1 ? null : dominantProgram,
      instrument: role === "drum" ? "Drums" : "Unmapped"
    });
  }

  if (normalizedTracks.length === 0) {
    throw new MidiImportError("invalid_midi", "No playable notes found in MIDI file.");
  }

  const totalBeats = normalizedTracks.reduce((maxTrackBeat, track) => {
    const trackMax = track.notes.reduce((maxNoteBeat, note) => {
      return Math.max(maxNoteBeat, note.startBeat + note.durationBeats);
    }, 0);
    return Math.max(maxTrackBeat, trackMax);
  }, 0);

  const bars = Math.max(1, Math.ceil(totalBeats / beatsPerBar));

  return {
    midi: {
      filename,
      ppq: parsed.ppq,
      bpm: Number(firstTempo.toFixed(3)),
      timeSignature: {
        numerator: firstTimeSignature.numerator,
        denominator: firstTimeSignature.denominator
      },
      beatsPerBar,
      bars,
      totalBeats,
      tracks: normalizedTracks
    },
    warnings: toWarnings(warningMap),
    trackReports
  };
}
