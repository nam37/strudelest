import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createSeed, generatePiece } from "./core/generator";
import {
  generateLongFormPiece,
  type ArrangementStyle,
  type LengthPreset
} from "./core/generator/arranger";
import { importMidiFile } from "./core/midi/importMidi";
import { decodeSharePayload, encodeSharePayload } from "./core/share";
import { deletePiece, loadPieces, upsertPiece } from "./core/storage";
import { templates } from "./core/templates";
import { createPlaybackAdapter } from "./core/strudel";
import type { PieceSpec, TemplateParamValue } from "./types/music";
import { MidiImportError, type MidiImportOptions } from "./core/midi/types";

interface GeneratorState {
  bpm: number;
  bars: number;
  seed: string;
  params: Record<string, TemplateParamValue>;
}

interface ReferenceSong {
  id: string;
  title: string;
  path: string;
}

type ComposeMode = "loop" | "suite";
type ControlTab = "generator" | "dock" | "midi-import" | "reference-songs" | "saved-pieces";

type AutoVisualizationKind = "scope" | "pianoroll";
type MidiUiOptions = Pick<MidiImportOptions, "quantizeDivision" | "preferSharps" | "includeVelocityAsGain">;

const VIS_BLOCK_START = "// [strudelest-visualization-start]";
const VIS_BLOCK_END = "// [strudelest-visualization-end]";
const DRUM_LINE_REGEX = /\b(bd|sd|hh|cp|cr|tom|rim|perc)\b|bank\(\s*["']Linn9000["']\s*\)/i;
const MELODIC_LINE_REGEX = /\bnote\s*\(|\.note\s*\(|\bscale\s*\(|\bchord\s*\(|\bn\s*\(/i;
const PATTERN_LINE_REGEX = /(^|[.(\s])s\s*\(|\bnote\s*\(|\bn\s*\(|\bchord\s*\(|\bscale\s*\(/i;
const INLINE_SCOPE_REGEX = /\._scope\s*\(/;
const INLINE_PIANOROLL_REGEX = /\._pianoroll\s*\(/;

function getTemplateById(templateId: string) {
  return templates.find((template) => template.id === templateId);
}

function initialGeneratorState(templateId: string): GeneratorState {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }
  return {
    bpm: template.defaults.bpm,
    bars: template.defaults.bars,
    seed: createSeed(),
    params: { ...template.defaults.params }
  };
}

function countMatches(pattern: RegExp, value: string): number {
  const matches = value.match(pattern);
  return matches ? matches.length : 0;
}

function detectVisualizationKind(code: string): AutoVisualizationKind {
  const drumScore =
    countMatches(/\b(bd|sd|hh|cp|cr|tom|rim|perc)\b/gi, code) +
    countMatches(/bank\(\s*["']Linn9000["']\s*\)/gi, code);
  const melodicScore =
    countMatches(/\bnote\s*\(/gi, code) +
    countMatches(/\.note\s*\(/gi, code) +
    countMatches(/\bscale\s*\(/gi, code) +
    countMatches(/\bchord\s*\(/gi, code) +
    countMatches(/\bn\s*\(/gi, code);

  return drumScore > melodicScore ? "scope" : "pianoroll";
}

function appendInlineVisualization(line: string, kind: AutoVisualizationKind): string {
  const method = kind === "scope" ? "_scope()" : "_pianoroll()";
  if (kind === "scope" && INLINE_SCOPE_REGEX.test(line)) {
    return line;
  }
  if (kind === "pianoroll" && INLINE_PIANOROLL_REGEX.test(line)) {
    return line;
  }

  const commentMatch = /^([\s\S]*?)(\s*\/\/.*)?$/.exec(line);
  const body = (commentMatch?.[1] ?? line).replace(/\s+$/, "");
  const comment = commentMatch?.[2] ?? "";
  if (!body) {
    return line;
  }

  if (body.endsWith(",")) {
    return `${body.slice(0, -1)}.${method},${comment}`;
  }
  if (body.endsWith(";")) {
    return `${body.slice(0, -1)}.${method};${comment}`;
  }
  return `${body}.${method}${comment}`;
}

function App(): JSX.Element {
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [generatorState, setGeneratorState] = useState<GeneratorState>(() =>
    initialGeneratorState(templates[0]?.id ?? "")
  );
  const [currentPiece, setCurrentPiece] = useState<PieceSpec | null>(null);
  const [codeDraft, setCodeDraft] = useState<string>("");
  const [draftName, setDraftName] = useState<string>("Untitled Sketch");
  const [pushedCode, setPushedCode] = useState<string | null>(null);
  const [isPlayingUi, setIsPlayingUi] = useState<boolean>(false);
  const [library, setLibrary] = useState<PieceSpec[]>(() => loadPieces());
  const [status, setStatus] = useState<string>("Ready");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [composeMode, setComposeMode] = useState<ComposeMode>("suite");
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>("long");
  const [arrangementStyle, setArrangementStyle] = useState<ArrangementStyle>("arc");
  const [sectionSummary, setSectionSummary] = useState<string[]>([]);
  const [referenceSongs, setReferenceSongs] = useState<ReferenceSong[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>("");
  const [controlTab, setControlTab] = useState<ControlTab>("generator");
  const [dockContainerEl, setDockContainerEl] = useState<HTMLDivElement | null>(null);
  const [midiImportOptions, setMidiImportOptions] = useState<MidiUiOptions>({
    quantizeDivision: 16,
    preferSharps: false,
    includeVelocityAsGain: true
  });
  const midiFileInputRef = useRef<HTMLInputElement | null>(null);
  const adapter = useMemo(() => createPlaybackAdapter(), []);

  const activeTemplate = useMemo(() => getTemplateById(activeTemplateId), [activeTemplateId]);
  const isDockSynced = pushedCode !== null && pushedCode === codeDraft;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload = params.get("p");
    if (!payload) {
      return;
    }
    const decoded = decodeSharePayload(payload);
    if (!decoded) {
      setStatus("Share payload invalid.");
      return;
    }

    const template = getTemplateById(decoded.templateId);
    if (!template) {
      setStatus(`Share template unavailable: ${decoded.templateId}`);
      return;
    }
    setActiveTemplateId(template.id);
    const nextState: GeneratorState = {
      bpm: decoded.bpm,
      bars: decoded.bars,
      seed: decoded.seed,
      params: decoded.params
    };
    setGeneratorState(nextState);
    const piece = generatePiece(template, nextState);
    const hydrated = {
      ...piece,
      code: decoded.code ?? piece.code
    };
    setCurrentPiece(hydrated);
    setCodeDraft(hydrated.code);
    setDraftName(hydrated.name);
    setSectionSummary([`Loaded from URL (${hydrated.bars} bars)`]);
    setStatus("Loaded from share URL");
  }, []);

  useEffect(() => {
    adapter.setDockContainer(dockContainerEl);
  }, [adapter, dockContainerEl]);

  useEffect(() => {
    let alive = true;
    const loadManifest = async (): Promise<void> => {
      try {
        const response = await fetch("/songbook/manifest.json", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { songs?: ReferenceSong[] };
        const songs = Array.isArray(payload.songs) ? payload.songs : [];
        if (!alive) {
          return;
        }
        setReferenceSongs(songs);
        if (songs.length > 0) {
          setSelectedReferenceId(songs[0].id);
        }
      } catch {
        // ignore if songbook is not yet synced
      }
    };
    void loadManifest();
    return () => {
      alive = false;
    };
  }, []);

  const onTemplateChange = (templateId: string): void => {
    const template = getTemplateById(templateId);
    if (!template) {
      setStatus(`Template unavailable: ${templateId}`);
      return;
    }
    setActiveTemplateId(templateId);
    setGeneratorState({
      bpm: template.defaults.bpm,
      bars: template.defaults.bars,
      seed: createSeed(),
      params: { ...template.defaults.params }
    });
  };

  const onGenerate = (): void => {
    if (!activeTemplate) {
      setStatus("No active template selected.");
      return;
    }
    let piece: PieceSpec;
    if (composeMode === "loop") {
      piece = generatePiece(activeTemplate, generatorState);
      setSectionSummary([`Single loop (${piece.bars} bars)`]);
    } else {
      const arranged = generateLongFormPiece({
        baseTemplate: activeTemplate,
        templates,
        seed: generatorState.seed,
        bpm: generatorState.bpm,
        style: arrangementStyle,
        length: lengthPreset,
        baseParams: generatorState.params
      });
      const timestamp = new Date().toISOString();
      piece = {
        id: crypto.randomUUID(),
        name: `${activeTemplate.label} ${arranged.titleTag}`,
        templateId: activeTemplate.id,
        bpm: generatorState.bpm,
        bars: arranged.totalBars,
        seed: generatorState.seed,
        params: {
          ...generatorState.params,
          mode: composeMode,
          style: arrangementStyle,
          length: lengthPreset
        },
        code: arranged.code,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 2
      };
      setSectionSummary(
        arranged.sections.map(
          (section, index) =>
            `${index + 1}. ${section.label} - ${section.templateId} - ${section.bars} bars`
        )
      );
    }
    const withVisualization = injectAutoVisualization(piece.code);
    const pieceWithVisualization: PieceSpec = {
      ...piece,
      code: withVisualization.code
    };
    setCurrentPiece(pieceWithVisualization);
    setDraftName(pieceWithVisualization.name);
    setCodeDraft(pieceWithVisualization.code);
    setShareUrl("");
    const vizLabel = withVisualization.kinds.length > 0 ? withVisualization.kinds.join("+") : "none";
    setStatus(`Generated ${piece.name} + inline visualization (${vizLabel})`);
  };

  const onPlay = async (): Promise<void> => {
    if (!isDockSynced || !pushedCode) {
      setStatus("Push To Strudel Dock before playing.");
      return;
    }
    try {
      await adapter.play(pushedCode);
      setIsPlayingUi(true);
      setStatus("Playing");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Playback failed";
      setStatus(message);
    }
  };

  const onStop = async (): Promise<void> => {
    await adapter.stop();
    setIsPlayingUi(false);
    setStatus("Stopped");
  };

  const onSave = (): void => {
    if (!currentPiece) {
      setStatus("Generate a piece first.");
      return;
    }
    const updatedPiece: PieceSpec = {
      ...currentPiece,
      name: draftName.trim() || currentPiece.name,
      code: codeDraft,
      updatedAt: new Date().toISOString()
    };
    const nextLibrary = upsertPiece(updatedPiece);
    setLibrary(nextLibrary);
    setCurrentPiece(updatedPiece);
    setStatus("Saved locally");
  };

  const onCopyShare = async (): Promise<void> => {
    if (!currentPiece) {
      setStatus("Generate a piece first.");
      return;
    }
    const payload = encodeSharePayload({
      ...currentPiece,
      name: draftName.trim() || currentPiece.name,
      code: codeDraft
    });
    const url = `${window.location.origin}${window.location.pathname}?p=${encodeURIComponent(payload)}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Share URL copied");
    } catch {
      setStatus(`Copy failed. URL: ${url}`);
    }
  };

  const onDeletePiece = (pieceId: string): void => {
    const next = deletePiece(pieceId);
    setLibrary(next);
    if (currentPiece?.id === pieceId) {
      setCurrentPiece(null);
      setCodeDraft("");
      setDraftName("Untitled Sketch");
      setShareUrl("");
    }
    setStatus("Deleted piece");
  };

  const removeVisualizationBlock = (code: string): string => {
    const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escape(VIS_BLOCK_START)}[\\s\\S]*?${escape(VIS_BLOCK_END)}\\n?`, "g");
    return code.replace(pattern, "").trim();
  };

  const injectAutoVisualization = (code: string): { code: string; kinds: AutoVisualizationKind[] } => {
    const base = removeVisualizationBlock(code);
    const lines = base.split("\n");
    let drumIndex = -1;
    let melodicIndex = -1;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("setcps(") ||
        trimmed.startsWith("setbpm(")
      ) {
        continue;
      }
      if (!PATTERN_LINE_REGEX.test(trimmed)) {
        continue;
      }
      if (drumIndex === -1 && DRUM_LINE_REGEX.test(trimmed)) {
        drumIndex = index;
      }
      if (melodicIndex === -1 && MELODIC_LINE_REGEX.test(trimmed) && !DRUM_LINE_REGEX.test(trimmed)) {
        melodicIndex = index;
      }
      if (drumIndex !== -1 && melodicIndex !== -1) {
        break;
      }
    }

    const kinds = new Set<AutoVisualizationKind>();
    if (drumIndex !== -1) {
      lines[drumIndex] = appendInlineVisualization(lines[drumIndex], "scope");
      kinds.add("scope");
    }
    if (melodicIndex !== -1) {
      lines[melodicIndex] = appendInlineVisualization(lines[melodicIndex], "pianoroll");
      kinds.add("pianoroll");
    }

    if (kinds.size === 0) {
      const fallbackKind = detectVisualizationKind(base);
      const fallbackIndex = lines.findIndex((line) => PATTERN_LINE_REGEX.test(line));
      if (fallbackIndex !== -1) {
        lines[fallbackIndex] = appendInlineVisualization(lines[fallbackIndex], fallbackKind);
        kinds.add(fallbackKind);
      }
    }

    return {
      code: lines.join("\n").trim(),
      kinds: [...kinds]
    };
  };

  const onLoadReferenceSong = async (): Promise<boolean> => {
    const selected = referenceSongs.find((song) => song.id === selectedReferenceId);
    if (!selected) {
      setStatus("No reference song selected.");
      return false;
    }
    try {
      const response = await fetch(`/songbook/${selected.path}`, { cache: "no-store" });
      if (!response.ok) {
        setStatus("Reference song unavailable.");
        return false;
      }
      const code = await response.text();
      setCodeDraft(code.trim());
      setDraftName(`Reference: ${selected.title}`);
      setShareUrl("");
      setSectionSummary([`Reference song loaded: ${selected.title}`]);
      setStatus(`Loaded reference: ${selected.title}`);
      return true;
    } catch {
      setStatus("Failed to load reference song.");
      return false;
    }
  };

  const onOpenMidiPicker = (): void => {
    midiFileInputRef.current?.click();
  };

  const onMidiFileSelected = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setStatus(`Importing MIDI: ${file.name}...`);
    try {
      const result = await importMidiFile(file, midiImportOptions);
      const withVisualization = injectAutoVisualization(result.code);
      const trimmedName = file.name.replace(/\.[^.]+$/, "");
      setCodeDraft(withVisualization.code);
      setDraftName(`Imported: ${trimmedName}`);
      setCurrentPiece(null);
      setShareUrl("");
      setSectionSummary(result.sectionSummary);
      setGeneratorState((prev) => ({
        ...prev,
        bpm: result.bpm,
        bars: result.bars
      }));
      setStatus(
        `Imported MIDI (1/${midiImportOptions.quantizeDivision}): ${result.tracksImported} tracks, ${result.bars} bars + inline visualization (${withVisualization.kinds.join("+") || "none"})`
      );
    } catch (error) {
      const message =
        error instanceof MidiImportError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown MIDI import error";
      setStatus(`MIDI import failed: ${message}`);
    } finally {
      event.target.value = "";
    }
  };

  const loadPieceIntoEditor = (piece: PieceSpec): void => {
    const template = getTemplateById(piece.templateId);
    if (!template) {
      setStatus(`Saved piece template unavailable: ${piece.templateId}`);
      return;
    }
    setCurrentPiece(piece);
    setActiveTemplateId(template.id);
    setGeneratorState({
      bpm: piece.bpm,
      bars: piece.bars,
      seed: piece.seed,
      params: piece.params
    });
    const maybeMode = piece.params.mode;
    if (maybeMode === "loop" || maybeMode === "suite") {
      setComposeMode(maybeMode);
    }
    const maybeStyle = piece.params.style;
    if (maybeStyle === "arc" || maybeStyle === "club" || maybeStyle === "cinematic") {
      setArrangementStyle(maybeStyle);
    }
    const maybeLength = piece.params.length;
    if (maybeLength === "short" || maybeLength === "medium" || maybeLength === "long" || maybeLength === "xl") {
      setLengthPreset(maybeLength);
    }
    setDraftName(piece.name);
    setCodeDraft(piece.code);
    setIsPlayingUi(false);
    setShareUrl("");
    setSectionSummary([`Loaded saved piece (${piece.bars} bars)`]);
    setStatus(`Loaded ${piece.name}`);
  };

  const onPushToStrudelDock = async (): Promise<void> => {
    if (!codeDraft.trim()) {
      setStatus("Nothing to push.");
      return;
    }
    try {
      await adapter.pushCode(codeDraft);
      setPushedCode(codeDraft);
      setControlTab("dock");
      const isJsDom =
        typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
          ? /jsdom/i.test(navigator.userAgent)
          : false;
      if (!isJsDom && typeof window.scrollTo === "function") {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          // ignore in non-browser test environments
        }
      }
      setStatus("Pushed To Strudel Dock.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Push failed";
      setStatus(message);
    }
  };

  const renderStrudelInput = (
    idSuffix: "generator" | "midi" | "reference" | "saved"
  ): JSX.Element => (
    <>
      <h2>Strudel Input</h2>
      <textarea
        value={codeDraft}
        onChange={(event) => setCodeDraft(event.target.value)}
        placeholder="Edit or paste Strudel code here..."
        rows={16}
      />
      <div className="row">
        <button onClick={() => void onPushToStrudelDock()}>Push To Strudel Dock</button>
      </div>
      <p className="dock-note">
        Dock Sync: {isDockSynced ? "ready" : "not pushed"}
      </p>
      {shareUrl ? (
        <>
          <label htmlFor={`shareUrl-${idSuffix}`}>Share URL</label>
          <input id={`shareUrl-${idSuffix}`} type="text" value={shareUrl} readOnly />
        </>
      ) : null}
    </>
  );

  return (
    <>
      <main className="app-shell">
        <header className="hero panel">
        <div className="hero-kicker">Algorithmic Composition Studio</div>
        <h1>strudelest</h1>
        <p>Generate long-form stylized pieces with Strudel and shape full arrangements.</p>
      </header>

        <section className="panel">
          <div className="tab-row" role="tablist" aria-label="Control tabs">
            <button
              className={controlTab === "generator" ? "tab active" : "tab"}
              onClick={() => setControlTab("generator")}
              role="tab"
              aria-selected={controlTab === "generator"}
              aria-controls="panel-generator"
              id="tab-generator"
            >
              Generator
            </button>
            <button
              className={controlTab === "midi-import" ? "tab active" : "tab"}
              onClick={() => setControlTab("midi-import")}
              role="tab"
              aria-selected={controlTab === "midi-import"}
              aria-controls="panel-midi-import"
              id="tab-midi-import"
            >
              MIDI Import
            </button>
            <button
              className={controlTab === "reference-songs" ? "tab active" : "tab"}
              onClick={() => setControlTab("reference-songs")}
              role="tab"
              aria-selected={controlTab === "reference-songs"}
              aria-controls="panel-reference-songs"
              id="tab-reference-songs"
            >
              Reference Songs
            </button>
            <button
              className={controlTab === "saved-pieces" ? "tab active" : "tab"}
              onClick={() => setControlTab("saved-pieces")}
              role="tab"
              aria-selected={controlTab === "saved-pieces"}
              aria-controls="panel-saved-pieces"
              id="tab-saved-pieces"
            >
              Saved Pieces
            </button>
            <button
              className={controlTab === "dock" ? "tab active" : "tab"}
              onClick={() => setControlTab("dock")}
              role="tab"
              aria-selected={controlTab === "dock"}
              aria-controls="panel-dock"
              id="tab-dock"
            >
              Strudel Dock
            </button>
          </div>

          <div
            id="panel-generator"
            role="tabpanel"
            aria-labelledby="tab-generator"
            className={controlTab === "generator" ? "tab-panel active" : "tab-panel"}
            aria-hidden={controlTab !== "generator"}
          >
            <div className="tab-layout">
              <div className="tab-main">
                <h2>Generator</h2>
                <label htmlFor="composeMode">Compose Mode</label>
                <select
                  id="composeMode"
                  value={composeMode}
                  onChange={(event) => setComposeMode(event.target.value as ComposeMode)}
                >
                  <option value="suite">Long-form Suite</option>
                  <option value="loop">Single Loop</option>
                </select>

                <label htmlFor="template">Template</label>
                <select
                  id="template"
                  value={activeTemplateId}
                  onChange={(event) => onTemplateChange(event.target.value)}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>

                <label htmlFor="bpm">BPM</label>
                <input
                  id="bpm"
                  type="number"
                  min={60}
                  max={200}
                  value={generatorState.bpm}
                  onChange={(event) =>
                    setGeneratorState((prev) => ({ ...prev, bpm: Number(event.target.value) }))
                  }
                />

                <label htmlFor="bars">Bars</label>
                <input
                  id="bars"
                  type="number"
                  min={1}
                  max={256}
                  value={generatorState.bars}
                  onChange={(event) =>
                    setGeneratorState((prev) => ({ ...prev, bars: Number(event.target.value) }))
                  }
                />

                <label htmlFor="seed">Seed</label>
                <input
                  id="seed"
                  type="text"
                  value={generatorState.seed}
                  onChange={(event) =>
                    setGeneratorState((prev) => ({ ...prev, seed: event.target.value }))
                  }
                />

                <label htmlFor="pieceName">Piece Name</label>
                <input
                  id="pieceName"
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                />

                {composeMode === "suite" ? (
                  <>
                    <label htmlFor="lengthPreset">Length</label>
                    <select
                      id="lengthPreset"
                      value={lengthPreset}
                      onChange={(event) => setLengthPreset(event.target.value as LengthPreset)}
                    >
                      <option value="short">Short (32 bars)</option>
                      <option value="medium">Medium (64 bars)</option>
                      <option value="long">Long (96 bars)</option>
                      <option value="xl">XL (128 bars)</option>
                    </select>

                    <label htmlFor="arrangementStyle">Arrangement</label>
                    <select
                      id="arrangementStyle"
                      value={arrangementStyle}
                      onChange={(event) => setArrangementStyle(event.target.value as ArrangementStyle)}
                    >
                      <option value="arc">Arc</option>
                      <option value="club">Club</option>
                      <option value="cinematic">Cinematic</option>
                    </select>
                  </>
                ) : null}

                {(activeTemplate?.paramSchema ?? []).map((param) => (
                  <div key={param.key}>
                    <label htmlFor={param.key}>{param.key}</label>
                    {param.type === "number" ? (
                      <input
                        id={param.key}
                        type="number"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={Number(generatorState.params[param.key] ?? 0)}
                        onChange={(event) =>
                          setGeneratorState((prev) => ({
                            ...prev,
                            params: {
                              ...prev.params,
                              [param.key]: Number(event.target.value)
                            }
                          }))
                        }
                      />
                    ) : null}
                    {param.type === "select" ? (
                      <select
                        id={param.key}
                        value={String(generatorState.params[param.key] ?? "")}
                        onChange={(event) =>
                          setGeneratorState((prev) => ({
                            ...prev,
                            params: {
                              ...prev.params,
                              [param.key]: event.target.value
                            }
                          }))
                        }
                      >
                        {param.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {param.type === "boolean" ? (
                      <input
                        id={param.key}
                        type="checkbox"
                        checked={Boolean(generatorState.params[param.key])}
                        onChange={(event) =>
                          setGeneratorState((prev) => ({
                            ...prev,
                            params: {
                              ...prev.params,
                              [param.key]: event.target.checked
                            }
                          }))
                        }
                      />
                    ) : null}
                  </div>
                ))}

                <div className="row">
                  <button onClick={onGenerate}>Generate</button>
                  <button
                    onClick={() => setGeneratorState((prev) => ({ ...prev, seed: createSeed() }))}
                  >
                    New Seed
                  </button>
                </div>
                {controlTab === "generator" ? renderStrudelInput("generator") : null}
              </div>
              <aside className="tab-sidebar">
                <p className="status">Status: {status}</p>
                <h2>Arrangement Map</h2>
                {sectionSummary.length > 0 ? (
                  <ul className="section-list">
                    {sectionSummary.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="dock-note">No arrangement summary yet. Generate a piece to populate this map.</p>
                )}
              </aside>
            </div>
          </div>

          <div
            id="panel-dock"
            role="tabpanel"
            aria-labelledby="tab-dock"
            className={controlTab === "dock" ? "tab-panel active" : "tab-panel"}
            aria-hidden={controlTab !== "dock"}
          >
            <div className="tab-layout">
              <div className="tab-main">
                <h2>Strudel Dock</h2>
                <p className="dock-note">
                  Embedded Strudel player/editor. Push code from Generator, MIDI Import, or Reference Songs before playback.
                </p>
                <div ref={setDockContainerEl} className="strudel-dock" />
              </div>
              <aside className="tab-sidebar">
                <h2>Transport</h2>
                <div className="row">
                  <button onClick={() => void onPlay()} disabled={!isDockSynced || isPlayingUi}>
                    Play
                  </button>
                  <button onClick={() => void onStop()} disabled={!isPlayingUi}>
                    Stop
                  </button>
                  <button onClick={onSave}>Save</button>
                  <button onClick={() => void onCopyShare()}>Share</button>
                </div>
                <p className="status">Status: {status}</p>
              </aside>
            </div>
          </div>

          <div
            id="panel-midi-import"
            role="tabpanel"
            aria-labelledby="tab-midi-import"
            className={controlTab === "midi-import" ? "tab-panel active" : "tab-panel"}
            aria-hidden={controlTab !== "midi-import"}
          >
            <div className="tab-layout">
              <div className="tab-main">
                <h2>MIDI Import</h2>
                <p className="dock-note">
                  Import a `.mid` file and convert it into layered Strudel code.
                </p>
                <label htmlFor="midiQuantize">Import Quantize Division (re-import to apply)</label>
                <select
                  id="midiQuantize"
                  value={String(midiImportOptions.quantizeDivision)}
                  onChange={(event) =>
                    setMidiImportOptions((prev) => ({
                      ...prev,
                      quantizeDivision: Number(event.target.value)
                    }))
                  }
                >
                  <option value="4">1/4</option>
                  <option value="8">1/8</option>
                  <option value="16">1/16</option>
                  <option value="24">1/24</option>
                  <option value="32">1/32</option>
                </select>
                <label htmlFor="midiPreferSharps">Prefer Sharps</label>
                <input
                  id="midiPreferSharps"
                  type="checkbox"
                  checked={midiImportOptions.preferSharps}
                  onChange={(event) =>
                    setMidiImportOptions((prev) => ({
                      ...prev,
                      preferSharps: event.target.checked
                    }))
                  }
                />
                <label htmlFor="midiVelocityGain">Use Velocity as Gain</label>
                <input
                  id="midiVelocityGain"
                  type="checkbox"
                  checked={midiImportOptions.includeVelocityAsGain}
                  onChange={(event) =>
                    setMidiImportOptions((prev) => ({
                      ...prev,
                      includeVelocityAsGain: event.target.checked
                    }))
                  }
                />
                <div className="row">
                  <button onClick={onOpenMidiPicker}>Import MIDI</button>
                </div>
                <input
                  ref={midiFileInputRef}
                  type="file"
                  accept=".mid,.midi,audio/midi"
                  onChange={(event) => void onMidiFileSelected(event)}
                  style={{ display: "none" }}
                />
                {controlTab === "midi-import" ? renderStrudelInput("midi") : null}
              </div>
              <aside className="tab-sidebar">
                <p className="status">Status: {status}</p>
                <h2>Tips</h2>
                <ul className="section-list">
                  <li>Re-import after changing quantize settings.</li>
                  <li>Use Push To Strudel Dock before playing in Strudel Dock.</li>
                </ul>
              </aside>
            </div>
          </div>

          <div
            id="panel-reference-songs"
            role="tabpanel"
            aria-labelledby="tab-reference-songs"
            className={controlTab === "reference-songs" ? "tab-panel active" : "tab-panel"}
            aria-hidden={controlTab !== "reference-songs"}
          >
            <div className="tab-layout">
              <div className="tab-main">
                <h2>Reference Songs</h2>
                <label htmlFor="referenceSong">Songbook</label>
                <select
                  id="referenceSong"
                  value={selectedReferenceId}
                  onChange={(event) => setSelectedReferenceId(event.target.value)}
                  disabled={referenceSongs.length === 0}
                >
                  {referenceSongs.length === 0 ? (
                    <option value="">No songs found (run songbook sync)</option>
                  ) : null}
                  {referenceSongs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                    </option>
                  ))}
                </select>
                <div className="row">
                  <button onClick={() => void onLoadReferenceSong()} disabled={referenceSongs.length === 0}>
                    Load Reference
                  </button>
                </div>
                {controlTab === "reference-songs" ? renderStrudelInput("reference") : null}
              </div>
              <aside className="tab-sidebar">
                <p className="status">Status: {status}</p>
                <h2>Tips</h2>
                <ul className="section-list">
                  <li>Load a song, tweak code in Strudel Input, then push to dock.</li>
                  <li>Use Strudel Dock for Play, Stop, Save, and Share.</li>
                </ul>
              </aside>
            </div>
          </div>

          <div
            id="panel-saved-pieces"
            role="tabpanel"
            aria-labelledby="tab-saved-pieces"
            className={controlTab === "saved-pieces" ? "tab-panel active" : "tab-panel"}
            aria-hidden={controlTab !== "saved-pieces"}
          >
            <div className="tab-layout">
              <div className="tab-main">
                <h2>Saved Pieces ({library.length})</h2>
                <ul>
                  {library.map((piece) => (
                    <li key={piece.id}>
                      <div className="saved-row">
                        <button className="link" onClick={() => loadPieceIntoEditor(piece)}>
                          {piece.name}
                        </button>
                        <button className="danger" onClick={() => onDeletePiece(piece.id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {controlTab === "saved-pieces" ? renderStrudelInput("saved") : null}
              </div>
              <aside className="tab-sidebar">
                <p className="status">Status: {status}</p>
                <h2>Tips</h2>
                <ul className="section-list">
                  <li>Load a saved piece to bring it back into Generator.</li>
                  <li>Delete removes the piece from local storage.</li>
                </ul>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
