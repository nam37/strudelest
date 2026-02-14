import type { PieceSpec, SharePayload } from "../../types/music";

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSharePayload(piece: PieceSpec): string {
  const payload: SharePayload = {
    version: 1 as const,
    templateId: piece.templateId,
    bpm: piece.bpm,
    bars: piece.bars,
    seed: piece.seed,
    params: piece.params,
    code: piece.code
  };
  return toBase64(JSON.stringify(payload));
}

export function decodeSharePayload(payload: string): SharePayload | null {
  try {
    const decoded = JSON.parse(fromBase64(payload)) as Partial<SharePayload>;
    if (
      decoded.version !== 1 ||
      typeof decoded.templateId !== "string" ||
      typeof decoded.seed !== "string" ||
      typeof decoded.bpm !== "number" ||
      typeof decoded.bars !== "number" ||
      decoded.params === undefined ||
      typeof decoded.params !== "object" ||
      decoded.params === null
    ) {
      return null;
    }
    return decoded as SharePayload;
  } catch {
    return null;
  }
}
