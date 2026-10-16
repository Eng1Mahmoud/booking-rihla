import { createHash } from 'node:crypto';
import { Temporal } from 'temporal-polyfill';
import { cairoDeparture } from '../utils/cairoTime.ts';

// Stable, reserved fixture ids make repeated seed runs insert-only and reproducible.
function stableId(key: string) {
  const hex = createHash('sha256')
    .update('bus-booking-demo-v1:' + key)
    .digest('hex');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-4' +
    hex.slice(13, 16) +
    '-a' +
    hex.slice(17, 20) +
    '-' +
    hex.slice(20, 32)
  );
}
export function buildDemoData(firstDate: string, namespace = 'demo') {
  const demoId = (key: string) => stableId(namespace + ':' + key);
  const platePrefix = createHash('sha256')
    .update(namespace)
    .digest('hex')
    .slice(0, 8);
  const cities = [
    { id: demoId('cairo'), nameAr: 'القاهرة', nameEn: 'Cairo' },
    { id: demoId('alexandria'), nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
    { id: demoId('hurghada'), nameAr: 'الغردقة', nameEn: 'Hurghada' },
  ];
  const stations = cities.map((city, index) => ({
    id: demoId('station:' + city.id),
    cityId: city.id,
    nameAr: ['رمسيس', 'محرم بك', 'الغردقة الرئيسية'][index]!,
    nameEn: ['Ramses', 'Moharam Bek', 'Hurghada Central'][index]!,
  }));
  const [cairo, alex, hurghada] = stations;
  if (!cairo || !alex || !hurghada) throw new Error('Demo stations missing');
  const routes = [
    {
      id: demoId('cairo-alex'),
      originStationId: cairo.id,
      destinationStationId: alex.id,
      estimatedDurationMinutes: 180,
      isActive: true,
    },
    {
      id: demoId('alex-cairo'),
      originStationId: alex.id,
      destinationStationId: cairo.id,
      estimatedDurationMinutes: 180,
      isActive: true,
    },
    {
      id: demoId('cairo-hurghada'),
      originStationId: cairo.id,
      destinationStationId: hurghada.id,
      estimatedDurationMinutes: 360,
      isActive: true,
    },
  ];
  const buses = routes.map((route, index) => ({
    id: demoId('bus:' + route.id),
    plateNumber: 'DEMO-' + platePrefix + '-' + (index + 1),
    seatCount: 20,
    isActive: true,
  }));
  const seats = buses.flatMap((bus) =>
    Array.from({ length: bus.seatCount }, (_, i) => ({
      id: demoId('seat:' + bus.id + ':' + (i + 1)),
      busId: bus.id,
      number: i + 1,
    })),
  );
  const dates = Array.from({ length: 3 }, (_, i) =>
    Temporal.PlainDate.from(firstDate).add({ days: i }).toString(),
  );
  const trips = dates.flatMap((date) =>
    routes.map((route, index) => {
      const bus = buses[index];
      if (!bus) throw new Error('Demo bus missing');
      const departureAt = cairoDeparture(date, '09:00');
      return {
        id: demoId('trip:' + route.id + ':' + date),
        routeId: route.id,
        busId: bus.id,
        departureAt,
        arrivalAt: Temporal.Instant.from(departureAt)
          .add({ minutes: route.estimatedDurationMinutes })
          .toString(),
        pricePiastres: index === 2 ? 50000 : 25000,
        status: 'SCHEDULED' as const,
      };
    }),
  );
  return { cities, stations, routes, buses, seats, trips, dates };
}
