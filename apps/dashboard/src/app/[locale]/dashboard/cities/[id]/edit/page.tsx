import { CityFormPage } from '@/features/cities/components/CityForm';
export default async function EditCityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CityFormPage key={id} id={id} />;
}
