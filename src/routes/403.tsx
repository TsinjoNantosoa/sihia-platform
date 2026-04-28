import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";

export const Route = createFileRoute("/403")({
  head: () => ({ meta: [{ title: "Accès refusé — SIH IA" }] }),
  component: ForbiddenPage,
});

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldOff className="size-8 text-destructive" />
        </div>
        <h1 className="text-7xl font-bold text-foreground">403</h1>
        <h2 className="mt-4 text-xl font-semibold">Accès refusé</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette
          ressource. Contactez votre administrateur si vous pensez qu'il s'agit
          d'une erreur.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
