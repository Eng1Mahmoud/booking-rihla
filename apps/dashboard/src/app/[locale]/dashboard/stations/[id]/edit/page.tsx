import { StationFormPage } from '@/features/stations/components/StationForm';
export default async function EditStationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StationFormPage key={id} id={id} />;
}
