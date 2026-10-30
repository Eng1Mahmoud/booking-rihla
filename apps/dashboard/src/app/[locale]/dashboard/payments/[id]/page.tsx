import { PaymentDetailsPage } from '@/features/payments/components/PaymentDetails';
export default async function DetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentDetailsPage key={id} id={id} />;
}
