import { z } from 'zod';
import { StationsManager } from '@/features/stations';

export default async function StationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cityId?: string | string[] }>;
}) {
  const params = await searchParams;
  const parsed = z.uuid().safeParse(params.cityId);
  return <StationsManager cityId={parsed.success ? parsed.data : ''} />;
}
