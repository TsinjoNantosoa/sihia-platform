import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/States";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { rbacService, type RbacUserCreatePayload, type RbacUserUpdatePayload } from "@/lib/api/services";
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

export const Route = createFileRoute("/_app/rbac")({
  beforeLoad: requireRoutePermission("manage_roles"),
  head: () => ({ meta: [{ title: "RBAC — SIH IA" }] }),
  component: RbacPage,
});

const ROLES = [
  { id: "admin", name: "Administrateur", desc: "Accès complet au système", perms: ["users:*", "data:*", "config:*"] },
  { id: "manager", name: "Manager", desc: "Vue analytique et opérationnelle", perms: ["analytics:read", "patients:read", "appointments:read"] },
  { id: "doctor", name: "Médecin", desc: "Accès dossiers patients et planning", perms: ["patients:read", "patients:update", "appointments:*"] },
  { id: "staff", name: "Staff d'accueil", desc: "Prise de RDV et accueil", perms: ["patients:read", "appointments:create"] },
] as const;

const ROLE_OPTIONS: RbacUser["role"][] = ["admin", "manager", "doctor", "staff"];

function RbacPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const currentUserId = useAuth((s) => s.user?.id);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RbacUser | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["rbac"], queryFn: rbacService.list });

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
    mutationFn: ({ id, body }: { id: string; body: RbacUserUpdatePayload }) => rbacService.update(id, body),
    onSuccess: () => {
      toast.success(t("rbac.updated"));
      setEditing(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rbacService.remove(id),
    onSuccess: () => {
      toast.success(t("rbac.deleted"));
      invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("rbac.title")} subtitle={t("rbac.subtitle")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
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
          <PermissionGuard permission="users:create">
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="me-1 size-4" />
              {t("rbac.addUser")}
            </Button>
          </PermissionGuard>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t("rbac.col.user")}</th>
                  <th className="px-4 py-3 text-start">{t("rbac.col.role")}</th>
                  <th className="px-4 py-3 text-start">{t("rbac.col.lastLogin")}</th>
                  <th className="px-4 py-3 text-start">{t("rbac.col.status")}</th>
                  <th className="px-4 py-3 text-end">{t("rbac.col.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone="primary">{u.role}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : t("rbac.lastLogin.none")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={u.status === "active" ? "success" : "destructive"} dot>
                        {u.status === "active" ? t("rbac.status.active") : t("rbac.status.suspended")}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
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
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (window.confirm(t("confirm.delete.body"))) {
                                  deleteMutation.mutate(u.id);
                                }
                              }}
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
          onSubmit={(body) => updateMutation.mutate({ id: editing.id, body: body as RbacUserUpdatePayload })}
          isPending={updateMutation.isPending}
          mode="edit"
          t={t}
        />
      )}
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
