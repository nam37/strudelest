import type { PieceSpec } from "../../types/music";

export const STORAGE_KEY = "strudelest:pieces:v1";

export function loadPieces(): PieceSpec[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as PieceSpec[];
  } catch {
    return [];
  }
}

export function savePieces(pieces: PieceSpec[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pieces));
}

export function upsertPiece(piece: PieceSpec): PieceSpec[] {
  const pieces = loadPieces();
  const next = [piece, ...pieces.filter((item) => item.id !== piece.id)];
  savePieces(next);
  return next;
}

export function deletePiece(pieceId: string): PieceSpec[] {
  const next = loadPieces().filter((piece) => piece.id !== pieceId);
  savePieces(next);
  return next;
}
