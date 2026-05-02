import { useEffect, useMemo, useState } from "react";
import { format, isToday, isThisWeek, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  useListAdminAppointments,
  useUpdateAdminAppointment,
  useListAdminLawyers,
  getListAdminAppointmentsQueryKey,
  getListAdminClientsQueryKey,
  AppointmentStatus,
  type UpdateAppointmentInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Filter,
  MoreHorizontal,
  Check,
  X,
  CheckCircle,
  Video,
  Search,
  Eye,
  Pencil,
  Mail,
  Phone,
  User,
  Briefcase,
  Banknote,
  StickyNote,
  Link as LinkIcon,
  Globe,
  Building2,
  Clock,
  Calendar as CalendarIcon,
  Hourglass,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Send,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader,
  SkeletonRows,
  EmptyState,
  SectionCard,
  FilterBar,
  StatusBadge,
} from "@/components/admin-ui";
import {
  dispatchEmail,
  templateForStatus,
  loadEmailConfig,
  type EmailTemplateKey,
  type AppointmentLike,
} from "@/lib/admin-email";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

type ApptRow = {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  serviceId: number;
  serviceNameAr?: string | null;
  serviceNameEn?: string | null;
  lawyerId?: number | null;
  lawyerNameAr?: string | null;
  lawyerNameEn?: string | null;
  scheduledAt: string;
  durationMinutes?: number;
  mode: "online" | "in_office" | string;
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled" | string;
  meetingLink?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  paymentReference?: string | null;
  amountEgp?: number;
  language?: "ar" | "en" | string | null;
  createdAt?: string;
};

