import { beforeEach, describe, expect, it } from "vitest";
import type { PieceSpec } from "../../types/music";
import { STORAGE_KEY, deletePiece, loadPieces, upsertPiece } from "./index";

const piece = (id: string): PieceSpec => ({
  id,
  name: `Piece ${id}`,
  templateId: "minimal-groove",
  bpm: 120,
  bars: 8,
  seed: `seed-${id}`,
  params: { density: 0.4 },
  code: 's("bd ~ sd ~")',
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1
});

describe("storage", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it("loads empty list by default", () => {
    expect(loadPieces()).toEqual([]);
  });

  it("upserts and replaces existing items", () => {
    upsertPiece(piece("one"));
    const updated = { ...piece("one"), name: "Updated name" };
    const result = upsertPiece(updated);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Updated name");
  });

  it("deletes a saved piece", () => {
    upsertPiece(piece("one"));
    upsertPiece(piece("two"));
    const result = deletePiece("one");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("two");
  });
});
