/**
 * Resolve city/station names from Arabic, Egyptian Arabic, and English
 * using the live catalog. Never invent IDs.
 */

import type { CityService } from '../../services/cityService.ts';
import type { StationService } from '../../services/stationService.ts';

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
  october: ['أكتوبر', '٦ أكتوبر', '6 أكتوبر', '6 october', 'october', '6th of october'],
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
    if (found) return { id: found.id, nameAr: found.nameAr, nameEn: found.nameEn };
    return null;
  }
  if (!opts.cityName) return null;
  const list = await cities.list({ limit: 200, offset: 0 });
  const q = normalize(opts.cityName);

  for (const c of list) {
    if (
      normalize(c.nameAr) === q ||
      normalize(c.nameEn) === q ||
      normalize(c.nameAr).includes(q) ||
      normalize(c.nameEn).includes(q) ||
      q.includes(normalize(c.nameAr)) ||
      q.includes(normalize(c.nameEn))
    ) {
      return { id: c.id, nameAr: c.nameAr, nameEn: c.nameEn };
    }
  }

  for (const aliases of Object.values(CITY_ALIASES)) {
    if (aliases.some((a) => normalize(a) === q || q.includes(normalize(a)))) {
      for (const c of list) {
        if (
          aliases.some(
            (a) =>
              normalize(c.nameAr).includes(normalize(a)) ||
              normalize(c.nameEn).includes(normalize(a)) ||
              normalize(a).includes(normalize(c.nameAr)) ||
              normalize(a).includes(normalize(c.nameEn)),
          )
        ) {
          return { id: c.id, nameAr: c.nameAr, nameEn: c.nameEn };
        }
      }
    }
  }
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
