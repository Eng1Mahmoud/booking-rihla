import { TripFormPage } from '@/features/trips/components/TripForm';
export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripFormPage key={id} id={id} />;
}
