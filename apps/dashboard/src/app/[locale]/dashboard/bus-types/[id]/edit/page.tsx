import { BusTypeFormPage } from '@/features/bus-types/components/BusTypeForm';
export default async function EditBusTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BusTypeFormPage key={id} id={id} />;
}
