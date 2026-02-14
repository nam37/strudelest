import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { importMidiFileMock, playbackAdapterMock } = vi.hoisted(() => ({
  importMidiFileMock: vi.fn(),
  playbackAdapterMock: {
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    pushCode: vi.fn().mockResolvedValue(undefined),
    setDockContainer: vi.fn(),
    setPlaybackCps: vi.fn(),
    isPlaying: vi.fn(),
    getCurrentCps: vi.fn().mockReturnValue(null)
  }
}));

vi.mock("./core/midi/importMidi", () => ({
  importMidiFile: importMidiFileMock
}));

vi.mock("./core/strudel", () => ({
  createPlaybackAdapter: () => playbackAdapterMock
}));

import App from "./App";

describe("App shell", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    importMidiFileMock.mockReset();
    playbackAdapterMock.play.mockClear();
    playbackAdapterMock.stop.mockClear();
    playbackAdapterMock.pushCode.mockClear();
    playbackAdapterMock.setDockContainer.mockClear();
  });

  it("renders main sections", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "strudelest" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generator" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Transport" })).toBeInTheDocument();
  });

  it("does not render a Visualizations tab", () => {
    render(<App />);
    expect(screen.queryByRole("tab", { name: "Visualizations" })).not.toBeInTheDocument();
  });

  it("renders a Reference Songs tab", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Reference Songs" }));
    expect(screen.getByRole("heading", { name: "Reference Songs" })).toBeInTheDocument();
  });

  it("shows editable strudel input in generator tab", () => {
    render(<App />);
    expect(screen.getByPlaceholderText("Edit or paste Strudel code here...")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Strudel Input" })).toBeInTheDocument();
  });

  it("shows Strudel Input in Generator, MIDI Import, and Reference Songs tabs", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Strudel Input" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "MIDI Import" }));
    expect(screen.getByRole("heading", { name: "Strudel Input" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Reference Songs" }));
    expect(screen.getByRole("heading", { name: "Strudel Input" })).toBeInTheDocument();
  });

  it("generates and saves a piece to the library", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(screen.getByRole("heading", { name: "Saved Pieces (1)" })).toBeInTheDocument();
  });

  it("deletes a saved piece from the library", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(screen.getByRole("heading", { name: "Saved Pieces (0)" })).toBeInTheDocument();
  });

  it("imports MIDI and replaces output code", async () => {
    importMidiFileMock.mockResolvedValue({
      code: "setcps(1.0);\\nstack(s(\"bd\"))",
      bpm: 128,
      bars: 12,
      tracksImported: 2,
      warnings: [],
      trackReports: [],
      sectionSummary: ["Imported MIDI"]
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "MIDI Import" }));

    const fileInput = document.querySelector('input[type=\"file\"]') as HTMLInputElement;
    const file = new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], "demo.mid", {
      type: "audio/midi"
    });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Status: Imported MIDI (1/16): 2 tracks, 12 bars + inline visualization (scope)"
        )
      ).toBeInTheDocument();
    });
    expect(importMidiFileMock).toHaveBeenCalledTimes(1);
    const value = (screen.getByPlaceholderText("Edit or paste Strudel code here...") as HTMLTextAreaElement)
      .value;
    expect(value).toContain('stack(s("bd"))');
    expect(value).toContain("._scope(");
  });

  it("keeps existing code when MIDI import fails", async () => {
    importMidiFileMock.mockRejectedValue(new Error("bad midi"));

    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByPlaceholderText(
      "Edit or paste Strudel code here..."
    ) as HTMLTextAreaElement;
    await user.type(textarea, "existing code");

    const fileInput = document.querySelector('input[type=\"file\"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3, 4])], "broken.mid", {
      type: "audio/midi"
    });
    await user.click(screen.getByRole("tab", { name: "MIDI Import" }));
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("Status: MIDI import failed: bad midi")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: "Generator" }));
    expect(textarea).toHaveValue("existing code");
  });

  it("auto-injects visualization on Generate", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    const updatedTextarea = screen.getByPlaceholderText(
      "Edit or paste Strudel code here..."
    ) as HTMLTextAreaElement;
    expect(updatedTextarea.value).toMatch(/\._(scope|pianoroll)\(/);
  });

  it("re-generating does not inject legacy visualization blocks", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Generate" }));

    const updatedTextarea = screen.getByPlaceholderText(
      "Edit or paste Strudel code here..."
    ) as HTMLTextAreaElement;
    expect(updatedTextarea.value).not.toContain("// [strudelest-visualization-start]");
    expect(updatedTextarea.value).not.toContain("// [strudelest-visualization-end]");
  });

  it("heuristic picks pianoroll for melodic import code", async () => {
    importMidiFileMock.mockResolvedValue({
      code: 'setcps(1.0);\\nnote("c d e").s("sine")',
      bpm: 110,
      bars: 8,
      tracksImported: 1,
      warnings: [],
      trackReports: [],
      sectionSummary: ["Imported MIDI"]
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "MIDI Import" }));
    const fileInput = document.querySelector('input[type=\"file\"]') as HTMLInputElement;
    const file = new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], "melodic.mid", {
      type: "audio/midi"
    });
    await user.upload(fileInput, file);

    const value = (screen.getByPlaceholderText("Edit or paste Strudel code here...") as HTMLTextAreaElement)
      .value;
    expect(value).toContain("._pianoroll(");
  });

  it("requires push before play, then plays and stops", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Push To Studel Dock" }));
    await user.click(screen.getByRole("button", { name: "Play" }));
    await user.click(screen.getByRole("button", { name: "Stop" }));

    expect(playbackAdapterMock.play).toHaveBeenCalledTimes(1);
    expect(playbackAdapterMock.stop).toHaveBeenCalledTimes(1);
    expect(playbackAdapterMock.pushCode).toHaveBeenCalledTimes(1);
  });
});
