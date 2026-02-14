import type { MappedMidi, MappedTrack } from "./model";
import { mapDrumNoteToToken } from "./map";
import type { MidiImportOptions } from "./types";

interface StrudelBuildResult {
  code: string;
  sectionSummary: string[];
}

function sanitizeLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim() || "Untitled Track";
}

function midiToNoteName(midi: number, preferSharps: boolean): string {
  const sharpNotes = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
  const flatNotes = ["c", "db", "d", "eb", "e", "f", "gb", "g", "ab", "a", "bb", "b"];
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = preferSharps ? sharpNotes[noteIndex] : flatNotes[noteIndex];
  return `${name}${octave}`;
}

function compressTokens(tokens: string[]): string[] {
  if (tokens.length === 0) {
    return ["~"];
  }
  const output: string[] = [];
  let current = tokens[0];
  let runLength = 1;
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === current) {
      runLength += 1;
      continue;
    }
    output.push(runLength > 1 ? `${current}!${runLength}` : current);
    current = token;
    runLength = 1;
  }
  output.push(runLength > 1 ? `${current}!${runLength}` : current);
  return output;
}

function tokensForTrack(track: MappedTrack, midi: MappedMidi, options: MidiImportOptions): string[] {
  const step = 1 / Math.max(1, options.quantizeDivision);
  const totalSteps = Math.max(1, Math.ceil((midi.bars * midi.beatsPerBar) / step));
  const eventsByStep = new Map<number, number[]>();

  for (const note of track.notes) {
    const stepIndex = Math.min(totalSteps - 1, Math.max(0, Math.round(note.startBeat / step)));
    const bucket = eventsByStep.get(stepIndex) ?? [];
    bucket.push(note.pitch);
    eventsByStep.set(stepIndex, bucket);
  }

  const tokens: string[] = [];
  for (let stepIndex = 0; stepIndex < totalSteps; stepIndex += 1) {
    const notes = eventsByStep.get(stepIndex);
    if (!notes || notes.length === 0) {
      tokens.push("~");
      continue;
    }

    if (track.role === "drum") {
      const drumTokens = Array.from(new Set(notes.map((pitch) => mapDrumNoteToToken(pitch).token))).sort();
      tokens.push(drumTokens.length === 1 ? drumTokens[0] : `[${drumTokens.join(" ")}]`);
      continue;
    }

    const noteNames = Array.from(new Set(notes))
      .sort((a, b) => a - b)
      .map((pitch) => midiToNoteName(pitch, options.preferSharps));
    tokens.push(noteNames.length === 1 ? noteNames[0] : `[${noteNames.join(" ")}]`);
  }

  return compressTokens(tokens);
}

function buildTrackLine(track: MappedTrack, midi: MappedMidi, options: MidiImportOptions): string {
  const tokens = tokensForTrack(track, midi, options).join(" ");
  const gainBase = track.gain;
  const gain = options.includeVelocityAsGain
    ? Number(
        (
          track.notes.reduce((sum, note) => sum + note.velocity, 0) /
          Math.max(1, track.notes.length)
        ).toFixed(3)
      )
    : gainBase;
  const finalGain = Number((Math.max(0.1, Math.min(1, gain * gainBase + 0.1))).toFixed(3));

  if (track.role === "drum") {
    return `s("${tokens}")` + `.slow(${midi.bars})` + `.bank("Linn9000").gain(${finalGain})`;
  }

  return (
    `note("${tokens}")` +
    `.slow(${midi.bars})` +
    `.s("${track.sound}")` +
    `.gain(${finalGain})`
  );
}

export function buildStrudelFromMidi(
  midi: MappedMidi,
  filename: string,
  options: MidiImportOptions
): StrudelBuildResult {
  const label = filename.replace(/\.[^.]+$/, "");
  const header = [
    `// MIDI import: ${label}`,
    `// Tempo: ${midi.bpm} BPM | Time: ${midi.timeSignature.numerator}/${midi.timeSignature.denominator} | Bars: ${midi.bars}`
  ];

  const trackComments = midi.tracks.map((track) => {
    return `// Track ${track.trackIndex + 1}: ${sanitizeLabel(track.name)} - ${track.instrument} (${track.notes.length} notes)`;
  });

  const trackLines = midi.tracks.map((track) => buildTrackLine(track, midi, options));

  const code =
    `${header.join("\n")}\n` +
    `${trackComments.join("\n")}\n` +
    `setcps(${(midi.bpm / 120).toFixed(3)});\n` +
    `stack(\n` +
    `${trackLines.map((line) => `  ${line}`).join(",\n")}\n` +
    `)`;

  const sectionSummary: string[] = [
    `Imported MIDI "${label}"`,
    `Tempo ${midi.bpm} BPM - ${midi.timeSignature.numerator}/${midi.timeSignature.denominator} - ${midi.bars} bars`,
    ...midi.tracks.map(
      (track) =>
        `Track ${track.trackIndex + 1}: ${sanitizeLabel(track.name)} - ${track.instrument} - ${track.notes.length} notes`
    )
  ];

  return {
    code,
    sectionSummary
  };
}
