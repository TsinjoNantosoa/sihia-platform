import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // La home redirige vers le dashboard protégé.
    throw redirect({ to: "/dashboard" });
  },
});
