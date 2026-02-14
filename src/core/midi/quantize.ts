import type { NormalizedMidi, NormalizedTrack } from "./model";
import type { MidiImportOptions } from "./types";

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function quantizeTrack(track: NormalizedTrack, step: number): NormalizedTrack {
  const notes = track.notes
    .map((note) => {
      const quantizedStart = roundToStep(note.startBeat, step);
      const rawEnd = note.startBeat + note.durationBeats;
      const quantizedEnd = roundToStep(rawEnd, step);
      const durationBeats = Math.max(step, quantizedEnd - quantizedStart);
      return {
        ...note,
        startBeat: quantizedStart,
        durationBeats
      };
    })
    .sort((a, b) => {
      if (a.startBeat !== b.startBeat) {
        return a.startBeat - b.startBeat;
      }
      return a.pitch - b.pitch;
    });

  return {
    ...track,
    notes
  };
}

export function quantizeNormalizedMidi(midi: NormalizedMidi, options: MidiImportOptions): NormalizedMidi {
  const step = 1 / Math.max(1, options.quantizeDivision);
  const tracks = midi.tracks.map((track) => quantizeTrack(track, step));
  const totalBeats = tracks.reduce((maxTrackBeat, track) => {
    const trackEndBeat = track.notes.reduce((maxNoteBeat, note) => {
      return Math.max(maxNoteBeat, note.startBeat + note.durationBeats);
    }, 0);
    return Math.max(maxTrackBeat, trackEndBeat);
  }, 0);
  const bars = Math.max(1, Math.ceil(totalBeats / midi.beatsPerBar));

  return {
    ...midi,
    totalBeats,
    bars,
    tracks
  };
}
