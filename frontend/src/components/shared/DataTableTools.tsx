import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n/store";
import type { SortState } from "@/lib/table/dataTable";
import { cn } from "@/lib/utils";

export type TableColumnOption<Key extends string> = {
  id: Key;
  label: string;
};

export function DataTableToolbar<Key extends string>({
  columns,
  visibleColumns,
  onToggleColumn,
  dense,
  onDenseChange,
  rowCount,
  onExport,
}: {
  columns: TableColumnOption<Key>[];
  visibleColumns: Key[];
  onToggleColumn: (column: Key) => void;
  dense: boolean;
  onDenseChange: (dense: boolean) => void;
  rowCount: number;
  onExport: () => void;
}) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
      <span className="text-xs text-muted-foreground">
        {t("table.rows").replace("{count}", String(rowCount))}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={dense}
          onClick={() => onDenseChange(!dense)}
        >
          <Rows3 aria-hidden />
          {t(dense ? "table.density.compact" : "table.density.comfortable")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <Columns3 aria-hidden />
              {t("table.columns")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{t("table.visibleColumns")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={visibleColumns.includes(column.id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => onToggleColumn(column.id)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" size="sm" variant="outline" onClick={onExport} disabled={!rowCount}>
          <Download aria-hidden />
          {t("table.export")}
        </Button>
      </div>
    </div>
  );
}

export function SortableTableHead<Key extends string>({
  column,
  label,
  sort,
  onSort,
  align = "start",
  className,
}: {
  column: Key;
  label: string;
  sort: SortState<Key>;
  onSort: (column: Key) => void;
  align?: "start" | "end";
  className?: string;
}) {
  const active = sort.key === column;
  const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
      className={cn("px-3 py-2", align === "end" ? "text-end" : "text-start", className)}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-foreground",
          align === "end" && "flex-row-reverse",
        )}
      >
        {label}
        <Icon className="size-3" aria-hidden />
      </button>
    </th>
  );
}
