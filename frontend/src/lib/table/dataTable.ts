export type SortDirection = "asc" | "desc";

export type SortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
};

export type SortValue = string | number | boolean | Date | null | undefined;

export type TablePreferences<Key extends string> = {
  visibleColumns: Key[];
  dense: boolean;
};

export type CsvColumn<Row> = {
  header: string;
  value: (row: Row) => unknown;
};

const PREFERENCES_VERSION = 1;

export function toggleSort<Key extends string>(current: SortState<Key>, key: Key): SortState<Key> {
  return current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };
}

function compareValues(left: SortValue, right: SortValue, locale: string) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;
  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue - rightValue;
  }
  if (typeof leftValue === "boolean" && typeof rightValue === "boolean") {
    return Number(leftValue) - Number(rightValue);
  }
  return String(leftValue).localeCompare(String(rightValue), locale, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortRows<Row, Key extends string>(
  rows: Row[],
  sort: SortState<Key>,
  accessors: Record<Key, (row: Row) => SortValue>,
  locale = "fr",
) {
  const direction = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const compared = compareValues(
        accessors[sort.key](left.row),
        accessors[sort.key](right.row),
        locale,
      );
      return compared === 0 ? left.index - right.index : compared * direction;
    })
    .map(({ row }) => row);
}

export function toggleVisibleColumn<Key extends string>(visibleColumns: Key[], column: Key): Key[] {
  if (visibleColumns.includes(column)) {
    return visibleColumns.length === 1
      ? visibleColumns
      : visibleColumns.filter((item) => item !== column);
  }
  return [...visibleColumns, column];
}

export function loadTablePreferences<Key extends string>(
  storage: Pick<Storage, "getItem">,
  storageKey: string,
  availableColumns: Key[],
  defaultDense = true,
): TablePreferences<Key> {
  const defaults = { visibleColumns: [...availableColumns], dense: defaultDense };
  try {
    const parsed = JSON.parse(storage.getItem(storageKey) ?? "null") as {
      version?: number;
      visibleColumns?: unknown;
      dense?: unknown;
    } | null;
    if (parsed?.version !== PREFERENCES_VERSION || !Array.isArray(parsed.visibleColumns)) {
      return defaults;
    }
    const visibleColumns = availableColumns.filter((column) =>
      parsed.visibleColumns?.includes(column),
    );
    return {
      visibleColumns: visibleColumns.length ? visibleColumns : defaults.visibleColumns,
      dense: typeof parsed.dense === "boolean" ? parsed.dense : defaultDense,
    };
  } catch {
    return defaults;
  }
}

export function saveTablePreferences<Key extends string>(
  storage: Pick<Storage, "setItem">,
  storageKey: string,
  preferences: TablePreferences<Key>,
) {
  storage.setItem(storageKey, JSON.stringify({ version: PREFERENCES_VERSION, ...preferences }));
}

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[";,\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildCsv<Row>(rows: Row[], columns: CsvColumn<Row>[]) {
  const lines = [
    columns.map((column) => escapeCsv(column.header)).join(";"),
    ...rows.map((row) => columns.map((column) => escapeCsv(column.value(row))).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
