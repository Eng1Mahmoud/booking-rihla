import { z } from 'zod';
export const layoutCellKindSchema = z.enum([
  'SEAT',
  'AISLE',
  'DRIVER',
  'DOOR',
  'EMPTY',
]);
const cellSchema = z
  .strictObject({
    row: z.number().int().min(0).max(50),
    column: z.number().int().min(0).max(7),
    kind: layoutCellKindSchema,
    seatId: z.uuid().nullable().default(null),
  })
  .refine(
    (cell) => (cell.kind === 'SEAT') === (cell.seatId !== null),
    'Only SEAT cells must identify an existing seat',
  );
export const busLayoutSchema = z
  .strictObject({
    rowCount: z.number().int().min(2).max(51),
    columnCount: z.number().int().min(3).max(8),
    cells: z.array(cellSchema).min(6).max(408),
  })
  .superRefine((layout, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (
      layout.cells.length !== layout.rowCount * layout.columnCount ||
      new Set(layout.cells.map((cell) => cell.row + ':' + cell.column)).size !==
        layout.cells.length ||
      layout.cells.some(
        (cell) =>
          cell.row >= layout.rowCount || cell.column >= layout.columnCount,
      )
    )
      fail(
        'Provide exactly one cell for every grid position within its bounds',
      );
    const seats = layout.cells.filter((cell) => cell.kind === 'SEAT');
    if (
      seats.length < 1 ||
      seats.length > 100 ||
      seats.some((cell) => cell.row === 0) ||
      new Set(seats.map((cell) => cell.seatId)).size !== seats.length
    )
      fail('Place 1-100 distinct existing seats behind the front cabin');
    const drivers = layout.cells.filter((cell) => cell.kind === 'DRIVER');
    if (
      drivers.length !== 1 ||
      drivers.some(
        (cell) =>
          cell.row !== 0 ||
          (cell.column !== 0 && cell.column !== layout.columnCount - 1),
      )
    )
      fail('Place one driver in a front corner');
    const doors = layout.cells.filter((cell) => cell.kind === 'DOOR');
    if (
      doors.length < 1 ||
      doors.length > 3 ||
      doors.some(
        (cell) => cell.column !== 0 && cell.column !== layout.columnCount - 1,
      )
    )
      fail('Place 1-3 doors on outer columns');
    if (!layout.cells.some((cell) => cell.kind === 'AISLE'))
      fail('Identify the passenger aisle');
  });
export const busLayoutIdSchema = z.uuid();
export const busLayoutQuerySchema = z.strictObject({});
export type BusLayoutInput = z.infer<typeof busLayoutSchema>;
export type LayoutCellKind = z.infer<typeof layoutCellKindSchema>;
