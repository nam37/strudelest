import type { MidiImportOptions, MidiImportResult, MidiImportWarning } from "./types";
import { DEFAULT_MIDI_IMPORT_OPTIONS, MidiImportError } from "./types";
import { parseMidiArrayBuffer } from "./parse";
import { normalizeParsedMidi } from "./normalize";
import { quantizeNormalizedMidi } from "./quantize";
import { mapNormalizedMidi } from "./map";
import { buildStrudelFromMidi } from "./toStrudel";

function mergeOptions(overrides?: Partial<MidiImportOptions>): MidiImportOptions {
  return {
    ...DEFAULT_MIDI_IMPORT_OPTIONS,
    ...overrides
  };
}

function mergeWarnings(warnings: MidiImportWarning[]): MidiImportWarning[] {
  const merged = new Map<string, MidiImportWarning>();
  for (const warning of warnings) {
    const existing = merged.get(warning.code);
    if (!existing) {
      merged.set(warning.code, { ...warning });
      continue;
    }
    const nextCount = (existing.count ?? 1) + (warning.count ?? 1);
    merged.set(warning.code, {
      ...existing,
      count: nextCount
    });
  }
  return Array.from(merged.values());
}

export async function importMidiArrayBuffer(
  arrayBuffer: ArrayBuffer,
  filename: string,
  options?: Partial<MidiImportOptions>
): Promise<MidiImportResult> {
  const resolvedOptions = mergeOptions(options);
  try {
    const parsed = await parseMidiArrayBuffer(arrayBuffer);
    const normalized = normalizeParsedMidi(parsed, filename, resolvedOptions);
    const quantized = quantizeNormalizedMidi(normalized.midi, resolvedOptions);
    const mapped = mapNormalizedMidi(quantized, normalized.trackReports);
    const generated = buildStrudelFromMidi(mapped.midi, filename, resolvedOptions);
    const warnings = mergeWarnings([...normalized.warnings, ...mapped.warnings]);

    const warningSummary = warnings.map((warning) => {
      const countSuffix = warning.count && warning.count > 1 ? ` (${warning.count})` : "";
      return `Warning: ${warning.message}${countSuffix}`;
    });

    return {
      code: generated.code,
      bpm: mapped.midi.bpm,
      bars: mapped.midi.bars,
      tracksImported: mapped.midi.tracks.length,
      warnings,
      trackReports: mapped.trackReports,
      sectionSummary: [...generated.sectionSummary, ...warningSummary]
    };
  } catch (error) {
    if (error instanceof MidiImportError) {
      throw error;
    }
    throw new MidiImportError("invalid_midi", "MIDI import failed due to invalid or unsupported file content.");
  }
}

export async function importMidiFile(
  file: File,
  options?: Partial<MidiImportOptions>
): Promise<MidiImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  return importMidiArrayBuffer(arrayBuffer, file.name, options);
}
