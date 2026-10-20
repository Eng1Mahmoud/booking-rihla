import { readTripCatalog } from '@/features/trips/lib/trips.server';
import { HomeContent } from '@/features/trips/components/HomeContent';
import { cairoDate } from '@/features/trips/schemas/searchSchema';
export default async function HomePage() {
  const catalog = await readTripCatalog();
  return (
    <HomeContent
      initial={catalog.success ? catalog.data : undefined}
      today={cairoDate()}
    />
  );
}
