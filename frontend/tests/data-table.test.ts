import { describe, expect, it } from "vitest";

import {
  buildCsv,
  loadTablePreferences,
  saveTablePreferences,
  sortRows,
  toggleSort,
  toggleVisibleColumn,
} from "../src/lib/table/dataTable";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("data table utilities", () => {
  it("trie les valeurs et conserve l’ordre des égalités", () => {
    const rows = [
      { id: "a", name: "Zoé", age: 30 },
      { id: "b", name: "Amélie", age: 20 },
      { id: "c", name: "Amélie", age: 40 },
    ];
    const sorted = sortRows(
      rows,
      { key: "name", direction: "asc" },
      {
        name: (row) => row.name,
      },
    );
    expect(sorted.map((row) => row.id)).toEqual(["b", "c", "a"]);
    expect(toggleSort({ key: "name", direction: "asc" }, "name")).toEqual({
      key: "name",
      direction: "desc",
    });
  });

  it("garde toujours au moins une colonne visible", () => {
    expect(toggleVisibleColumn(["name", "phone"], "phone")).toEqual(["name"]);
    expect(toggleVisibleColumn(["name"], "name")).toEqual(["name"]);
    expect(toggleVisibleColumn(["name"], "phone")).toEqual(["name", "phone"]);
  });

  it("persiste les colonnes valides et la densité", () => {
    const storage = new MemoryStorage();
    saveTablePreferences(storage, "patients", {
      visibleColumns: ["name", "obsolete"],
      dense: false,
    });
    expect(loadTablePreferences(storage, "patients", ["name", "phone"])).toEqual({
      visibleColumns: ["name"],
      dense: false,
    });
  });

  it("produit un CSV UTF-8 compatible tableur et échappe les valeurs", () => {
    const csv = buildCsv(
      [{ name: 'Doe, "Jane"', note: "ligne 1\nligne 2" }],
      [
        { header: "Nom", value: (row) => row.name },
        { header: "Note", value: (row) => row.note },
      ],
    );
    expect(csv.startsWith("\uFEFFNom;Note\r\n")).toBe(true);
    expect(csv).toContain('"Doe, ""Jane"""');
    expect(csv).toContain('"ligne 1\nligne 2"');
  });
});
