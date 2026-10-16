import { AppError } from '../errors/AppError.ts';
import type { BusLayoutInput } from '../schemas/busLayoutSchema.ts';
import type { db as database } from '../prisma/db.ts';
import { seatLayout } from '../utils/seatLayout.ts';
function layouts(client: Pick<typeof database, 'orm'>) {
  return client.orm.public.BusLayout.include('cells', (cells) =>
    cells.include('seat', (seat) => seat.select('id', 'number')),
  );
}
function canonical(input: BusLayoutInput) {
  return JSON.stringify({
    rowCount: input.rowCount,
    columnCount: input.columnCount,
    cells: input.cells
      .map((cell) => ({
        row: cell.row,
        column: cell.column,
        kind: cell.kind,
        seatId: cell.seatId,
      }))
      .sort((a, b) => a.row - b.row || a.column - b.column),
  });
}
export const busLayoutService = {
  async findByBusId(busId: string) {
    const { db } = await import('../prisma/db.ts');
    const bus = await db.orm.public.Bus.where({ id: busId })
      .select('id')
      .include('layout', (layout) =>
        layout.include('cells', (cells) =>
          cells.include('seat', (seat) => seat.select('id', 'number')),
        ),
      )
      .first();
    if (!bus) throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
    return seatLayout(bus.layout);
  },
  async replace(busId: string, input: BusLayoutInput) {
    const { db } = await import('../prisma/db.ts');
    return await db.transaction(async (tx) => {
      // Booking and every layout/capacity edit lock this same bus before touching its map.
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Bus" WHERE "id" = ${busId} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const bus = await tx.orm.public.Bus.where({ id: busId }).first();
      if (!bus) throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
      const current = await layouts(tx).where({ busId }).first();
      if (current && canonical(current) === canonical(input))
        return seatLayout(current);
      if (
        await tx.orm.public.Booking.where((booking) =>
          booking.trip.some({ busId }),
        ).first()
      )
        throw new AppError(
          409,
          'LAYOUT_HAS_BOOKINGS',
          'A bus with reservations cannot change its seat layout',
        );
      const seats = await tx.orm.public.BusSeat.where({ busId }).all();
      const requested = input.cells
        .filter((cell) => cell.kind === 'SEAT')
        .map((cell) => cell.seatId);
      if (
        seats.length !== bus.seatCount ||
        requested.length !== seats.length ||
        new Set(requested).size !== seats.length ||
        seats.some((seat) => !requested.includes(seat.id))
      )
        throw new AppError(
          400,
          'INVALID_LAYOUT_SEATS',
          'The layout must place every existing bus seat exactly once',
        );
      // A different arrangement gets a new identity; physical BusSeat ids never change.
      if (current)
        await tx.orm.public.BusLayout.where({ id: current.id }).delete();
      const layout = await tx.orm.public.BusLayout.create({
        busId,
        rowCount: input.rowCount,
        columnCount: input.columnCount,
      });
      await tx.orm.public.BusLayoutCell.createAll(
        input.cells.map((cell) => ({ layoutId: layout.id, ...cell })),
      );
      const result = await layouts(tx).where({ id: layout.id }).first();
      if (!result) throw new Error('Saved layout could not be read');
      return seatLayout(result);
    });
  },
  async remove(busId: string): Promise<void> {
    const { db } = await import('../prisma/db.ts');
    await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Bus" WHERE "id" = ${busId} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      if (!(await tx.orm.public.Bus.where({ id: busId }).first()))
        throw new AppError(404, 'BUS_NOT_FOUND', 'Bus not found');
      if (!(await tx.orm.public.BusLayout.where({ busId }).first())) return;
      if (
        await tx.orm.public.Booking.where((booking) =>
          booking.trip.some({ busId }),
        ).first()
      )
        throw new AppError(
          409,
          'LAYOUT_HAS_BOOKINGS',
          'A bus with reservations cannot remove its seat layout',
        );
      await tx.orm.public.BusLayout.where({ busId }).deleteAll();
    });
  },
};
export type BusLayoutService = typeof busLayoutService;
