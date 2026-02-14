import { describe, expect, it } from "vitest";
import type { PieceSpec } from "../../types/music";
import { decodeSharePayload, encodeSharePayload } from "./index";

const piece: PieceSpec = {
  id: "piece-1",
  name: "Test Piece",
  templateId: "minimal-groove",
  bpm: 120,
  bars: 8,
  seed: "seed-x",
  params: {
    density: 0.5
  },
  code: 's("bd ~ sd ~")',
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1
};

describe("share codec", () => {
  it("round-trips payload", () => {
    const encoded = encodeSharePayload(piece);
    const decoded = decodeSharePayload(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.templateId).toBe(piece.templateId);
    expect(decoded?.seed).toBe(piece.seed);
    expect(decoded?.code).toBe(piece.code);
  });

  it("returns null for malformed payload", () => {
    expect(decodeSharePayload("not-base64")).toBeNull();
  });
});
