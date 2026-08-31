import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useI18n, useT } from "@/lib/i18n/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/States";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  DataTableToolbar,
  SortableTableHead,
  type TableColumnOption,
} from "@/components/shared/DataTableTools";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import {
  auditService,
  rbacService,
  type RbacUserCreatePayload,
  type RbacUserUpdatePayload,
} from "@/lib/api/services";
import type { RbacUser } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildCsv, downloadCsv, sortRows, toggleSort, type SortState } from "@/lib/table/dataTable";
import { useTablePreferences } from "@/lib/table/useTablePreferences";
import { UNDOABLE_ACTION_DELAY_MS } from "@/lib/actions/undoableAction";
import { scheduleUndoableToast } from "@/lib/actions/undoableToast";

export const Route = createFileRoute("/_app/rbac")({
  beforeLoad: requireRoutePermission("manage_roles"),
  head: () => ({ meta: [{ title: "RBAC — SIHIA" }] }),
  component: RbacPage,
});

const ROLES = [
  {
    id: "admin",
    name: "Administrateur",
    desc: "Accès complet au système",
    perms: ["users:*", "data:*", "config:*"],
  },
  {
    id: "manager",
    name: "Manager",
    desc: "Vue analytique et opérationnelle",
    perms: ["analytics:read", "patients:read", "appointments:read"],
  },
  {
    id: "doctor",
    name: "Médecin",
    desc: "Accès dossiers patients et planning",
    perms: ["patients:read", "patients:update", "appointments:*"],
  },
  {
    id: "staff",
    name: "Staff d'accueil",
    desc: "Prise de RDV et accueil",
    perms: ["patients:read", "appointments:create"],
  },
] as const;

const ROLE_OPTIONS: RbacUser["role"][] = ["admin", "manager", "doctor", "staff"];

type RbacColumn = "user" | "role" | "lastLogin" | "status";
const RBAC_COLUMN_IDS: RbacColumn[] = ["user", "role", "lastLogin", "status"];

