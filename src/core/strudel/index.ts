export interface PlaybackAdapter {
  play: (code: string) => Promise<void>;
  stop: () => Promise<void>;
  pushCode: (code: string) => Promise<void>;
  setDockContainer: (container: HTMLElement | null) => void;
  setPlaybackCps: (cps: number) => Promise<void>;
  isPlaying: () => boolean;
  getCurrentCps: () => number | null;
}

export function createPlaybackAdapter(): PlaybackAdapter {
  let editorHandle: Record<string, unknown> | null = null;
  let hostElement: HTMLElement | null = null;
  let dockContainer: HTMLElement | null = null;
  let playVersion = 0;
  let playing = false;
  let currentCps: number | null = null;
  let opChain: Promise<void> = Promise.resolve();

  const enqueue = (task: () => Promise<void>): Promise<void> => {
    const next = opChain.then(task, task);
    opChain = next.catch(() => undefined);
    return next;
  };

  const applyHostPlacement = (): void => {
    if (!hostElement) {
      return;
    }

    if (dockContainer) {
      hostElement.removeAttribute("hide-editor");
      hostElement.style.position = "relative";
      hostElement.style.width = "100%";
      hostElement.style.height = "420px";
      hostElement.style.overflow = "auto";
      hostElement.style.left = "auto";
      hostElement.style.top = "auto";
      if (hostElement.parentElement !== dockContainer) {
        dockContainer.replaceChildren(hostElement);
      }
      return;
    }

    hostElement.setAttribute("hide-editor", "true");
    hostElement.style.position = "fixed";
    hostElement.style.width = "1px";
    hostElement.style.height = "1px";
    hostElement.style.overflow = "hidden";
    hostElement.style.left = "-9999px";
    hostElement.style.top = "0";
    if (hostElement.parentElement !== document.body) {
      document.body.appendChild(hostElement);
    }
  };

  const enableLineWrapping = (editor: Record<string, unknown>): void => {
    try {
      const maybeSetLineWrappingEnabled = (editor as { setLineWrappingEnabled?: unknown })
        .setLineWrappingEnabled;
      if (typeof maybeSetLineWrappingEnabled === "function") {
        maybeSetLineWrappingEnabled.call(editor, true);
        return;
      }

      const maybeUpdateSettings = (editor as { updateSettings?: unknown }).updateSettings;
      if (typeof maybeUpdateSettings === "function") {
        maybeUpdateSettings.call(editor, { isLineWrappingEnabled: true });
      }
    } catch {
      // ignore settings errors to avoid breaking playback
    }
  };

  const ensureEditorReady = async (initialCode: string): Promise<Record<string, unknown>> => {
    if (editorHandle) {
      enableLineWrapping(editorHandle);
      return editorHandle;
    }

    await import("@strudel/repl");

    if (!hostElement) {
      hostElement = document.createElement("strudel-editor");
      hostElement.setAttribute("code", initialCode);
      applyHostPlacement();
    }
    applyHostPlacement();

    const start = Date.now();
    while (Date.now() - start < 10000) {
      const maybeEditor = (hostElement as unknown as { editor?: Record<string, unknown> }).editor;
      if (maybeEditor) {
        editorHandle = maybeEditor;
        enableLineWrapping(editorHandle);
        return editorHandle;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error("Strudel editor did not initialize.");
  };

  const stopInternal = async (editor: Record<string, unknown>): Promise<void> => {
    const maybeEvaluate = editor.evaluate;
    if (typeof maybeEvaluate === "function") {
      try {
        await maybeEvaluate.call(editor, "hush");
      } catch {
        // ignore hush errors, continue with hard stop
      }
    }

    const maybeStop = editor.stop;
    if (typeof maybeStop === "function") {
      await maybeStop.call(editor);
    }
  };

  return {
    setDockContainer(container: HTMLElement | null): void {
      dockContainer = container;
      applyHostPlacement();
      const canInitAudio =
        typeof window !== "undefined" &&
        (typeof window.AudioContext !== "undefined" ||
          typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !==
            "undefined");
      if (dockContainer && !editorHandle && canInitAudio) {
        void ensureEditorReady("setcps(1); silence").catch(() => undefined);
      }
    },
    async play(code: string): Promise<void> {
      const myVersion = ++playVersion;
      return enqueue(async () => {
        const editor = await ensureEditorReady(code);
        await stopInternal(editor);

        const runCode = async (nextCode: string): Promise<void> => {
          const maybeSetCode = editor.setCode;
          if (typeof maybeSetCode === "function") {
            await maybeSetCode.call(editor, nextCode);
          }

          const maybeEvaluate = editor.evaluate;
          if (typeof maybeEvaluate === "function") {
            await maybeEvaluate.call(editor, nextCode);
          }

          if (myVersion !== playVersion) {
            return;
          }

          const maybeStart = editor.start;
          if (typeof maybeStart === "function") {
            await maybeStart.call(editor);
            playing = true;
          }
        };

        try {
          await runCode(code);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const isSwingByIssue = message.includes(".swingBy() expects 2 inputs but got 1");
          if (isSwingByIssue && code.includes(".swingBy(")) {
            const migrated = code.replace(/\.swingBy\(([^)]+)\)/g, ".gain($1)");
            await runCode(migrated);
            return;
          }
          throw error;
        }
      });
    },
    async pushCode(code: string): Promise<void> {
      return enqueue(async () => {
        const editor = await ensureEditorReady(code);
        const maybeSetCode = editor.setCode;
        if (typeof maybeSetCode === "function") {
          await maybeSetCode.call(editor, code);
        }
      });
    },
    async stop(): Promise<void> {
      playVersion += 1;
      return enqueue(async () => {
        if (!editorHandle) {
          playing = false;
          return;
        }
        await stopInternal(editorHandle);
        playing = false;
      });
    },
    async setPlaybackCps(cps: number): Promise<void> {
      return enqueue(async () => {
        const editor = await ensureEditorReady("setcps(1); silence");
        const maybeSetCps = (editor as { setCps?: unknown }).setCps;
        const maybeSetcps = (editor as { setcps?: unknown }).setcps;
        const setter = typeof maybeSetCps === "function" ? maybeSetCps : maybeSetcps;
        if (typeof setter !== "function") {
          throw new Error("Live tempo update unavailable in Strudel runtime.");
        }
        await setter.call(editor, cps);
        currentCps = cps;
      });
    },
    isPlaying(): boolean {
      return playing;
    },
    getCurrentCps(): number | null {
      return currentCps;
    }
  };
}
