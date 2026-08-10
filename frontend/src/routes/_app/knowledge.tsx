import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { knowledgeService } from "@/lib/api/services";
import { requireRoutePermission } from "@/lib/auth/routeGuard";

export const Route = createFileRoute("/_app/knowledge")({
  beforeLoad: requireRoutePermission("manage_roles"),
  head: () => ({ meta: [{ title: "Base de connaissances — SIH IA" }] }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const documents = useQuery({ queryKey: ["knowledge-documents"], queryFn: knowledgeService.list });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
  const upload = useMutation({
    mutationFn: knowledgeService.upload,
    onSuccess: () => {
      toast.success("Document indexé");
      refresh();
    },
    onError: (error) => toast.error(error.message || "Échec de l'indexation"),
  });
  const reindex = useMutation({
    mutationFn: knowledgeService.reindex,
    onSuccess: () => {
      toast.success("Document réindexé");
      refresh();
    },
    onError: () => toast.error("Échec de la réindexation"),
  });
  const remove = useMutation({
    mutationFn: knowledgeService.remove,
    onSuccess: () => {
      toast.success("Document supprimé");
      refresh();
    },
    onError: () => toast.error("Échec de la suppression"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Base de connaissances RAG"
        subtitle="Documents utilisés comme preuves par l'assistant SIH IA. PDF, TXT ou Markdown, 20 Mo maximum."
        actions={
          <>
            <input
              ref={input}
              className="hidden"
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
            <Button disabled={upload.isPending} onClick={() => input.current?.click()}>
              <Upload className="mr-2 size-4" />
              {upload.isPending ? "Indexation…" : "Ajouter un document"}
            </Button>
          </>
        }
      />
      {documents.isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>
      ) : null}
      {documents.isError ? (
        <Card className="border-destructive p-6 text-sm text-destructive">
          Impossible de charger les documents.
        </Card>
      ) : null}
      {!documents.isLoading && documents.data?.items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Aucun document indexé.
        </Card>
      ) : null}
      <div className="grid gap-3">
        {documents.data?.items.map((document) => (
          <Card key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <FileText className="size-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{document.filename}</div>
              <div className="text-xs text-muted-foreground">
                {document.content_type} · {(document.size_bytes / 1024).toFixed(1)} Ko ·{" "}
                {document.chunk_count} fragments · {new Date(document.created_at).toLocaleString()}
              </div>
              {document.error_message ? (
                <p className="mt-1 text-xs text-destructive">{document.error_message}</p>
              ) : null}
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs ${document.status === "ready" ? "bg-success/10 text-success" : document.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}
            >
              {document.status}
            </span>
            <Button
              variant="outline"
              size="icon"
              title="Réindexer"
              disabled={reindex.isPending}
              onClick={() => reindex.mutate(document.id)}
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Supprimer"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Supprimer ${document.filename} ?`)) remove.mutate(document.id);
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
