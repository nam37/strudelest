export interface ParsedMidiNote {
  pitch: number;
  velocity: number;
  startTick: number;
  durationTick: number;
  channel: number;
  program: number | null;
}

export interface ParsedMidiTrack {
  trackIndex: number;
  name: string;
  notes: ParsedMidiNote[];
  ignoredEvents: number;
}

export interface TempoEvent {
  tick: number;
  bpm: number;
}

export interface TimeSignatureEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

export interface ParsedMidi {
  format: number;
  ppq: number;
  tracks: ParsedMidiTrack[];
  tempoEvents: TempoEvent[];
  timeSignatureEvents: TimeSignatureEvent[];
  ignoredEvents: number;
}

export interface NormalizedNote {
  pitch: number;
  velocity: number;
  startBeat: number;
  durationBeats: number;
  channel: number;
  program: number | null;
}

export interface NormalizedTrack {
  trackIndex: number;
  name: string;
  role: "melodic" | "drum";
  channel: number | null;
  program: number | null;
  notes: NormalizedNote[];
}

export interface NormalizedMidi {
  filename: string;
  ppq: number;
  bpm: number;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  beatsPerBar: number;
  bars: number;
  totalBeats: number;
  tracks: NormalizedTrack[];
}

export interface MappedTrack extends NormalizedTrack {
  instrument: string;
  sound: string;
  gain: number;
}

export interface MappedMidi extends Omit<NormalizedMidi, "tracks"> {
  tracks: MappedTrack[];
}
