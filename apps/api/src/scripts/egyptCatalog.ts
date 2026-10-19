import { createHash } from 'node:crypto';
import { Temporal } from 'temporal-polyfill';
import { cairoDeparture, cairoToday } from '../utils/cairoTime.ts';

// Names are based on BlueBus's public station directory (2026-10-19).
// Schedules, fares, fleet and seat availability are our development examples.
export function catalogId(key: string) {
  const hex = createHash('sha256')
    .update('egypt-catalog-v1:' + key)
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
export function buildEgyptCatalog(firstDate = cairoToday()) {
  const cityRows = [
    ['cairo', 'القاهرة', 'Cairo'],
    ['giza', 'الجيزة', 'Giza'],
    ['alexandria', 'الإسكندرية', 'Alexandria'],
    ['hurghada', 'الغردقة', 'Hurghada'],
    ['sharm', 'شرم الشيخ', 'Sharm El Sheikh'],
    ['dahab', 'دهب', 'Dahab'],
    ['luxor', 'الأقصر', 'Luxor'],
  ] as const;
  const cities = cityRows.map(([code, nameAr, nameEn]) => ({
    id: catalogId('city:' + code),
    nameAr,
    nameEn,
  }));
  const stationRows = [
    ['ramses', 'cairo', 'رمسيس الجديدة', 'New Ramses'],
    ['moshier', 'cairo', 'محور المشير', 'Mehawar ElMoshier'],
    ['sekka', 'cairo', 'نادي السكة', 'Sekka Club'],
    ['maadi', 'cairo', 'المعادي - وطنية الدائري', 'Maadi Ring Rd Watanya'],
    ['hussary', 'giza', '6 أكتوبر - الحصري', '6 October - El Hussary'],
    ['zayed', 'giza', 'زايد - تشيل أوت الخمائل', 'Zayed Chillout Khamayel'],
    ['giza', 'giza', 'الجيزة', 'Giza'],
    ['moharam', 'alexandria', 'محرم بك', 'Moharam Bek'],
    ['sidi', 'alexandria', 'سيدي جابر', 'Sidi Gaber'],
    ['miami', 'alexandria', 'ميامي', 'Miami'],
    ['nasr', 'hurghada', 'شارع النصر', 'El Nasr Street'],
    ['ahyaa', 'hurghada', 'الأحياء', 'Al Ahyaa'],
    ['watanyaHrg', 'hurghada', 'وطنية - الغردقة', 'Watanya-HRG'],
    ['ruwaysat', 'sharm', 'الرويسات', 'El Ruwaysat'],
    ['watanyaSsh', 'sharm', 'وطنية - شرم الشيخ', 'Watanya-SSH'],
    ['dahab', 'dahab', 'دهب', 'Dahab'],
    ['luxorRail', 'luxor', 'محطة السكة الحديد', 'Railway station'],
  ] as const;
  const stations = stationRows.map(([code, city, nameAr, nameEn]) => ({
    id: catalogId('station:' + code),
    cityId: catalogId('city:' + city),
    nameAr,
    nameEn,
  }));
  const routeRows = [
    ['ramses', 'moharam', 180, 28000],
    ['ramses', 'sidi', 210, 30000],
    ['hussary', 'sidi', 210, 29000],
    ['moshier', 'nasr', 360, 48000],
    ['hussary', 'nasr', 390, 50000],
    ['ramses', 'ruwaysat', 420, 55000],
    ['moshier', 'dahab', 540, 65000],
    ['ramses', 'luxorRail', 600, 60000],
    ['moharam', 'nasr', 540, 62000],
  ] as const;
  const directions = routeRows.flatMap(([from, to, duration, price]) => [
    { from, to, duration, price },
    { from: to, to: from, duration, price },
  ]);
  const routes = directions.map(({ from, to, duration }) => ({
    id: catalogId('route:' + from + ':' + to),
    originStationId: catalogId('station:' + from),
    destinationStationId: catalogId('station:' + to),
    estimatedDurationMinutes: duration,
    isActive: true,
  }));
  const busTypes = [
    {
      id: catalogId('type:comfort'),
      code: 'COMFORT',
      nameAr: 'كومفورت',
      nameEn: 'Comfort',
    },
  ];
  const amenities = [
    {
      id: catalogId('amenity:ac'),
      code: 'AIR_CONDITIONING',
      nameAr: 'تكييف',
      nameEn: 'Air conditioning',
    },
    {
      id: catalogId('amenity:usb'),
      code: 'USB',
      nameAr: 'شحن USB',
      nameEn: 'USB charging',
    },
    {
      id: catalogId('amenity:recline'),
      code: 'RECLINING_SEATS',
      nameAr: 'مقاعد قابلة للإمالة',
      nameEn: 'Reclining seats',
    },
  ];
  const buses = routes.flatMap((route) =>
    [0, 1].map((slot) => ({
      id: catalogId('bus:' + route.id + ':' + slot),
      plateNumber: 'DEV-' + route.id.slice(0, 8) + '-' + slot,
      seatCount: 44,
      seatLayout: 'STANDARD_2_2' as const,
      isActive: true,
      busTypeId: busTypes[0]!.id,
    })),
  );
  const seats = buses.flatMap((bus) =>
    Array.from({ length: bus.seatCount }, (_, i) => ({
      id: catalogId('seat:' + bus.id + ':' + (i + 1)),
      busId: bus.id,
      number: i + 1,
    })),
  );
  const busAmenities = buses.flatMap((bus) =>
    amenities.map((amenity) => ({
      id: catalogId('busAmenity:' + bus.id + ':' + amenity.id),
      busId: bus.id,
      amenityId: amenity.id,
    })),
  );
  const dates = Array.from({ length: 14 }, (_, i) =>
    Temporal.PlainDate.from(firstDate).add({ days: i }).toString(),
  );
  const trips = dates.flatMap((date) =>
    routes.flatMap((route, index) =>
      [0, 1].map((slot) => {
        const time = slot === 0 ? '09:00' : '21:00';
        const departureAt = cairoDeparture(date, time);
        return {
          id: catalogId('trip:' + route.id + ':' + date + ':' + slot),
          routeId: route.id,
          busId: catalogId('bus:' + route.id + ':' + slot),
          departureAt,
          arrivalAt: Temporal.Instant.from(departureAt)
            .add({ minutes: route.estimatedDurationMinutes })
            .toString(),
          pricePiastres: directions[index]!.price,
          status: 'SCHEDULED' as const,
        };
      }),
    ),
  );
  return {
    cities,
    stations,
    routes,
    busTypes,
    amenities,
    buses,
    seats,
    busAmenities,
    trips,
    dates,
  };
}
