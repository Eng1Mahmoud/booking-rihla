import type { LayoutCellKind } from '../schemas/busLayoutSchema.ts';
export interface StoredSeatLayout {
  id: string;
  rowCount: number;
  columnCount: number;
  cells: {
    row: number;
    column: number;
    kind: LayoutCellKind;
    seat: { id: string; number: number } | null;
  }[];
}
export function seatLayout(layout: StoredSeatLayout | null) {
  if (!layout) return null;
  return {
    id: layout.id,
    rowCount: layout.rowCount,
    columnCount: layout.columnCount,
    front: 'TOP' as const,
    columnDirection: 'VEHICLE_LEFT_TO_RIGHT' as const,
    cells: layout.cells
      .map((cell) => ({
        row: cell.row,
        column: cell.column,
        kind: cell.kind,
        seat: cell.seat ? { id: cell.seat.id, number: cell.seat.number } : null,
      }))
      .sort((a, b) => a.row - b.row || a.column - b.column),
  };
}
