import { Bell, ExternalLink } from "lucide-react";
import type { ReminderChannelsStatus } from "@/lib/api/types";
import { useT } from "@/lib/i18n/store";

function channelModeLabel(mode: string, ready: boolean, t: (k: string) => string): string {
  if (!ready) return t("appts.reminder.channelNotReady");
  if (mode === "smtp") return t("appts.reminder.channelSmtp");
  if (mode === "twilio") return t("appts.reminder.channelTwilio");
  return t("appts.reminder.channelLog");
}

type ReminderChannelsBannerProps = {
  status: ReminderChannelsStatus;
  showMailhogLink?: boolean;
};

export function ReminderChannelsBanner({ status, showMailhogLink = false }: ReminderChannelsBannerProps) {
  const t = useT();
  const emailMode = channelModeLabel(status.email.mode, status.email.ready, t);
  const smsMode = channelModeLabel(status.sms.mode, status.sms.ready, t);
  const isSmtp = status.email.mode === "smtp" && status.email.ready;
  const smtpHost = (status.email.smtpHost || "").toLowerCase();
  const isLocalSmtp =
    smtpHost.includes("localhost") ||
    smtpHost.includes("127.0.0.1") ||
    smtpHost.includes("mailhog");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      <Bell className="size-4 text-primary" />
      <span>{t("appts.reminder.channelEmail").replace("{mode}", emailMode)}</span>
      <span>•</span>
      <span>{t("appts.reminder.channelSms").replace("{mode}", smsMode)}</span>
      <span>•</span>
      <span>{status.hoursBefore}h</span>
      {showMailhogLink && isSmtp && isLocalSmtp ? (
        <a
          href="http://localhost:8025"
          target="_blank"
          rel="noreferrer"
          className="ms-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          MailHog <ExternalLink className="size-3" />
        </a>
      ) : null}
    </div>
  );
}
