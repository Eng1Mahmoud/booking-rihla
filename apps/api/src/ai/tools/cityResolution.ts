/**
 * Resolve city/station names from Arabic, Egyptian Arabic, and English
 * using the live catalog. Never invent IDs.
 */

import type { CityService } from '../../services/cityService.ts';
import type { StationService } from '../../services/stationService.ts';
import { toPublicCity } from './publicDtos.ts';

const CITY_ALIASES: Record<string, string[]> = {
  cairo: ['القاهرة', 'قاهرة', 'cairo', 'cahiro', 'al qahira', 'القاهره'],
  alexandria: ['الإسكندرية', 'اسكندرية', 'اسكندريه', 'alexandria', 'alex'],
  giza: ['الجيزة', 'جيزة', 'giza', 'الجيزه'],
  mansoura: ['المنصورة', 'منصورة', 'mansoura', 'mansura'],
  tanta: ['طنطا', 'tanta'],
  aswan: ['أسوان', 'اسوان', 'aswan'],
  luxor: ['الأقصر', 'اقصر', 'luxor'],
  hurghada: ['الغردقة', 'غردقة', 'hurghada'],
  sharm: ['شرم الشيخ', 'شرم', 'sharm', 'sharm el sheikh'],
  portsaid: ['بورسعيد', 'بور سعيد', 'port said', 'portsaid'],
  suez: ['السويس', 'سويس', 'suez'],
  ismailia: ['الإسماعيلية', 'اسماعيلية', 'ismailia'],
  zagazig: ['الزقازيق', 'زقازيق', 'zagazig'],
  damietta: ['دمياط', 'damietta'],
  minya: ['المنيا', 'منيا', 'minya'],
  sohag: ['سوهاج', 'sohag'],
  qena: ['قنا', 'qena'],
  beni_suef: ['بني سويف', 'بنى سويف', 'beni suef'],
  fayoum: ['الفيوم', 'فيوم', 'fayoum', 'faiyum'],
  october: [
    'أكتوبر',
    '٦ أكتوبر',
    '6 أكتوبر',
    '6 october',
    'october',
    '6th of october',
  ],
  new_cairo: ['القاهرة الجديدة', 'التجمع', 'new cairo'],
};

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export async function resolveCityId(
  cities: CityService,
  opts: { cityId?: string; cityName?: string },
): Promise<{ id: string; nameAr: string; nameEn: string } | null> {
  if (opts.cityId) {
    const found = await cities.findById(opts.cityId);
    if (found) return toPublicCity(found);
    return null;
  }
  if (!opts.cityName) return null;
  const q = normalize(opts.cityName);
  if (!q) return null;
  const list = await cities.list({ limit: 200, offset: 0 });
  const exact = list.find(
    (city) => normalize(city.nameAr) === q || normalize(city.nameEn) === q,
  );
  if (exact) return toPublicCity(exact);

  const aliases = Object.values(CITY_ALIASES).find((names) =>
    names.some((name) => normalize(name) === q),
  );
  if (aliases) {
    const matches = list.filter((city) =>
      aliases.some((name) =>
        [city.nameAr, city.nameEn].some(
          (value) => normalize(value) === normalize(name),
        ),
      ),
    );
    return matches.length === 1 ? toPublicCity(matches[0]) : null;
  }

  // A partial name must identify one city; never choose an arbitrary first match.
  const matches = list.filter(
    (city) =>
      normalize(city.nameAr).includes(q) || normalize(city.nameEn).includes(q),
  );
  if (matches.length === 1) return toPublicCity(matches[0]);

  return null;
}

export async function resolveStationsForCity(
  stations: StationService,
  cityId: string,
  query?: string,
) {
  const list = await stations.list({ cityId, limit: 100, offset: 0 });
  if (!query) return list;
  const q = normalize(query);
  return list.filter(
    (s) =>
      normalize(s.nameAr).includes(q) ||
      normalize(s.nameEn).includes(q) ||
      q.includes(normalize(s.nameAr)),
  );
}
