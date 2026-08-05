import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Stethoscope, Users, LayoutDashboard, Brain, Bell } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchService } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";
import { usePermission } from "@/lib/auth/usePermission";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/patients", labelKey: "nav.patients", icon: Users },
  { href: "/doctors", labelKey: "nav.doctors", icon: Stethoscope },
  { href: "/appointments", labelKey: "nav.appointments", icon: CalendarDays },
  { href: "/prediction", labelKey: "nav.prediction", icon: Brain },
  { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
] as const;

type GlobalSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const t = useT();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const canPatients = usePermission("patients:read");
  const canDoctors = usePermission("doctors:read");
  const canAppts = usePermission("appointments:read");

  const results = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => searchService.search(query, 8),
    enabled: open && query.trim().length >= 2,
  });

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery("");
      if (href.startsWith("/patients/")) {
        const patientId = href.replace("/patients/", "");
        void navigate({ to: "/patients/$patientId", params: { patientId } });
        return;
      }
      void navigate({ to: href as "/" });
    },
    [navigate, onOpenChange],
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const items = results.data?.items ?? [];
  const patients = items.filter((i) => i.type === "patient");
  const doctors = items.filter((i) => i.type === "doctor");
  const appointments = items.filter((i) => i.type === "appointment");

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={t("search.placeholder")}
        aria-label={t("search.aria")}
      />
      <CommandList>
        <CommandEmpty>{t("search.empty")}</CommandEmpty>
        <CommandGroup heading={t("search.nav")}>
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={`${t(item.labelKey)} ${item.href}`}
              onSelect={() => go(item.href)}
            >
              <item.icon className="mr-2 size-4" aria-hidden />
              {t(item.labelKey)}
            </CommandItem>
          ))}
        </CommandGroup>
        {query.trim().length >= 2 ? (
          <>
            <CommandSeparator />
            {canPatients && patients.length > 0 ? (
              <CommandGroup heading={t("search.patients")}>
                {patients.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.title} ${p.subtitle}`}
                    onSelect={() => go(p.href)}
                  >
                    <Users className="mr-2 size-4" aria-hidden />
                    <div className="flex flex-col">
                      <span>{p.title}</span>
                      <span className="text-xs text-muted-foreground">{p.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {canDoctors && doctors.length > 0 ? (
              <CommandGroup heading={t("search.doctors")}>
                {doctors.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={`${d.title} ${d.subtitle}`}
                    onSelect={() => go(d.href)}
                  >
                    <Stethoscope className="mr-2 size-4" aria-hidden />
                    <div className="flex flex-col">
                      <span>{d.title}</span>
                      <span className="text-xs text-muted-foreground">{d.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {canAppts && appointments.length > 0 ? (
              <CommandGroup heading={t("search.appointments")}>
                {appointments.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`${a.title} ${a.subtitle}`}
                    onSelect={() => go(a.href)}
                  >
                    <CalendarDays className="mr-2 size-4" aria-hidden />
                    <div className="flex flex-col">
                      <span>{a.title}</span>
                      <span className="text-xs text-muted-foreground">{a.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

export function useGlobalSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}
