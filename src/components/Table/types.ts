import type { ReactNode } from "react";

export interface Column<T> {
  label: string;
  key: keyof T | string;
  filterable?: boolean;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface SortState {
  key: string;
  direction: "ASC" | "DESC";
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  sortState?: SortState | null;
  onPageChange?: (page: number) => void;
  onFilter?: (key: string, value: string) => void;
  onSort?: (key: string) => void;
}
