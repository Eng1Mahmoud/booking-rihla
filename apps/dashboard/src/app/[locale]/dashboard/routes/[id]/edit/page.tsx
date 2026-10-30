import { RouteFormPage } from '@/features/routes/components/RouteForm';
export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RouteFormPage key={id} id={id} />;
}
