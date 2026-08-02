import { useEffect, useState } from "react";

import {
  loadTablePreferences,
  saveTablePreferences,
  toggleVisibleColumn,
} from "@/lib/table/dataTable";

export function useTablePreferences<Key extends string>(
  tableId: string,
  userKey: string,
  availableColumns: readonly Key[],
) {
  const [visibleColumns, setVisibleColumns] = useState<Key[]>([...availableColumns]);
  const [dense, setDense] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const storageKey = `sihia:data-table:${userKey}:${tableId}`;

  useEffect(() => {
    const preferences = loadTablePreferences(window.localStorage, storageKey, [
      ...availableColumns,
    ]);
    setVisibleColumns(preferences.visibleColumns);
    setDense(preferences.dense);
    setLoaded(true);
  }, [availableColumns, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    saveTablePreferences(window.localStorage, storageKey, { visibleColumns, dense });
  }, [dense, loaded, storageKey, visibleColumns]);

  return {
    visibleColumns,
    dense,
    setDense,
    toggleColumn: (column: Key) =>
      setVisibleColumns((current) => toggleVisibleColumn(current, column)),
    isVisible: (column: Key) => visibleColumns.includes(column),
  };
}
