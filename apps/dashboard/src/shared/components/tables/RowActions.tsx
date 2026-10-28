'use client';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import { RowActionMenu, type RowAction } from './RowActionMenu';

export function RowActions({
  name,
  onEdit,
  onDelete,
  additionalActions = [],
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  additionalActions?: RowAction[];
}) {
  const t = useTranslations('Common');
  return (
    <RowActionMenu
      name={name}
      actions={[
        { label: t('edit'), icon: Pencil, onSelect: onEdit },
        {
          label: t('delete'),
          icon: Trash2,
          onSelect: onDelete,
          destructive: true,
        },
        ...additionalActions,
      ]}
    />
  );
}
