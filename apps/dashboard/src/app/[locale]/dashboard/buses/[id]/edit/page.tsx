import { BusFormPage } from '@/features/buses/components/BusForm';
export default async function EditBusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BusFormPage key={id} id={id} />;
}
