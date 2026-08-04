import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { patientsService } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/store";
import { useT } from "@/lib/i18n/store";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { EmptyState, LoadingState } from "@/components/shared/States";

export function PatientDocumentsPanel({ patientId }: { patientId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const token = useAuth((s) => s.token);

  const docs = useQuery({
    queryKey: ["patient-documents", patientId],
    queryFn: () => patientsService.listDocuments(patientId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => patientsService.uploadDocument(patientId, file, "autre"),
    onSuccess: () => {
      toast.success(t("patients.docs.uploaded"));
      void qc.invalidateQueries({ queryKey: ["patient-documents", patientId] });
    },
    onError: () => toast.error(t("patients.docs.uploadFail")),
  });

  const remove = useMutation({
    mutationFn: (documentId: string) => patientsService.deleteDocument(patientId, documentId),
    onSuccess: () => {
      toast.success(t("patients.docs.deleted"));
      void qc.invalidateQueries({ queryKey: ["patient-documents", patientId] });
    },
    onError: () => toast.error(t("patients.docs.deleteFail")),
  });

  const openDoc = async (documentId: string, filename: string) => {
    const url = patientsService.documentDownloadUrl(patientId, documentId);
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      toast.error(t("patients.docs.openFail"));
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    void filename;
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold">{t("patients.docs.title")}</h2>
        <PermissionGuard permission="patients:update">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <FileUp className="size-3.5" aria-hidden />
            {t("patients.docs.upload")}
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/*,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
        </PermissionGuard>
      </div>
      {docs.isLoading ? (
        <LoadingState />
      ) : !docs.data?.length ? (
        <div className="p-6">
          <EmptyState title={t("patients.docs.empty")} />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {docs.data.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.category} · {Math.round(doc.sizeBytes / 1024)} Ko · {doc.uploadedAt.slice(0, 16)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void openDoc(doc.id, doc.filename)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {t("patients.docs.open")}
                </button>
                <PermissionGuard permission="patients:update">
                  <button
                    type="button"
                    onClick={() => remove.mutate(doc.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {t("common.delete")}
                  </button>
                </PermissionGuard>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
        {t("patients.docs.hint")}
      </p>
    </section>
  );
}
