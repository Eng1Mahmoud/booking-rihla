'use client';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export function RowActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('Common');
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        variant="outline"
        className="min-h-11"
        aria-label={t('editNamed', { name })}
        onClick={onEdit}
      >
        <Pencil aria-hidden="true" />
        {t('edit')}
      </Button>
      <Button
        variant="ghost"
        className="min-h-11 text-destructive hover:bg-destructive/5 hover:text-destructive"
        aria-label={t('deleteNamed', { name })}
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" />
        {t('delete')}
      </Button>
    </div>
  );
}
