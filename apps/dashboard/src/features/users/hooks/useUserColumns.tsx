'use client';
import { useLocale, useTranslations } from 'next-intl';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import { ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { formatReportTime } from '@/features/dashboard/lib/format';
import type { ManagedUser } from '../schemas/userSchema';

export function useUserColumns({
  onStatus,
  onRole,
  canChangeRole,
}: {
  onStatus: (user: ManagedUser) => void;
  onRole: (user: ManagedUser) => void;
  canChangeRole: boolean;
}): DataTableColumn<ManagedUser>[] {
  const locale = useLocale();
  const t = useTranslations('Users');
  const states = useTranslations('States');
  return [
    { id: 'name', header: t('name'), cell: ({ row }) => row.original.name },
    {
      id: 'email',
      header: t('email'),
      cell: ({ row }) => <bdi>{row.original.email}</bdi>,
    },
    {
      id: 'phone',
      header: t('phone'),
      cell: ({ row }) => <bdi>{row.original.phone}</bdi>,
    },
    {
      id: 'role',
      header: t('role'),
      cell: ({ row }) => states(row.original.role),
    },
    {
      id: 'verified',
      header: t('verified'),
      cell: ({ row }) => t(row.original.emailVerifiedAt ? 'yes' : 'no'),
    },
    {
      id: 'status',
      header: t('status'),
      cell: ({ row }) => t(row.original.isActive ? 'active' : 'suspended'),
    },
    {
      id: 'created',
      header: t('created'),
      cell: ({ row }) => formatReportTime(row.original.createdAt, locale),
    },
    {
      id: 'actions',
      header: t('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActionMenu
          name={row.original.name}
          actions={[
            {
              label: t(row.original.isActive ? 'suspend' : 'activate'),
              icon: row.original.isActive ? UserRoundX : UserRoundCheck,
              destructive: row.original.isActive,
              onSelect: () => onStatus(row.original),
            },
            ...(canChangeRole
              ? [
                  {
                    label: t('changeRole'),
                    icon: ShieldCheck,
                    onSelect: () => onRole(row.original),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];
}