const STATUSES = ["pending", "approved", "rejected", "completed", "cancelled"] as const;
type StatusValue = (typeof STATUSES)[number];

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function AdminAppointments() {
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const dir = isRtl ? "rtl" : "ltr";
  const dateLocale = isRtl ? ar : enUS;

  /* filters */
  const [status, setStatus] = useState<string>("all");
  const [mode, setMode] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queryParams = useMemo(
    () => ({
      ...(status !== "all" && { status: status as AppointmentStatus }),
      ...(from && { from }),
      ...(to && { to }),
    }),
    [status, from, to],
  );

  const { data, isLoading, refetch, isFetching } = useListAdminAppointments(queryParams);
  const { data: lawyers } = useListAdminLawyers();
  const updateAppointment = useUpdateAdminAppointment();

  /* dialogs */
  const [viewing, setViewing] = useState<ApptRow | null>(null);
  const [editing, setEditing] = useState<ApptRow | null>(null);
  const [confirming, setConfirming] = useState<{
    appt: ApptRow;
    action: "approve" | "reject" | "complete" | "cancel";
  } | null>(null);

  /* derived rows after client-side filtering */
  const rows = useMemo<ApptRow[]>(() => {
    const list = (data ?? []) as ApptRow[];
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (mode !== "all" && r.mode !== mode) return false;
      if (q) {
        const hay = `${r.clientName} ${r.clientEmail} ${r.clientPhone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, mode, search]);

  /* stats derived from full list (not filtered) */
  const stats = useMemo(() => {
    const list = (data ?? []) as ApptRow[];
    const todayCount = list.filter((r) => {
      try { return isToday(parseISO(r.scheduledAt)); } catch { return false; }
    }).length;
    const weekRevenue = list
      .filter((r) => {
        try { return isThisWeek(parseISO(r.scheduledAt), { weekStartsOn: 6 }); } catch { return false; }
      })
      .reduce((s, r) => s + (Number(r.amountEgp) || 0), 0);
    const pending = list.filter((r) => r.status === "pending").length;
    const approved = list.filter((r) => r.status === "approved").length;
    const completed = list.filter((r) => r.status === "completed").length;
    return { todayCount, weekRevenue, pending, approved, completed, total: list.length };
  }, [data]);

  /* ──────────────────────────────────────────────
     Mutations + email side-effects
     ────────────────────────────────────────────── */

  const sendEmail = (appt: ApptRow, key: EmailTemplateKey, opts?: { rejectionReason?: string }) => {
    const cfg = loadEmailConfig();
    if (!cfg.enabled) {
      toast(isRtl ? "تنبيه: إشعارات البريد معطّلة" : "Heads up: email notifications are disabled", {
        description: isRtl ? "فعّلها من الإعدادات → البريد" : "Enable them in Settings → Email",
      });
      return;
    }
    const result = dispatchEmail(key, appt as AppointmentLike, opts);
    if (result.ok) {
      toast.success(isRtl ? `تم تجهيز إيميل للعميل: ${appt.clientName}` : `Email drafted for ${appt.clientName}`, {
        description: isRtl
          ? "تم فتح برنامج البريد لديك مع الرسالة جاهزة للإرسال"
          : "Your mail client opened with the message ready to send",
      });
    } else if (result.reason === "no-recipient") {
      toast.error(isRtl ? "لا يوجد بريد للعميل" : "Client has no email on file");
    }
  };

  const applyStatus = async (
    appt: ApptRow,
    next: StatusValue,
    opts: { rejectionReason?: string; meetingLink?: string; notes?: string } = {},
  ) => {
    try {
      const payload: UpdateAppointmentInput = { status: next as AppointmentStatus };
      if (opts.meetingLink !== undefined) payload.meetingLink = opts.meetingLink;
      if (opts.notes !== undefined) payload.notes = opts.notes;
      const wasApproved = appt.status === "approved";
      await updateAppointment.mutateAsync({ id: appt.id, data: payload });

      if (next === "approved" && !wasApproved) {
        toast.success(
          isRtl
            ? "تم اعتماد الموعد — وأُضيف العميل للعملاء كعميل محتمل"
            : "Appointment approved — client added to Clients as a lead",
        );
        /* New lead may have been auto-created server-side. */
        queryClient.invalidateQueries({ queryKey: getListAdminClientsQueryKey() });
      } else {
        toast.success(ta(`status.${next}`) || next);
      }
      queryClient.invalidateQueries({ queryKey: getListAdminAppointmentsQueryKey() });

      const tplKey = templateForStatus(next as StatusValue);
      if (tplKey) {
        sendEmail({ ...appt, status: next, ...opts } as ApptRow, tplKey, {
          rejectionReason: opts.rejectionReason,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل الحفظ" : "Save failed");
    }
  };

  const saveEdit = async (next: ApptRow, opts?: { sendEmail?: boolean }) => {
    if (!editing) return;
    const original = editing;
    try {
      const payload: UpdateAppointmentInput = {
        scheduledAt: next.scheduledAt,
        lawyerId: next.lawyerId ?? null,
        notes: next.notes ?? null,
        meetingLink: next.meetingLink ?? null,
        status: next.status as AppointmentStatus,
      };
      await updateAppointment.mutateAsync({ id: next.id, data: payload });

      const transitionedToApproved = original.status !== "approved" && next.status === "approved";
      if (transitionedToApproved) {
        toast.success(
          isRtl
            ? "تم حفظ التعديلات — وأُضيف العميل كعميل محتمل"
            : "Saved — client added to Clients as a lead",
        );
        queryClient.invalidateQueries({ queryKey: getListAdminClientsQueryKey() });
      } else {
        toast.success(isRtl ? "تم حفظ التعديلات" : "Changes saved");
      }
      queryClient.invalidateQueries({ queryKey: getListAdminAppointmentsQueryKey() });
      setEditing(null);

      if (opts?.sendEmail) {
        const statusChanged = original.status !== next.status;
        const dateChanged = original.scheduledAt !== next.scheduledAt;
        const tpl = statusChanged
          ? templateForStatus(next.status as StatusValue)
          : dateChanged
            ? "appointmentRescheduled"
            : null;
        if (tpl) sendEmail(next, tpl);
      }
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل الحفظ" : "Save failed");
    }
  };

  /* ──────────────────────────────────────────────
     Render
     ────────────────────────────────────────────── */

  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={ta("appts.title")}
        subtitle={isRtl ? "إدارة حجوزات الاستشارات وإرسال إشعارات للعملاء" : "Manage consultation bookings and notify clients"}
        icon={<CalendarDays className="w-5 h-5" />}
        dir={dir}
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isRtl ? "تحديث" : "Refresh"}
          </Button>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<CalendarClock className="w-4 h-4" />}
          label={isRtl ? "اليوم" : "Today"}
          value={String(stats.todayCount)}
          tone="primary"
        />
        <StatCard
          icon={<Hourglass className="w-4 h-4" />}
          label={isRtl ? "بانتظار الموافقة" : "Pending"}
          value={String(stats.pending)}
          tone="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label={isRtl ? "مؤكدة" : "Approved"}
          value={String(stats.approved)}
          tone="blue"
        />
        <StatCard
          icon={<CheckCircle className="w-4 h-4" />}
          label={isRtl ? "مكتملة" : "Completed"}
          value={String(stats.completed)}
          tone="emerald"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label={isRtl ? "إيراد الأسبوع" : "Week revenue"}
          value={`${stats.weekRevenue.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`}
          tone="violet"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* ── Status pills (quick filter) ── */}
      <div className="flex flex-wrap items-center gap-2">
        <PillButton active={status === "all"} onClick={() => setStatus("all")}>
          {ta("act.all")} <span className="opacity-60 ms-1">{stats.total}</span>
        </PillButton>
        {STATUSES.map((s) => (
          <PillButton key={s} active={status === s} onClick={() => setStatus(s)}>
            {ta(`status.${s}`)}
          </PillButton>
        ))}
      </div>

      <SectionCard>
        <FilterBar>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "ابحث بالاسم أو البريد أو الهاتف…" : "Search by name, email or phone…"}
              className="ps-9 h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل الأنواع" : "All modes"}</SelectItem>
                <SelectItem value="online">{ta("appts.online")}</SelectItem>
                <SelectItem value="in_office">{ta("appts.inOffice")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="from" className="text-xs text-muted-foreground whitespace-nowrap">
              {isRtl ? "من" : "From"}
            </Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-[140px]"
            />
            <Label htmlFor="to" className="text-xs text-muted-foreground whitespace-nowrap">
              {isRtl ? "إلى" : "To"}
            </Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-[140px]"
            />
            {(from || to) && (
              <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => { setFrom(""); setTo(""); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </FilterBar>

        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">{ta("appts.client")}</TableHead>
              <TableHead className="min-w-[180px]">{ta("appts.service")}</TableHead>
              <TableHead className="whitespace-nowrap">{ta("appts.date")}</TableHead>
              <TableHead>{ta("appts.mode")}</TableHead>
              <TableHead className="min-w-[140px]">{ta("appts.payment")}</TableHead>
              <TableHead>{ta("appts.status")}</TableHead>
              <TableHead className="text-end">{ta("act.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={7} />
            ) : rows.length === 0 ? (
              <EmptyState cols={7} message={ta("act.noData")} />
            ) : (
              rows.map((apt) => (
                <TableRow
                  key={apt.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    /** Don't open the drawer when interacting with controls in the row. */
                    if ((e.target as HTMLElement).closest("button, [role='menuitem'], a")) return;
                    setViewing(apt);
                  }}
                >
                  <TableCell>
                    <div className="flex items-start gap-2.5">
                      <Avatar name={apt.clientName} />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{apt.clientName || "—"}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{apt.clientEmail || "—"}</span>
                        </div>
                        {apt.clientPhone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{apt.clientPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium truncate max-w-[220px]">
                      {(isRtl ? apt.serviceNameAr : apt.serviceNameEn) || `#${apt.serviceId}`}
                    </div>
                    {(apt.lawyerNameAr || apt.lawyerNameEn) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[220px]">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span className="truncate">{(isRtl ? apt.lawyerNameAr : apt.lawyerNameEn) || ""}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium text-sm">
                      {format(new Date(apt.scheduledAt), "dd MMM yyyy", { locale: dateLocale })}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(apt.scheduledAt), "h:mm a", { locale: dateLocale })}
                      {apt.durationMinutes ? <span className="opacity-60">· {apt.durationMinutes}{isRtl ? "د" : "m"}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant="outline" className="text-xs gap-1">
                        {apt.mode === "online" ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {apt.mode === "online" ? ta("appts.online") : ta("appts.inOffice")}
                      </Badge>
                      {apt.mode === "online" && apt.status === "approved" && (
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 bg-primary/90 hover:bg-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/admin/appointments/${apt.id}/meeting`);
                          }}
                        >
                          <Video className="w-3 h-3" />
                          {isRtl ? "دخول" : "Join"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {apt.amountEgp ? `${Number(apt.amountEgp).toLocaleString()} ${isRtl ? "ج.م" : "EGP"}` : "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {apt.paymentMethod && <span className="capitalize">{apt.paymentMethod}</span>}
                      {apt.paymentStatus && (
                        <StatusBadge
                          status={apt.paymentStatus}
                          label={ta(`status.${apt.paymentStatus}`) || apt.paymentStatus}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={apt.status} label={ta(`status.${apt.status}`) || apt.status} />
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>{ta("act.actions")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setViewing(apt)}>
                          <Eye className="me-2 h-4 w-4" /> {isRtl ? "عرض التفاصيل" : "View details"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(apt)}>
                          <Pencil className="me-2 h-4 w-4" /> {isRtl ? "تعديل الموعد" : "Edit appointment"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {apt.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => setConfirming({ appt: apt, action: "approve" })}>
                              <Check className="me-2 h-4 w-4 text-emerald-600" /> {ta("act.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirming({ appt: apt, action: "reject" })}>
                              <X className="me-2 h-4 w-4 text-rose-600" /> {ta("act.reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                        {apt.status === "approved" && (
                          <DropdownMenuItem onClick={() => setConfirming({ appt: apt, action: "complete" })}>
                            <CheckCircle className="me-2 h-4 w-4 text-blue-600" /> {ta("act.complete")}
                          </DropdownMenuItem>
                        )}
                        {apt.status !== "cancelled" && apt.status !== "completed" && (
                          <DropdownMenuItem onClick={() => setConfirming({ appt: apt, action: "cancel" })}>
                            <XCircle className="me-2 h-4 w-4 text-gray-500" />
                            {ta("status.cancelled")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            const tpl = templateForStatus(apt.status as StatusValue) || "appointmentReminder";
                            sendEmail(apt, tpl);
                          }}
                        >
                          <Send className="me-2 h-4 w-4" />
                          {isRtl ? "إرسال إيميل للعميل" : "Email the client"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* ── View details drawer ── */}
      <DetailsDrawer
        appt={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => {
          if (viewing) {
            setEditing(viewing);
            setViewing(null);
          }
        }}
        onEmail={(key) => viewing && sendEmail(viewing, key)}
        isRtl={isRtl}
        dateLocale={dateLocale}
        ta={ta}
      />

      {/* ── Edit dialog ── */}
      <EditDialog
        appt={editing}
        lawyers={lawyers ?? []}
        isRtl={isRtl}
        ta={ta}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      />

      {/* ── Confirm action dialog ── */}
      <ConfirmActionDialog
        confirming={confirming}
        isRtl={isRtl}
        ta={ta}
        onClose={() => setConfirming(null)}
        onConfirm={async (extra) => {
          if (!confirming) return;
          const map: Record<typeof confirming.action, StatusValue> = {
            approve: "approved",
            reject: "rejected",
            complete: "completed",
            cancel: "cancelled",
          };
          await applyStatus(confirming.appt, map[confirming.action], extra);
          setConfirming(null);
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  tone = "primary",
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "primary" | "amber" | "blue" | "emerald" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <div className={`rounded-xl border border-border/60 bg-card p-3.5 flex items-center gap-3 ${className}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-lg font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
      }`}
    >
      {children}
    </button>
  );
}

function Avatar({ name }: { name?: string | null }) {
  const initials = (name || "??")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
      {initials || "??"}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Details drawer (right-side sheet)
   ────────────────────────────────────────────── */

function DetailsDrawer({
  appt,
  onClose,
  onEdit,
  onEmail,
  isRtl,
  dateLocale,
  ta,
}: {
  appt: ApptRow | null;
  onClose: () => void;
  onEdit: () => void;
  onEmail: (key: EmailTemplateKey) => void;
  isRtl: boolean;
  dateLocale: typeof ar;
  ta: (k: string) => string;
}) {
  const dir = isRtl ? "rtl" : "ltr";
  return (
    <Sheet open={!!appt} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side={isRtl ? "left" : "right"}
        className="w-full sm:max-w-xl overflow-y-auto"
      >
        {appt && (
          <div dir={dir} className="space-y-5">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                {isRtl ? `موعد #${appt.id}` : `Appointment #${appt.id}`}
              </SheetTitle>
              <SheetDescription>
                {format(new Date(appt.scheduledAt), "EEEE dd MMMM yyyy · h:mm a", { locale: dateLocale })}
              </SheetDescription>
              <div className="flex items-center gap-2 pt-1">
                <StatusBadge status={appt.status} label={ta(`status.${appt.status}`) || appt.status} />
                <Badge variant="outline" className="gap-1">
                  {appt.mode === "online" ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                  {appt.mode === "online" ? ta("appts.online") : ta("appts.inOffice")}
                </Badge>
                {appt.language && (
                  <Badge variant="outline" className="text-[10px] uppercase">{appt.language}</Badge>
                )}
              </div>
            </SheetHeader>

            <Section title={isRtl ? "العميل" : "Client"} icon={<User className="w-4 h-4" />}>
              <Field label={ta("clients.name")} value={appt.clientName} />
              <Field
                label={ta("clients.email")}
                value={
                  appt.clientEmail ? (
                    <a className="text-primary hover:underline" href={`mailto:${appt.clientEmail}`} dir="ltr">
                      {appt.clientEmail}
                    </a>
                  ) : "—"
                }
              />
              <Field
                label={ta("clients.phone")}
                value={
                  appt.clientPhone ? (
                    <a className="text-primary hover:underline" href={`tel:${appt.clientPhone}`} dir="ltr">
                      {appt.clientPhone}
                    </a>
                  ) : "—"
                }
              />
              {appt.clientPhone && (
                <Field
                  label="WhatsApp"
                  value={
                    <a
                      className="text-primary hover:underline"
                      href={`https://wa.me/${appt.clientPhone.replace(/[^\d+]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                    >
                      {isRtl ? "محادثة واتساب" : "Open chat"}
                    </a>
                  }
                />
              )}
            </Section>

            <Section title={isRtl ? "الخدمة" : "Service"} icon={<Briefcase className="w-4 h-4" />}>
              <Field
                label={ta("appts.service")}
                value={(isRtl ? appt.serviceNameAr : appt.serviceNameEn) || `#${appt.serviceId}`}
              />
              <Field
                label={isRtl ? "المحامي" : "Lawyer"}
                value={(isRtl ? appt.lawyerNameAr : appt.lawyerNameEn) || (isRtl ? "غير محدد" : "Unassigned")}
              />
              <Field
                label={isRtl ? "المدة" : "Duration"}
                value={appt.durationMinutes ? `${appt.durationMinutes} ${isRtl ? "دقيقة" : "min"}` : "—"}
              />
            </Section>

            <Section title={isRtl ? "الموعد" : "Schedule"} icon={<CalendarIcon className="w-4 h-4" />}>
              <Field
                label={ta("appts.date")}
                value={format(new Date(appt.scheduledAt), "EEEE dd MMM yyyy", { locale: dateLocale })}
              />
              <Field
                label={ta("appts.time")}
                value={format(new Date(appt.scheduledAt), "h:mm a", { locale: dateLocale })}
              />
              {appt.meetingLink && (
                <Field
                  label={isRtl ? "رابط الاجتماع" : "Meeting link"}
                  value={
                    <a className="text-primary hover:underline break-all" href={appt.meetingLink} target="_blank" rel="noreferrer" dir="ltr">
                      <LinkIcon className="w-3 h-3 inline me-1" />
                      {appt.meetingLink}
                    </a>
                  }
                />
              )}
            </Section>

            <Section title={isRtl ? "الدفع" : "Payment"} icon={<Banknote className="w-4 h-4" />}>
              <Field
                label={isRtl ? "المبلغ" : "Amount"}
                value={appt.amountEgp ? `${Number(appt.amountEgp).toLocaleString()} ${isRtl ? "ج.م" : "EGP"}` : "—"}
              />
              <Field label={ta("appts.payment")} value={appt.paymentMethod || "—"} />
              <Field
                label={isRtl ? "حالة الدفع" : "Payment status"}
                value={appt.paymentStatus
                  ? <StatusBadge status={appt.paymentStatus} label={ta(`status.${appt.paymentStatus}`) || appt.paymentStatus} />
                  : "—"}
              />
              {appt.paymentReference && (
                <Field label={isRtl ? "مرجع الدفع" : "Payment ref."} value={<code className="text-xs">{appt.paymentReference}</code>} />
              )}
            </Section>

            {appt.notes && (
              <Section title={isRtl ? "ملاحظات العميل" : "Client notes"} icon={<StickyNote className="w-4 h-4" />}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/40">
                  {appt.notes}
                </p>
              </Section>
            )}

            {appt.createdAt && (
              <p className="text-[11px] text-muted-foreground">
                {isRtl ? "تم الحجز في" : "Booked at"}{" "}
                {format(new Date(appt.createdAt), "dd MMM yyyy · h:mm a", { locale: dateLocale })}
              </p>
            )}

            <Separator />

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={onEdit} className="gap-2">
                <Pencil className="w-4 h-4" />
                {isRtl ? "تعديل" : "Edit"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const tpl = templateForStatus(appt.status as StatusValue) || "appointmentReminder";
                  onEmail(tpl);
                }}
              >
                <Mail className="w-4 h-4" />
                {isRtl ? "إيميل تأكيد" : "Confirmation email"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => onEmail("appointmentReminder")}
              >
                <Send className="w-4 h-4" />
                {isRtl ? "إيميل تذكير" : "Reminder email"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  icon,
  children,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary/70">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <div className="flex-1 h-px bg-border/60 ms-1" />
      </div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2">
      <div className="text-xs text-muted-foreground pt-0.5">{label}</div>
      <div className="text-sm font-medium break-words">{value}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Edit dialog
   ────────────────────────────────────────────── */

function EditDialog({
  appt,
  lawyers,
  isRtl,
  ta,
  onClose,
  onSave,
}: {
  appt: ApptRow | null;
  lawyers: { id: number; nameAr: string; nameEn: string }[];
  isRtl: boolean;
  ta: (k: string) => string;
  onClose: () => void;
  onSave: (next: ApptRow, opts?: { sendEmail?: boolean }) => void;
}) {
  const [draft, setDraft] = useState<ApptRow | null>(null);
  const [notify, setNotify] = useState(true);

  /** Sync draft when a new appointment opens. */
  useMemoSync(appt, setDraft, setNotify);

  const dir = isRtl ? "rtl" : "ltr";

  if (!draft) return null;

  // Convert ISO → datetime-local (YYYY-MM-DDTHH:mm)
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const fromLocalInput = (v: string) => new Date(v).toISOString();

  return (
    <Dialog open={!!appt} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            {isRtl ? `تعديل الموعد #${draft.id}` : `Edit appointment #${draft.id}`}
          </DialogTitle>
          <DialogDescription>
            {draft.clientName} · {draft.clientEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">{isRtl ? "التاريخ والوقت" : "Date & time"}</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(draft.scheduledAt)}
              onChange={(e) => setDraft({ ...draft, scheduledAt: fromLocalInput(e.target.value) })}
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs">{isRtl ? "المحامي المسؤول" : "Assigned lawyer"}</Label>
            <Select
              value={draft.lawyerId ? String(draft.lawyerId) : "none"}
              onValueChange={(v) => setDraft({ ...draft, lawyerId: v === "none" ? null : Number(v) })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isRtl ? "غير محدد" : "Unassigned"}</SelectItem>
                {lawyers.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {isRtl ? l.nameAr : l.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">{ta("appts.status")}</Label>
            <Select
              value={draft.status as string}
              onValueChange={(v) => setDraft({ ...draft, status: v })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{ta(`status.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs">{isRtl ? "رابط الاجتماع (للجلسات أونلاين)" : "Meeting link (online)"}</Label>
            <Input
              dir="ltr"
              value={draft.meetingLink ?? ""}
              onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value || null })}
              placeholder="https://meet.…"
              className="h-9"
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs">{ta("appts.notes")}</Label>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/40 mt-1">
          <input
            id="notify"
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="rounded border-border"
          />
          <Label htmlFor="notify" className="text-xs cursor-pointer flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-primary" />
            {isRtl ? "أرسل إيميل للعميل بالتغييرات" : "Send the client an email about the changes"}
          </Label>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={() => onSave(draft, { sendEmail: notify })}>
            {isRtl ? "حفظ التغييرات" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small effect helper: re-init the draft whenever the source appointment changes. */
function useMemoSync(
  appt: ApptRow | null,
  setDraft: (v: ApptRow | null) => void,
  setNotify: (v: boolean) => void,
) {
  useEffect(() => {
    setDraft(appt ? { ...appt } : null);
    setNotify(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.id]);
}

/* ──────────────────────────────────────────────
   Confirm action dialog (with optional reason / link)
   ────────────────────────────────────────────── */

function ConfirmActionDialog({
  confirming,
  isRtl,
  ta,
  onClose,
  onConfirm,
}: {
  confirming: { appt: ApptRow; action: "approve" | "reject" | "complete" | "cancel" } | null;
  isRtl: boolean;
  ta: (k: string) => string;
  onClose: () => void;
  onConfirm: (extra: { rejectionReason?: string; meetingLink?: string; notes?: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  /** Reset fields whenever a new action is opened. */
  useMemoSyncReset(confirming, () => {
    setReason("");
    setMeetingLink(confirming?.appt.meetingLink ?? "");
    setNotes("");
    setBusy(false);
  });

  if (!confirming) return null;

  const { appt, action } = confirming;
  const dir = isRtl ? "rtl" : "ltr";

  const META = {
    approve: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      titleAr: "تأكيد الموعد",
      titleEn: "Approve appointment",
      descAr: "سيتم تحويل حالة الموعد إلى مؤكد، وسيُرسل إيميل تأكيد للعميل.",
      descEn: "The appointment will be marked approved and a confirmation email will be drafted for the client.",
      cta: ta("act.approve"),
    },
    reject: {
      icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
      titleAr: "رفض الموعد",
      titleEn: "Reject appointment",
      descAr: "سيُسجَّل سبب الرفض ويُرسل اعتذار للعميل عبر البريد.",
      descEn: "The reason will be saved and a polite decline email will be drafted for the client.",
      cta: ta("act.reject"),
    },
    complete: {
      icon: <CheckCircle className="w-4 h-4 text-blue-600" />,
      titleAr: "إتمام الموعد",
      titleEn: "Mark as completed",
      descAr: "سيتم وضع علامة الإتمام وإرسال إيميل شكر للعميل.",
      descEn: "The appointment will be marked completed and a thank-you email will be drafted.",
      cta: ta("act.complete"),
    },
    cancel: {
      icon: <XCircle className="w-4 h-4 text-gray-500" />,
      titleAr: "إلغاء الموعد",
      titleEn: "Cancel appointment",
      descAr: "سيتم إلغاء الموعد وإبلاغ العميل بالبريد.",
      descEn: "The appointment will be cancelled and the client will be emailed.",
      cta: ta("status.cancelled"),
    },
  } as const;

  const meta = META[action];

  return (
    <Dialog open={!!confirming} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.icon}
            {isRtl ? meta.titleAr : meta.titleEn}
          </DialogTitle>
          <DialogDescription>
            {appt.clientName} — {format(new Date(appt.scheduledAt), "dd MMM yyyy · h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{isRtl ? meta.descAr : meta.descEn}</p>

        {action === "approve" && (
          <div className="space-y-1.5">
            <Label className="text-xs">{isRtl ? "رابط الاجتماع (اختياري)" : "Meeting link (optional)"}</Label>
            <Input
              dir="ltr"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.…"
              className="h-9"
            />
          </div>
        )}

        {action === "reject" && (
          <div className="space-y-1.5">
            <Label className="text-xs">{isRtl ? "سبب الرفض (سيُرسل للعميل)" : "Rejection reason (sent to client)"}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isRtl ? "مثلاً: عدم توفر المحامي في هذا الموعد." : "e.g. The lawyer is unavailable on that date."}
              className="min-h-[80px]"
            />
          </div>
        )}

        {action === "cancel" && (
          <div className="space-y-1.5">
            <Label className="text-xs">{isRtl ? "ملاحظة داخلية (اختياري)" : "Internal note (optional)"}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button
            onClick={async () => {
              setBusy(true);
              await onConfirm({
                rejectionReason: action === "reject" ? reason : undefined,
                meetingLink: action === "approve" ? (meetingLink || undefined) : undefined,
                notes: action === "cancel" ? (notes || undefined) : undefined,
              });
              setBusy(false);
            }}
            disabled={busy}
          >
            {busy ? (isRtl ? "جارٍ الحفظ…" : "Saving…") : meta.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useMemoSyncReset(
  trigger: unknown,
  reset: () => void,
) {
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}
