export type MidiImportWarningCode =
  | "tempo_changes_ignored"
  | "time_signature_changes_ignored"
  | "unsupported_midi_type"
  | "track_skipped_no_notes"
  | "events_ignored"
  | "note_limit_exceeded"
  | "unmapped_instrument_fallback"
  | "overlap_repaired";

export interface MidiImportOptions {
  quantizeDivision: number;
  maxTracks: number;
  maxNotes: number;
  preferSharps: boolean;
  includeVelocityAsGain: boolean;
}

export const DEFAULT_MIDI_IMPORT_OPTIONS: MidiImportOptions = {
  quantizeDivision: 16,
  maxTracks: 24,
  maxNotes: 100_000,
  preferSharps: false,
  includeVelocityAsGain: true
};

export interface MidiImportWarning {
  code: MidiImportWarningCode;
  message: string;
  count?: number;
}

export interface MidiTrackReport {
  trackIndex: number;
  name: string;
  role: "melodic" | "drum";
  noteCount: number;
  channel: number | null;
  program: number | null;
  instrument: string;
  skipped?: boolean;
}

export interface MidiImportResult {
  code: string;
  bpm: number;
  bars: number;
  tracksImported: number;
  warnings: MidiImportWarning[];
  trackReports: MidiTrackReport[];
  sectionSummary: string[];
}

export class MidiImportError extends Error {
  readonly code: MidiImportWarningCode | "invalid_midi";

  constructor(code: MidiImportWarningCode | "invalid_midi", message: string) {
    super(message);
    this.name = "MidiImportError";
    this.code = code;
  }
}
