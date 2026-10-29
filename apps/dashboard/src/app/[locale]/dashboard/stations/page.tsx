import { StationsManager } from '@/features/stations';

export default async function StationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cityId?: string | string[] }>;
}) {
  const params = await searchParams;
  const cityId =
    (Array.isArray(params.cityId) ? params.cityId[0] : params.cityId) ?? '';
  return <StationsManager cityId={cityId} />;
}
