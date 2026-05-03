import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow, parseISO, isAfter } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Bell,
  CalendarPlus,
  MessageSquare,
  FileQuestion,
  CreditCard,
  AlertTriangle,
  CheckCheck,
  ExternalLink,
  Inbox,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  useListAdminAppointments,
  useListAdminContactInquiries,
  useListAdminChatThreads,
  useListAdminPayments,
  useListAdminInvoices,
  type Appointment,
  type ContactInquiry,
  type ChatThread,
  type Payment,
  type Invoice,
} from "@workspace/api-client-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAdminI18n } from "@/lib/admin-i18n";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

type NotifKind = "appointment" | "inquiry" | "chat" | "payment" | "invoice";

type Notif = {
  id: string;          // unique stable id (e.g. "appointment:42")
  kind: NotifKind;
  title: string;
  description: string;
  href: string;
  timestamp: number;   // ms epoch
  isUnread: boolean;
  count?: number;      // optional: e.g. number of unread chat messages in a thread
};

/* ──────────────────────────────────────────────
   localStorage helpers
   ────────────────────────────────────────────── */

const LAST_READ_KEY = "admin.notifications.lastReadTs";

function getLastRead(): number {
  try {
    const raw = window.localStorage.getItem(LAST_READ_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function setLastRead(ts: number) {
  try {
    window.localStorage.setItem(LAST_READ_KEY, String(ts));
  } catch { /* ignore */ }
  /* Notify other tabs / components in the same window. */
  window.dispatchEvent(new Event("admin-notifications-updated"));
}

/* ──────────────────────────────────────────────
   Bell trigger
   ────────────────────────────────────────────── */

export function AdminNotificationsBell({
  className = "",
  iconClassName = "",
}: {
  className?: string;
  iconClassName?: string;
}) {
  const [, setLocation] = useLocation();
  const { ta, isRtl } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const [lastReadTs, setLastReadTsState] = useState<number>(() => getLastRead());

  /* Polling cadence:
   *  - 60s while the tab is visible (was 30s × 5 endpoints = a request every 6s
   *    on average — way too chatty and the source of the ERR_NETWORK_CHANGED
   *    flood whenever WiFi/VPN blips).
   *  - Paused entirely while the tab is hidden so we don't burn battery /
   *    quota in the background. The next focus event will refresh anyway. */
  const queryOpts = {
    query: {
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
      /* Network blips are user-side and not worth retrying or throwing in the
         console; React Query will re-run on the next interval anyway. */
      retry: 0,
      refetchOnReconnect: false,
      networkMode: "offlineFirst" as const,
    },
  } as const;

  /** Pull a generous slice from each source, then we filter client-side. */
  const { data: appointments, isLoading: aLoading } = useListAdminAppointments(
    {} as any,
    queryOpts as any,
  );
  const { data: inquiries, isLoading: iLoading } = useListAdminContactInquiries(
    {} as any,
    queryOpts as any,
  );
  const { data: threads, isLoading: cLoading } = useListAdminChatThreads(
    {} as any,
    queryOpts as any,
  );
  const { data: payments, isLoading: pLoading } = useListAdminPayments(
    { status: "pending" as any },
    queryOpts as any,
  );
  const { data: invoices, isLoading: invLoading } = useListAdminInvoices(
    {} as any,
    queryOpts as any,
  );

  const isLoadingAny = aLoading || iLoading || cLoading || pLoading || invLoading;

  /* Listen for cross-component updates so the badge re-renders. */
  useEffect(() => {
    const onUpd = () => setLastReadTsState(getLastRead());
    window.addEventListener("admin-notifications-updated", onUpd);
    window.addEventListener("storage", onUpd);
    return () => {
      window.removeEventListener("admin-notifications-updated", onUpd);
      window.removeEventListener("storage", onUpd);
    };
  }, []);

  /* ──────────────────────────────────────────────
     Build the unified feed
     ────────────────────────────────────────────── */
  const notifications = useMemo<Notif[]>(() => {
    const all: Notif[] = [];
    const now = Date.now();

    /** Appointments: pending status from the last 14 days. */
    (appointments ?? []).forEach((a: Appointment) => {
      if (a.status !== "pending") return;
      const created = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const ageMs = now - created;
      if (ageMs > 14 * 24 * 60 * 60 * 1000 && created > now) {
        // future bookings, still unread
      }
      all.push({
        id: `appointment:${a.id}`,
        kind: "appointment",
        title: isRtl ? "حجز موعد جديد" : "New appointment booking",
        description: `${a.clientName} · ${isRtl ? a.serviceNameAr ?? a.serviceNameEn ?? "" : a.serviceNameEn ?? a.serviceNameAr ?? ""}`,
        href: "/admin/appointments",
        timestamp: created || now,
        isUnread: created > lastReadTs,
      });
    });

    /** Contact inquiries with status "new". */
    (inquiries ?? []).forEach((q: ContactInquiry) => {
      if (q.status !== "new") return;
      const ts = q.createdAt ? new Date(q.createdAt).getTime() : 0;
      all.push({
        id: `inquiry:${q.id}`,
        kind: "inquiry",
        title: isRtl ? "استفسار جديد" : "New contact inquiry",
        description: `${q.fullName} — ${q.subject || (isRtl ? "بدون عنوان" : "No subject")}`,
        href: "/admin/inquiries",
        timestamp: ts,
        isUnread: ts > lastReadTs,
      });
    });

    /** Chat threads with unread admin messages. */
    (threads ?? []).forEach((t: ChatThread) => {
      const unread = t.unreadByAdmin ?? 0;
      if (unread <= 0) return;
      const ts = t.lastMessageAt ? new Date(t.lastMessageAt).getTime() : 0;
      all.push({
        id: `chat:${t.id}`,
        kind: "chat",
        title: isRtl ? "رسائل دردشة جديدة" : "New chat messages",
        description: `${t.visitorName || (isRtl ? "زائر" : "Visitor")} — ${unread} ${isRtl ? "رسالة" : unread === 1 ? "message" : "messages"}`,
        href: "/admin/chat",
        timestamp: ts,
        isUnread: true,           // chat unread is server-driven
        count: unread,
      });
    });

    /** Pending payments. */
    (payments ?? []).forEach((p: Payment) => {
      const ts = p.paidAt ? new Date(p.paidAt).getTime() : new Date(p.createdAt).getTime();
      all.push({
        id: `payment:${p.id}`,
        kind: "payment",
        title: isRtl ? "دفعة بانتظار التأكيد" : "Payment awaiting confirmation",
        description: `${p.clientName ?? (isRtl ? "بدون عميل" : "No client")} · ${p.amountEgp.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`,
        href: "/admin/payments",
        timestamp: ts,
        isUnread: ts > lastReadTs,
      });
    });

    /** Overdue invoices. */
    const today = new Date();
    (invoices ?? []).forEach((inv: Invoice) => {
      if (inv.status === "paid" || inv.status === "cancelled") return;
      if (!inv.dueDate) return;
      try {
        const due = parseISO(inv.dueDate);
        if (!isAfter(today, due)) return;
        const ts = due.getTime();
        all.push({
          id: `invoice:${inv.id}`,
          kind: "invoice",
          title: isRtl ? "فاتورة متأخرة" : "Overdue invoice",
          description: `${inv.invoiceNumber} — ${inv.clientName} · ${Number(inv.total).toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`,
          href: `/admin/invoices/${inv.id}`,
          timestamp: ts,
          isUnread: ts > lastReadTs,
        });
      } catch { /* ignore */ }
    });

    all.sort((a, b) => b.timestamp - a.timestamp);
    return all;
  }, [appointments, inquiries, threads, payments, invoices, lastReadTs, isRtl]);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllRead = () => {
    setLastRead(Date.now());
    setLastReadTsState(Date.now());
  };

  const handleClick = (n: Notif) => {
    setOpen(false);
    setLocation(n.href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={isRtl ? "الإشعارات" : "Notifications"}
          className={`relative inline-flex items-center justify-center rounded-full transition-colors ${
            className || "w-9 h-9 text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          <Bell className={`w-4.5 h-4.5 ${iconClassName || "w-5 h-5"} ${unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[hsl(220,40%,8%)]"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={isRtl ? "start" : "end"}
        sideOffset={8}
        className="w-[380px] max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden border-border/60 shadow-xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight">
              {isRtl ? "الإشعارات" : "Notifications"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0
                ? isRtl ? `${unreadCount} غير مقروءة` : `${unreadCount} unread`
                : isRtl ? "كل الإشعارات تمت قراءتها" : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[11px] gap-1"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {isRtl ? "تعليم كمقروء" : "Mark all read"}
            </Button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto">
          {isLoadingAny && notifications.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mb-2" />
              <p className="text-xs">{isRtl ? "جاري تحميل الإشعارات…" : "Loading notifications…"}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">{isRtl ? "لا توجد إشعارات" : "All clear!"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRtl ? "ستظهر هنا أي إجراءات جديدة من الموقع" : "New activity from the site will appear here"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {notifications.slice(0, 30).map((n) => (
                <NotificationItem
                  key={n.id}
                  notif={n}
                  isRtl={isRtl}
                  onClick={() => handleClick(n)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-3 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {notifications.length > 30
                ? isRtl ? `يتم عرض 30 من ${notifications.length}` : `Showing 30 of ${notifications.length}`
                : isRtl ? `${notifications.length} عنصر` : `${notifications.length} item${notifications.length === 1 ? "" : "s"}`}
            </span>
            <button
              type="button"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
              onClick={() => { setOpen(false); setLocation("/admin"); }}
            >
              {isRtl ? "لوحة التحكم" : "Open dashboard"} <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </PopoverContent>

      {/* tiny wiggle keyframes */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(-12deg); }
          30% { transform: rotate(10deg); }
          45% { transform: rotate(-6deg); }
          60% { transform: rotate(4deg); }
          75% { transform: rotate(-2deg); }
        }
      `}</style>
    </Popover>
  );
}

/* ──────────────────────────────────────────────
   List item
   ────────────────────────────────────────────── */

function NotificationItem({
  notif,
  isRtl,
  onClick,
}: {
  notif: Notif;
  isRtl: boolean;
  onClick: () => void;
}) {
  const meta = ICON_META[notif.kind];
  const Icon = meta.icon;
  const dateLocale = isRtl ? ar : enUS;

  let timeLabel = "—";
  try {
    if (notif.timestamp) {
      timeLabel = formatDistanceToNow(new Date(notif.timestamp), {
        addSuffix: true,
        locale: dateLocale,
      });
    }
  } catch { /* ignore */ }

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-start gap-3 px-3 py-3 text-start transition-colors hover:bg-muted/40 ${
          notif.isUnread ? "bg-primary/[0.04]" : ""
        }`}
      >
        <div
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${meta.bg} ${meta.fg}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight truncate">{notif.title}</p>
            {notif.isUnread && (
              <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.description}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">{timeLabel}</p>
        </div>
      </button>
    </li>
  );
}

const ICON_META: Record<NotifKind, { icon: any; bg: string; fg: string }> = {
  appointment: {
    icon: CalendarPlus,
    bg: "bg-blue-500/10",
    fg: "text-blue-600 dark:text-blue-400",
  },
  inquiry: {
    icon: FileQuestion,
    bg: "bg-violet-500/10",
    fg: "text-violet-600 dark:text-violet-400",
  },
  chat: {
    icon: MessageSquare,
    bg: "bg-sky-500/10",
    fg: "text-sky-600 dark:text-sky-400",
  },
  payment: {
    icon: CreditCard,
    bg: "bg-amber-500/10",
    fg: "text-amber-600 dark:text-amber-400",
  },
  invoice: {
    icon: AlertTriangle,
    bg: "bg-rose-500/10",
    fg: "text-rose-600 dark:text-rose-400",
  },
};
