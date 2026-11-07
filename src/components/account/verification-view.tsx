"use client";

import { Camera, CircleCheck, Clock, FileText, IdCard, ShieldAlert, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, type Status } from "@/components/common/status-badge";
import { Stepper } from "@/components/common/stepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKyc, useUploadKyc } from "@/lib/api/queries/account";
import type { KycDocType, KycDocument } from "@/lib/api/schemas";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";

const ORDER: KycDocType[] = ["poiFront", "poiBack", "poa", "selfie"];
const ACCEPT = { "image/jpeg": [], "image/png": [], "image/webp": [], "application/pdf": [] };
const MAX = 10 * 1024 * 1024;
const DOC_STATUS: Record<KycDocument["status"], Status | null> = {
  missing: null,
  pending: "pending",
  verified: "verified",
  rejected: "rejected",
  expired: "expired",
};

/** Verification (brief §6.10): one status card + document list, or an upload wizard. */
export function VerificationView() {
  const t = useTranslations("kyc");
  const fmt = useFormatDate();
  const q = useKyc();
  const [wizard, setWizard] = useState<KycDocType[] | null>(null);

  if (q.isPending) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t("title")} />
        <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />
      </div>
    );
  }

  const kyc = q.data;
  const needs = kyc.documents.filter(
    (d) => d.status === "missing" || d.status === "rejected" || d.status === "expired",
  );
  const soon = (d: KycDocument) => d.expiresAt && Date.parse(d.expiresAt) - Date.now() < 45 * 86_400_000;
  const rejectedAny = kyc.documents.some((d) => d.status === "rejected");
  const statusKey =
    kyc.status === "verified"
      ? "verified"
      : kyc.status === "pending"
        ? "pending"
        : rejectedAny
          ? "rejected"
          : "unverified";
  const StatusIcon =
    statusKey === "verified"
      ? CircleCheck
      : statusKey === "pending"
        ? Clock
        : statusKey === "rejected"
          ? ShieldAlert
          : IdCard;

  if (wizard) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={t("wizard.title")} />
        <UploadWizard types={wizard} onDone={() => setWizard(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className={cn(
            "grid size-12 shrink-0 place-content-center rounded-full",
            statusKey === "verified"
              ? "bg-success-soft text-success-text"
              : statusKey === "pending"
                ? "bg-info-soft text-info-text"
                : "bg-warning-soft text-warning-text",
          )}
        >
          <StatusIcon aria-hidden className="size-6" />
        </span>
        <div className="grid flex-1 gap-1">
          <h2 className="font-display text-lg font-bold">{t(`status.${statusKey}`)}</h2>
          <p className="text-sm text-text-2">
            {statusKey === "verified"
              ? t("status.verifiedBody", { date: kyc.reviewedAt ? fmt(kyc.reviewedAt, "date") : "—" })
              : t(`status.${statusKey}Body`)}
          </p>
        </div>
        {needs.length > 0 && statusKey !== "pending" && (
          <Button onClick={() => setWizard(needs.map((d) => d.type))}>
            <Upload aria-hidden /> {t("upload")}
          </Button>
        )}
      </Card>

      <ul className="grid gap-3">
        {ORDER.map((type) => {
          const d = kyc.documents.find((x) => x.type === type)!;
          const badge = DOC_STATUS[d.status];
          return (
            <li key={type}>
              <Card padding="sm" className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 text-text-2">
                  {type === "selfie" ? (
                    <Camera aria-hidden className="size-5" />
                  ) : type === "poa" ? (
                    <FileText aria-hidden className="size-5" />
                  ) : (
                    <IdCard aria-hidden className="size-5" />
                  )}
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-medium">{t(`docs.${type}`)}</span>
                  <span className="text-sm text-text-3">
                    {d.uploadedAt
                      ? t("uploaded", { date: fmt(d.uploadedAt, "date") })
                      : t("docStatus.missing")}
                    {d.expiresAt && (
                      <span className={cn(soon(d) && "text-warning-text")}>
                        {" · "}
                        {soon(d)
                          ? t("expiresSoon", { date: fmt(d.expiresAt, "date") })
                          : t("expires", { date: fmt(d.expiresAt, "date") })}
                      </span>
                    )}
                  </span>
                  {d.rejectionReason && <span className="text-sm text-danger-text">{d.rejectionReason}</span>}
                </div>
                {badge && <StatusBadge status={badge} />}
                {d.status !== "pending" && (d.status !== "verified" || soon(d)) && (
                  <Button variant="outline" size="sm" onClick={() => setWizard([type])}>
                    <Upload aria-hidden /> {d.status === "missing" ? t("upload") : t("reupload")}
                  </Button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UploadWizard({ types, onDone }: { types: KycDocType[]; onDone: () => void }) {
  const t = useTranslations("kyc");
  const upload = useUploadKyc();
  const [index, setIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const type = types[index]!;
  const preview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const onDrop = (accepted: File[], rejected: FileRejection[]) => {
    setError(undefined);
    if (rejected.length) {
      const code = rejected[0]!.errors[0]?.code;
      setError(code === "file-too-large" ? t("wizard.errorSize") : t("wizard.errorType"));
      return;
    }
    setFile(accepted[0] ?? null);
  };
  /** Camera input bypasses react-dropzone, so validate size here. */
  const onCamera = (f: File) => {
    setError(undefined);
    if (f.size > MAX) setError(t("wizard.errorSize"));
    else setFile(f);
  };
  const dz = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX,
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  async function next() {
    if (!file) return;
    setError(undefined);
    try {
      await upload.mutateAsync({ type, file });
      setFile(null);
      if (index + 1 < types.length) setIndex(index + 1);
      else {
        toast.success(t("wizard.done"), { description: t("wizard.doneBody") });
        onDone();
      }
    } catch {
      setError(t("wizard.errorUpload"));
    }
  }

  return (
    <div className="grid gap-5">
      {types.length > 1 && (
        <Stepper steps={types.map((x) => ({ id: x, label: t(`docs.${x}`) }))} current={type} />
      )}
      <h2 className="font-display text-lg font-bold">{t(`docs.${type}`)}</h2>
      <FormAlert>{error}</FormAlert>

      <div
        {...dz.getRootProps()}
        className={cn(
          "grid justify-items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dz.isDragActive ? "border-primary-border bg-primary-soft" : "border-border-strong",
        )}
      >
        <input {...dz.getInputProps()} aria-label={t("wizard.choose")} />
        {file ? (
          preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote asset
            <img
              src={preview}
              alt={t("wizard.preview", { name: file.name })}
              className="max-h-60 rounded-md object-contain"
            />
          ) : (
            <p className="flex items-center gap-2 text-sm">
              <FileText aria-hidden className="size-5 text-text-3" /> {file.name}
            </p>
          )
        ) : (
          <>
            <Upload aria-hidden className="size-8 text-text-3" />
            <p className="text-sm text-text-2">{t("wizard.drop")}</p>
          </>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" onClick={dz.open}>
            {file ? t("wizard.replace") : t("wizard.choose")}
          </Button>
          {/* Camera capture on phones */}
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border-strong px-4 font-display text-sm font-medium focus-within:outline-2 focus-within:outline-focus-ring hover:bg-surface-2 md:hidden">
            <Camera aria-hidden className="size-4" /> {t("wizard.camera")}
            <input
              type="file"
              accept="image/*"
              capture={type === "selfie" ? "user" : "environment"}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCamera(f);
              }}
            />
          </label>
        </div>
        <p className="text-xs text-text-3">{t("wizard.formats")}</p>
      </div>

      <div className="rounded-md bg-surface-1 p-4 text-sm">
        <p className="mb-2 font-medium">{t("wizard.tips")}</p>
        {type === "selfie" ? (
          <p className="text-text-2">{t("wizard.selfieTips")}</p>
        ) : (
          <ul className="grid list-disc gap-1 pl-5 text-text-2">
            {(["1", "2", "3"] as const).map((k) => (
              <li key={k}>{t(`wizard.tipsList.${k}`)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onDone}>
          {/* back to the overview */}
          {t("title")}
        </Button>
        <Button disabled={!file} loading={upload.isPending} onClick={next}>
          {index + 1 < types.length ? t("wizard.next") : t("wizard.finish")}
        </Button>
      </div>
      <p className="text-right text-xs text-text-3">
        {t("wizard.step", { current: index + 1, total: types.length })}
      </p>
    </div>
  );
}