function RbacPage() {
  const t = useT();
  const locale = useI18n((state) => state.locale);
  const queryClient = useQueryClient();
  const currentUser = useAuth((state) => state.user);
  const currentUserId = currentUser?.id;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RbacUser | null>(null);
  const [toDelete, setToDelete] = useState<RbacUser | null>(null);
  const [pendingDeletionIds, setPendingDeletionIds] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<SortState<RbacColumn>>({ key: "user", direction: "asc" });
  const columns: TableColumnOption<RbacColumn>[] = [
    { id: "user", label: t("rbac.col.user") },
    { id: "role", label: t("rbac.col.role") },
    { id: "lastLogin", label: t("rbac.col.lastLogin") },
    { id: "status", label: t("rbac.col.status") },
  ];
  const table = useTablePreferences(
    "rbac-users",
    currentUser?.id || currentUser?.email || "anonymous",
    RBAC_COLUMN_IDS,
  );

  const { data, isLoading } = useQuery({ queryKey: ["rbac"], queryFn: rbacService.list });
  const sortedUsers = sortRows(
    data ?? [],
    sort,
    {
      user: (user) => `${user.name} ${user.email}`,
      role: (user) => user.role,
      lastLogin: (user) => (user.lastLogin ? new Date(user.lastLogin) : null),
      status: (user) => user.status,
    },
    locale,
  );
  const rowClassName = table.dense ? "px-3 py-2" : "px-4 py-3";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rbac"] });

  const createMutation = useMutation({
    mutationFn: (body: RbacUserCreatePayload) => rbacService.create(body),
    onSuccess: () => {
      toast.success(t("rbac.created"));
      setCreating(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: RbacUserUpdatePayload }) =>
      rbacService.update(id, body),
    onSuccess: () => {
      toast.success(t("rbac.updated"));
      setEditing(null);
      invalidate();
    },
  });

  const scheduleUserDeletion = (user: RbacUser) => {
    setPendingDeletionIds((current) => new Set(current).add(user.id));
    scheduleUndoableToast({
      message: t("undo.deleteScheduled", { name: user.name }),
      description: t("undo.deleteDescription", {
        seconds: UNDOABLE_ACTION_DELAY_MS / 1_000,
      }),
      undoLabel: t("undo.action"),
      committingMessage: t("undo.committing"),
      undoneMessage: t("undo.cancelled"),
      successMessage: t("rbac.deleted"),
      errorMessage: t("undo.failed"),
      execute: async () => {
        await rbacService.remove(user.id);
        await invalidate();
      },
      onSettled: () =>
        setPendingDeletionIds((current) => {
          const next = new Set(current);
          next.delete(user.id);
          return next;
        }),
    });
  };

  const exportAuditMutation = useMutation({
    mutationFn: () => auditService.exportJsonl(),
    onSuccess: () => toast.success(t("rbac.exportAuditSuccess")),
    onError: () => toast.error(t("common.error")),
  });

  const exportUsers = () => {
    const csvColumns = {
      user: {
        header: t("rbac.col.user"),
        value: (user: RbacUser) => `${user.name} <${user.email}>`,
      },
      role: { header: t("rbac.col.role"), value: (user: RbacUser) => user.role },
      lastLogin: {
        header: t("rbac.col.lastLogin"),
        value: (user: RbacUser) =>
          user.lastLogin
            ? new Date(user.lastLogin).toLocaleString(locale)
            : t("rbac.lastLogin.none"),
      },
      status: {
        header: t("rbac.col.status"),
        value: (user: RbacUser) =>
          user.status === "active" ? t("rbac.status.active") : t("rbac.status.suspended"),
      },
    };
    downloadCsv(
      `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`,
      buildCsv(
        sortedUsers,
        table.visibleColumns.map((column) => csvColumns[column]),
      ),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("rbac.title")} subtitle={t("rbac.subtitle")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">{r.name}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {r.perms.map((p) => (
                <code key={p} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {p}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2">
            <UserCog className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("rbac.users")}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionGuard permission="users:read">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={exportAuditMutation.isPending}
                onClick={() => exportAuditMutation.mutate()}
              >
                <Download className="me-1 size-4" />
                {t("rbac.exportAudit")}
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="users:create">
              <Button type="button" size="sm" onClick={() => setCreating(true)}>
                <Plus className="me-1 size-4" />
                {t("rbac.addUser")}
              </Button>
            </PermissionGuard>
          </div>
        </div>
        <DataTableToolbar
          columns={columns}
          visibleColumns={table.visibleColumns}
          onToggleColumn={table.toggleColumn}
          dense={table.dense}
          onDenseChange={table.setDense}
          rowCount={sortedUsers.length}
          onExport={exportUsers}
        />
        {isLoading ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="min-w-full text-sm"
              data-testid="rbac-users-table"
              data-density={table.dense ? "compact" : "comfortable"}
            >
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {columns.map((column) =>
                    table.isVisible(column.id) ? (
                      <SortableTableHead
                        key={column.id}
                        column={column.id}
                        label={column.label}
                        sort={sort}
                        onSort={(nextColumn) =>
                          setSort((current) => toggleSort(current, nextColumn))
                        }
                      />
                    ) : null,
                  )}
                  <th scope="col" className="px-3 py-2 text-end">
                    {t("rbac.col.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    {table.isVisible("user") ? (
                      <td className={rowClassName}>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                    ) : null}
                    {table.isVisible("role") ? (
                      <td className={rowClassName}>
                        <StatusBadge tone="primary">{u.role}</StatusBadge>
                      </td>
                    ) : null}
                    {table.isVisible("lastLogin") ? (
                      <td className={`${rowClassName} font-mono text-xs text-muted-foreground`}>
                        {u.lastLogin
                          ? new Date(u.lastLogin).toLocaleString()
                          : t("rbac.lastLogin.none")}
                      </td>
                    ) : null}
                    {table.isVisible("status") ? (
                      <td className={rowClassName}>
                        <StatusBadge tone={u.status === "active" ? "success" : "destructive"} dot>
                          {u.status === "active"
                            ? t("rbac.status.active")
                            : t("rbac.status.suspended")}
                        </StatusBadge>
                      </td>
                    ) : null}
                    <td className={rowClassName}>
                      <div className="flex justify-end gap-1">
                        <PermissionGuard permission="users:update">
                          <button
                            type="button"
                            onClick={() => setEditing(u)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted"
                          >
                            <Pencil className="size-3" />
                            {t("rbac.editUser")}
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="users:delete">
                          {u.id !== currentUserId && (
                            <button
                              type="button"
                              disabled={pendingDeletionIds.has(u.id)}
                              onClick={() => setToDelete(u)}
                              className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3" />
                              {t("rbac.delete")}
                            </button>
                          )}
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormDialog
        open={creating}
        title={t("rbac.addUser")}
        submitLabel={t("rbac.createUser")}
        onClose={() => setCreating(false)}
        onSubmit={(body) => createMutation.mutate(body as RbacUserCreatePayload)}
        isPending={createMutation.isPending}
        mode="create"
        t={t}
      />

      {editing && (
        <UserFormDialog
          open={Boolean(editing)}
          title={t("rbac.editUser")}
          submitLabel={t("rbac.save")}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(body) =>
            updateMutation.mutate({ id: editing.id, body: body as RbacUserUpdatePayload })
          }
          isPending={updateMutation.isPending}
          mode="edit"
          t={t}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t("confirm.delete.title")}
        description={t("undo.confirmDescription", {
          seconds: UNDOABLE_ACTION_DELAY_MS / 1_000,
        })}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={() => toDelete && scheduleUserDeletion(toDelete)}
      />
    </div>
  );
}

function UserFormDialog({
  open,
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
  isPending,
  mode,
  t,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  initial?: RbacUser;
  onClose: () => void;
  onSubmit: (body: RbacUserCreatePayload | RbacUserUpdatePayload) => void;
  isPending: boolean;
  mode: "create" | "edit";
  t: (key: string) => string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RbacUser["role"]>(initial?.role ?? "staff");
  const [status, setStatus] = useState<RbacUser["status"]>(initial?.status ?? "active");
  const [facility, setFacility] = useState(initial?.facility ?? "Hopital Central");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      onSubmit({ name, email, password, role, facility });
      return;
    }
    const body: RbacUserUpdatePayload = { name, email, role, status, facility };
    if (password.trim()) body.password = password;
    onSubmit(body);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t("rbac.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">{t("rbac.name")}</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">{t("rbac.email")}</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">
                {mode === "create" ? t("rbac.password") : t("rbac.passwordOptional")}
              </span>
              <input
                type="password"
                required={mode === "create"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">{t("rbac.col.role")}</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RbacUser["role"])}
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            {mode === "edit" && (
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("rbac.col.status")}</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RbacUser["status"])}
                  className="rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="active">{t("rbac.status.active")}</option>
                  <option value="suspended">{t("rbac.status.suspended")}</option>
                </select>
              </label>
            )}
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">{t("rbac.facility")}</span>
              <input
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
