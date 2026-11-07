"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DataColumnMeta {
  /** Right-align numbers and use tabular figures. */
  numeric?: boolean;
  /** Plain-text value for CSV export (raw numbers, not formatted strings). */
  csv?: (row: unknown) => string | number | null;
  /** Hide from the stacked mobile card (e.g. secondary columns). */
  hideOnCard?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  /** Accessible table name. */
  caption: string;
  getRowId: (row: T) => string;
  initialSorting?: SortingState;
  pageSize?: number;
  /** CSV file name; omit to hide export. */
  csvName?: string;
  /** Shown when there are no rows. */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Optional custom mobile card. Default: label/value pairs from the same columns. */
  renderCard?: (row: T) => ReactNode;
  toolbar?: ReactNode;
}

/**
 * The one data table (TanStack Table): sortable headers, column visibility,
 * CSV export, pagination. Below `md` rows become stacked cards built from the
 * same column definitions (§11).
 */
export function DataTable<T>({
  data,
  columns,
  caption,
  getRowId,
  initialSorting = [],
  pageSize = 25,
  csvName,
  empty,
  onRowClick,
  renderCard,
  toolbar,
}: DataTableProps<T>) {
  const t = useTranslations("table");
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [visibility, setVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  function exportCsv() {
    const cols = table.getVisibleLeafColumns();
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.map((c) => esc(typeof c.columnDef.header === "string" ? c.columnDef.header : c.id));
    const rows = table.getSortedRowModel().rows.map((r) =>
      cols.map((c) => {
        const meta = c.columnDef.meta as DataColumnMeta | undefined;
        return esc(meta?.csv ? meta.csv(r.original) : r.getValue(c.id));
      }),
    );
    const blob = new Blob([[header, ...rows].map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${csvName}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const rows = table.getRowModel().rows;
  const pages = table.getPageCount();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden md:inline-flex">
                <Columns3 aria-hidden /> {t("columns")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t("columns")}</DropdownMenuLabel>
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {csvName && data.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download aria-hidden /> {t("exportCsv")}
            </Button>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        empty
      ) : (
        <>
          {/* Desktop/tablet table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-surface-1">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border">
                    {hg.headers.map((h) => {
                      const meta = h.column.columnDef.meta as DataColumnMeta | undefined;
                      const sorted = h.column.getIsSorted();
                      const label = flexRender(h.column.columnDef.header, h.getContext());
                      return (
                        <th
                          key={h.id}
                          scope="col"
                          aria-sort={
                            sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                          }
                          className={cn(
                            "h-10 px-3 font-display text-xs font-medium whitespace-nowrap text-text-2",
                            meta?.numeric ? "text-right" : "text-left",
                          )}
                        >
                          {h.column.getCanSort() ? (
                            <button
                              type="button"
                              onClick={h.column.getToggleSortingHandler()}
                              className={cn(
                                "inline-flex h-8 items-center gap-1 rounded-sm hover:text-text-1 focus-visible:outline-2 focus-visible:outline-focus-ring",
                                meta?.numeric && "flex-row-reverse",
                              )}
                            >
                              {label}
                              {sorted === "asc" ? (
                                <ArrowUp aria-hidden className="size-3.5" />
                              ) : sorted === "desc" ? (
                                <ArrowDown aria-hidden className="size-3.5" />
                              ) : (
                                <ArrowUpDown aria-hidden className="size-3.5 opacity-50" />
                              )}
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      "border-b border-border last:border-0",
                      onRowClick && "cursor-pointer hover:bg-surface-1",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as DataColumnMeta | undefined;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "h-12 px-3 whitespace-nowrap",
                            meta?.numeric && "text-right font-display tabular",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards from the same columns */}
          <ul className="grid grid-cols-1 gap-2 md:hidden" aria-label={caption}>
            {rows.map((row) => (
              <li key={row.id} className="rounded-lg border border-border bg-surface-1 p-4">
                {renderCard ? (
                  renderCard(row.original)
                ) : (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {row
                      .getVisibleCells()
                      .filter((c) => !(c.column.columnDef.meta as DataColumnMeta | undefined)?.hideOnCard)
                      .map((cell) => (
                        <div key={cell.id} className="grid min-w-0 gap-0.5">
                          <dt className="text-xs text-text-3">
                            {typeof cell.column.columnDef.header === "string"
                              ? cell.column.columnDef.header
                              : cell.column.id}
                          </dt>
                          <dd className="min-w-0 truncate font-display tabular">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <div className="flex items-center justify-between gap-2 text-sm text-text-2">
              <span>{t("rows", { count: data.length })}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("prev")}
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeft aria-hidden />
                </Button>
                <span className="tabular">
                  {t("page", { page: table.getState().pagination.pageIndex + 1, pages })}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("next")}
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRight aria-hidden />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
