import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, UserCog } from "lucide-react";
import { useT } from "@/lib/i18n/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/States";
import { rbacService } from "@/lib/api/services";

export const Route = createFileRoute("/_app/rbac")({
  head: () => ({ meta: [{ title: "RBAC — SIH IA" }] }),
  component: RbacPage,
});

const ROLES = [
  { id: "admin", name: "Administrateur", desc: "Accès complet au système", perms: ["users:*", "data:*", "config:*"] },
  { id: "manager", name: "Manager", desc: "Vue analytique et opérationnelle", perms: ["analytics:read", "patients:read", "appointments:read"] },
  { id: "doctor", name: "Médecin", desc: "Accès dossiers patients et planning", perms: ["patients:read", "patients:write", "appointments:*"] },
  { id: "staff", name: "Staff d'accueil", desc: "Prise de RDV et accueil", perms: ["patients:read", "appointments:write"] },
];

function RbacPage() {
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["rbac"], queryFn: rbacService.list });

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
                <code key={p} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{p}</code>
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
        </div>
        {isLoading ? <LoadingState /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t("rbac.col.user")}</th>
                  <th className="px-4 py-3 text-start">{t("rbac.col.role")}</th>
                  <th className="px-4 py-3 text-start">{t("rbac.col.lastLogin")}</th>
                  <th className="px-4 py-3 text-end">{t("rbac.col.status")}</th>
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
                      {new Date(u.lastLogin).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <StatusBadge tone={u.status === "active" ? "success" : "destructive"} dot>
                        {u.status === "active" ? "Actif" : "Suspendu"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
