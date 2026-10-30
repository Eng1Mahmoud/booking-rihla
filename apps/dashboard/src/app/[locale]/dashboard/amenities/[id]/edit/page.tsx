import { AmenityFormPage } from '@/features/amenities/components/AmenityForm';
export default async function EditAmenityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AmenityFormPage key={id} id={id} />;
}
