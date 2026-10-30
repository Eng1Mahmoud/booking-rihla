import { AdministratorRoleFormPage } from '@/features/administrators/components/AdministratorRoleForm';
export default async function RolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdministratorRoleFormPage
      key={id}
      id={id}
      listPath="/dashboard/administrators"
    />
  );
}
