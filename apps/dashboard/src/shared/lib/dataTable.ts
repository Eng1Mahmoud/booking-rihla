import {
  createPaginatedRowModel,
  metaHelper,
  rowPaginationFeature,
  tableFeatures,
  type ColumnDef,
  type ReactTable,
  type RowData,
} from '@tanstack/react-table';

type ColumnLayout = {
  headerClassName?: string;
};

export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: metaHelper<ColumnLayout>(),
});

export type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData
>;
export type DataTableInstance<TData extends RowData> = ReactTable<
  typeof dataTableFeatures,
  TData
>;
