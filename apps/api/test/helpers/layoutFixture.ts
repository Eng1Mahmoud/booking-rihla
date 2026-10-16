import type {
  BusLayoutInput,
  LayoutCellKind,
} from '../../src/schemas/busLayoutSchema.ts';
// Test fixture only: the application never assumes a default physical arrangement.
export function layoutForSeats(
  seats: { id: string; number: number }[],
): BusLayoutInput {
  const rowCount = Math.ceil(seats.length / 4) + 1,
    columnCount = 5;
  return {
    rowCount,
    columnCount,
    cells: Array.from({ length: rowCount * columnCount }, (_, index) => {
      const row = Math.floor(index / columnCount),
        column = index % columnCount;
      let kind: LayoutCellKind = 'EMPTY';
      let seatId: string | null = null;
      if (row === 0) {
        if (column === 0) kind = 'DRIVER';
        else if (column === 4) kind = 'DOOR';
        else if (column === 2) kind = 'AISLE';
      } else if (column === 2) kind = 'AISLE';
      else {
        const seat = seats[(row - 1) * 4 + [0, 1, 3, 4].indexOf(column)];
        if (seat) {
          kind = 'SEAT';
          seatId = seat.id;
        }
      }
      return { row, column, kind, seatId };
    }),
  };
}
