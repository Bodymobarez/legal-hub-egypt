import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  useListAdminContactInquiries,
  useMarkContactInquiryHandled,
  useListAdminLawyers,
  getListAdminContactInquiriesQueryKey,
  ContactInquiryStatus,
  useAdminMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { resolvePermissions, loadUsers } from "@/lib/permissions";
import {
  CheckCircle2, FileQuestion, Filter, Search,
  Mail, Phone, Clock, User, Scale, MessageSquare,
  AlertCircle, Inbox, MoreHorizontal, UserCheck,
  Send, Reply, StickyNote, ChevronDown,
  Star, Trash2, RefreshCw, Archive,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader, SkeletonRows, EmptyState, SectionCard, AdminDialog, TwoLineCell,
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Follow-up note stored locally per inquiry ─── */
const STORAGE_KEY = "inquiry_followups";
type FollowUp = {
  inquiryId: number;
  lawyerId: number | null;
  lawyerName: string;
  note: string;
  handledAt: string | null;
  priority: "normal" | "high" | "urgent";
};
function loadFollowUps(): Record<number, FollowUp> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveFollowUp(f: FollowUp) {
  const all = loadFollowUps();
  all[f.inquiryId] = f;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/* ─── Status config ─── */
const STATUS_CFG: Record<string, { bg: string; color: string; labelAr: string; labelEn: string }> = {
  new:     { bg: "bg-blue-50 border-blue-200",    color: "text-blue-700",    labelAr: "جديد",    labelEn: "New" },
  handled: { bg: "bg-emerald-50 border-emerald-200", color: "text-emerald-700", labelAr: "معالج",   labelEn: "Handled" },
  spam:    { bg: "bg-gray-100 border-gray-200",   color: "text-gray-500",    labelAr: "سبام",    labelEn: "Spam" },
};

const PRIORITY_CFG: Record<string, { bg: string; color: string; labelAr: string; labelEn: string }> = {
  normal: { bg: "bg-gray-50 border-gray-200",   color: "text-gray-600",  labelAr: "عادي",  labelEn: "Normal" },
  high:   { bg: "bg-amber-50 border-amber-200", color: "text-amber-700", labelAr: "مهم",   labelEn: "High" },
  urgent: { bg: "bg-red-50 border-red-200",     color: "text-red-700",   labelAr: "عاجل",  labelEn: "Urgent" },
};

/* ═══════════════════════════════════════════ */

export default function AdminInquiries() {
  const { ta, isRtl } = useAdminI18n();
  const qc = useQueryClient();
  const dir = isRtl ? "rtl" : "ltr";

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q,            setQ]            = useState("");
  const [selected,     setSelected]     = useState<any>(null);
  const [followUps,    setFollowUps]    = useState<Record<number, FollowUp>>(loadFollowUps);

  /* Draft follow-up state for the open dialog */
  const [fLawyerId,  setFLawyerId]  = useState<number | null>(null);
  const [fNote,      setFNote]      = useState("");
  const [fPriority,  setFPriority]  = useState<"normal" | "high" | "urgent">("normal");

  /* Current user + permissions */
  const { data: currentUser } = useAdminMe({ query: { queryKey: [] as const } as any });
  const perms = currentUser ? resolvePermissions(currentUser.email, currentUser.role) : null;
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  /* Find my linked lawyer ID if I'm a lawyer */
  const allUserRecords = loadUsers();
  const myRecord = allUserRecords.find(u => u.email.toLowerCase() === (currentUser?.email ?? "").toLowerCase());
  const myLinkedLawyerId = myRecord?.linkedLawyerId ?? null;

  /* Load existing follow-up when inquiry opens */
  useEffect(() => {
    if (!selected) return;
    const existing = followUps[selected.id];
    setFLawyerId(existing?.lawyerId ?? null);
    setFNote(existing?.note ?? "");
    setFPriority(existing?.priority ?? "normal");
  }, [selected?.id]);

  /* ── API hooks ── */
  const { data: rawInquiries, isLoading } = useListAdminContactInquiries(
    statusFilter !== "all" ? { status: statusFilter as ContactInquiryStatus } : {}
  );
  const { data: lawyersRaw } = useListAdminLawyers();

  const markHandled = useMarkContactInquiryHandled();

  const inquiries = Array.isArray(rawInquiries) ? rawInquiries
    : (rawInquiries as any)?.data ?? (rawInquiries as any)?.items ?? [];
  const lawyers = Array.isArray(lawyersRaw) ? lawyersRaw
    : (lawyersRaw as any)?.data ?? (lawyersRaw as any)?.items ?? [];

  /**
   * Visibility rules for inquiries:
   * - New (unhandled, unassigned) inquiries → ALL lawyers can see them
   * - Handled / assigned inquiries → only admin OR the assigned lawyer can see them
   */
  const visibleInquiries = (() => {
    if (isAdmin) return inquiries; // admins see everything
    if (!currentUser) return [];
    return inquiries.filter((inq: any) => {
      const fu = followUps[inq.id];
      const isNew = inq.status === "new" && !fu?.lawyerId;
      if (isNew) return true; // all lawyers see new unassigned inquiries
      // assigned/handled: only the assigned lawyer
      if (fu?.lawyerId && myLinkedLawyerId && fu.lawyerId === myLinkedLawyerId) return true;
      return false;
    });
  })();

  /* Filter by search */
  const filtered = q.trim()
    ? visibleInquiries.filter((i: any) =>
        [i.fullName, i.email, i.subject, i.phone].some((f: any) =>
          f?.toLowerCase().includes(q.toLowerCase())
        )
      )
    : visibleInquiries;

  /* KPIs (from visible set) */
  const kpiNew     = visibleInquiries.filter((i: any) => i.status === "new").length;
  const kpiHandled = visibleInquiries.filter((i: any) => i.status === "handled").length;
  const kpiTotal   = visibleInquiries.length;

  /* ── Mark as handled ── */
  const handleMarkHandled = async () => {
    if (!selected) return;
    try {
      await markHandled.mutateAsync({ id: selected.id });
      qc.invalidateQueries({ queryKey: getListAdminContactInquiriesQueryKey() });
      toast.success(isRtl ? "تم تحديد الاستفسار كمعالج" : "Inquiry marked as handled");
      saveFollowUp({
        inquiryId: selected.id,
        lawyerId: fLawyerId,
        lawyerName: lawyers.find((l: any) => l.id === fLawyerId)?.[isRtl ? "nameAr" : "nameEn"] ?? "",
        note: fNote,
        handledAt: new Date().toISOString(),
        priority: fPriority,
      });
      setFollowUps(loadFollowUps());
      setSelected(null);
    } catch {
      toast.error(isRtl ? "فشل تحديث الحالة" : "Failed to update");
    }
  };

  /* ── Save follow-up without marking handled ── */
  const saveFollowUpOnly = () => {
    if (!selected) return;
    saveFollowUp({
      inquiryId: selected.id,
      lawyerId: fLawyerId,
      lawyerName: lawyers.find((l: any) => l.id === fLawyerId)?.[isRtl ? "nameAr" : "nameEn"] ?? "",
      note: fNote,
      handledAt: followUps[selected.id]?.handledAt ?? null,
      priority: fPriority,
    });
    setFollowUps(loadFollowUps());
    toast.success(isRtl ? "تم حفظ المتابعة" : "Follow-up saved");
  };

  /* ── Status badge ── */
  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.new;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.color}`}>
        {isRtl ? cfg.labelAr : cfg.labelEn}
      </span>
    );
  };

  /* ── Priority badge ── */
  const PriorityBadge = ({ p }: { p: string }) => {
    const cfg = PRIORITY_CFG[p] ?? PRIORITY_CFG.normal;
    if (p === "normal") return null;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.bg} ${cfg.color}`}>
        {isRtl ? cfg.labelAr : cfg.labelEn}
      </span>
    );
  };

  const FILTER_TABS = [
    { id: "all",     ar: "الكل",   en: "All" },
    { id: "new",     ar: "جديد",   en: "New" },
    { id: "handled", ar: "معالج",  en: "Handled" },
    { id: "spam",    ar: "سبام",   en: "Spam" },
  ];

  return (
    <div dir={dir} className="space-y-5">
      <PageHeader
        title={isRtl ? "الاستفسارات" : "Contact Inquiries"}
        subtitle={isRtl ? "متابعة ومعالجة الاستفسارات الواردة" : "Track and handle incoming contact form submissions"}
        icon={<FileQuestion className="w-5 h-5" />}
        dir={dir}
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isRtl ? "إجمالي الاستفسارات" : "Total",    value: kpiTotal,   icon: Inbox,        color: "text-primary",    bg: "bg-primary/8" },
          { label: isRtl ? "جديدة بانتظار الرد" : "Awaiting", value: kpiNew,     icon: AlertCircle,  color: "text-blue-600",   bg: "bg-blue-50" },
          { label: isRtl ? "تمت معالجتها" : "Handled",        value: kpiHandled, icon: CheckCircle2, color: "text-emerald-600",bg: "bg-emerald-50" },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-none">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-none">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute inset-s-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            dir={dir}
            placeholder={isRtl ? "بحث في الاستفسارات…" : "Search inquiries…"}
            value={q}
            onChange={e => setQ(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`h-8 px-3 rounded-full text-xs font-medium border transition-all ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {isRtl ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <SectionCard>
        <div className="overflow-auto">
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">{isRtl ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRtl ? "المُرسِل" : "Sender"}</TableHead>
                <TableHead>{isRtl ? "الموضوع" : "Subject"}</TableHead>
                <TableHead className="hidden md:table-cell">{isRtl ? "المسؤول" : "Assigned To"}</TableHead>
                <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <SkeletonRows cols={6} rows={5} />}
              {!isLoading && filtered.length === 0 && (
                <EmptyState cols={6} message={isRtl ? "لا توجد استفسارات" : "No inquiries found"} icon={<Inbox className="w-7 h-7" />} />
              )}
              {filtered.map((inq: any) => {
                const fu = followUps[inq.id];
                return (
                  <TableRow
                    key={inq.id}
                    className={`cursor-pointer hover:bg-muted/40 ${inq.status === "new" ? "bg-blue-50/40" : ""}`}
                    onClick={() => setSelected(inq)}
                  >
                    {/* Date */}
                    <TableCell className="text-start!">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium">{format(new Date(inq.createdAt), "d MMM yyyy")}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(inq.createdAt), "h:mm a")}</span>
                      </div>
                    </TableCell>

                    {/* Sender */}
                    <TableCell className="text-start!">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8 border border-border shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {inq.fullName?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{inq.fullName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{inq.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Subject */}
                    <TableCell className="text-start!">
                      <div className="max-w-[200px]">
                        <p className="text-sm truncate font-medium">{inq.subject}</p>
                        {fu?.priority && fu.priority !== "normal" && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_CFG[fu.priority].bg} ${PRIORITY_CFG[fu.priority].color}`}>
                            {isRtl ? PRIORITY_CFG[fu.priority].labelAr : PRIORITY_CFG[fu.priority].labelEn}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Assigned lawyer */}
                    <TableCell className="hidden md:table-cell">
                      {fu?.lawyerName ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Scale className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate max-w-[110px]">{fu.lawyerName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">{isRtl ? "غير محدد" : "Unassigned"}</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={inq.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-end!" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRtl ? "start" : "end"}>
                          <DropdownMenuItem onClick={() => setSelected(inq)}>
                            <MessageSquare className="w-3.5 h-3.5 me-2" />
                            {isRtl ? "عرض وتتبع" : "View & Track"}
                          </DropdownMenuItem>
                          {inq.status === "new" && (
                            <DropdownMenuItem onClick={async () => {
                              try {
                                await markHandled.mutateAsync({ id: inq.id });
                                qc.invalidateQueries({ queryKey: getListAdminContactInquiriesQueryKey() });
                                toast.success(isRtl ? "تم تحديده كمعالج" : "Marked as handled");
                              } catch { toast.error("Failed"); }
                            }}>
                              <CheckCircle2 className="w-3.5 h-3.5 me-2 text-emerald-600" />
                              {isRtl ? "تحديد كمعالج سريعاً" : "Quick mark handled"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════
          INQUIRY DETAIL + FOLLOW-UP DIALOG
         ══════════════════════════════════════ */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="overflow-hidden p-0 gap-0 max-w-2xl" dir={dir}>
          {selected && (
            <AdminDialog
              title={isRtl ? `استفسار من ${selected.fullName}` : `Inquiry from ${selected.fullName}`}
              subtitle={format(new Date(selected.createdAt), "d MMMM yyyy · h:mm a")}
              icon={<MessageSquare className="w-4 h-4" />}
              footer={
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                    {isRtl ? "إغلاق" : "Close"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={saveFollowUpOnly} className="gap-2">
                    <StickyNote className="w-3.5 h-3.5" />
                    {isRtl ? "حفظ المتابعة" : "Save Follow-up"}
                  </Button>
                  {selected.status === "new" && (
                    <Button size="sm" onClick={handleMarkHandled} disabled={markHandled.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {markHandled.isPending ? (isRtl ? "جارٍ…" : "Saving…") : (isRtl ? "تحديد كمعالج وحفظ" : "Mark Handled & Save")}
                    </Button>
                  )}
                </div>
              }
            >
              <div className="p-5 space-y-5">

                {/* ── Sender info strip ── */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <Avatar className="w-12 h-12 border-2 border-border shrink-0">
                    <AvatarFallback className="text-base font-bold bg-primary/15 text-primary">
                      {selected.fullName?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold text-base leading-tight">{selected.fullName}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selected.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{selected.phone}</span></span>
                    </div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                {/* ── Message ── */}
                <div className="rounded-xl border border-border/60 p-4 bg-card">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{isRtl ? "الموضوع" : "Subject"}</p>
                  <p className="font-semibold text-sm mb-3">{selected.subject}</p>
                  <Separator className="mb-3" />
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{isRtl ? "نص الرسالة" : "Message"}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">{selected.message}</p>
                </div>

                {/* ── Follow-up Panel ── */}
                <div className="rounded-xl border border-primary/20 bg-primary/3 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <UserCheck className="w-4 h-4" />
                    {isRtl ? "تتبع ومتابعة الاستفسار" : "Inquiry Tracking & Follow-up"}
                  </div>

                  {/* Assign lawyer */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">
                      {isRtl ? "تعيين المحامي المسؤول عن الاستفسار" : "Assign responsible lawyer"}
                    </label>
                    <Select
                      value={fLawyerId !== null ? String(fLawyerId) : "__none__"}
                      onValueChange={v => setFLawyerId(v === "__none__" ? null : Number(v))}
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder={isRtl ? "اختر المحامي المسؤول…" : "Select responsible lawyer…"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">{isRtl ? "غير محدد" : "Unassigned"}</span>
                        </SelectItem>
                        {lawyers.map((l: any) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            <div className="flex items-center gap-2">
                              <Scale className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                              <span>{isRtl ? l.nameAr : l.nameEn}</span>
                              <span className="text-xs text-muted-foreground ms-1">{isRtl ? l.titleAr : l.titleEn}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fLawyerId && (
                      <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {isRtl
                          ? `سيتم تعيين الاستفسار إلى ${lawyers.find((l: any) => l.id === fLawyerId)?.[isRtl ? "nameAr" : "nameEn"]}`
                          : `Assigned to ${lawyers.find((l: any) => l.id === fLawyerId)?.nameEn}`
                        }
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">
                      {isRtl ? "مستوى الأولوية" : "Priority Level"}
                    </label>
                    <div className="flex gap-2">
                      {(["normal", "high", "urgent"] as const).map(p => {
                        const cfg = PRIORITY_CFG[p];
                        return (
                          <button
                            key={p}
                            onClick={() => setFPriority(p)}
                            className={`flex-1 h-9 rounded-lg border text-xs font-medium transition-all ${
                              fPriority === p
                                ? `${cfg.bg} ${cfg.color} border-current shadow-sm`
                                : "bg-card text-muted-foreground border-border hover:border-primary/40"
                            }`}
                          >
                            {isRtl ? cfg.labelAr : cfg.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">
                      {isRtl ? "ملاحظات المتابعة الداخلية" : "Internal follow-up notes"}
                    </label>
                    <Textarea
                      dir={dir}
                      value={fNote}
                      onChange={e => setFNote(e.target.value)}
                      rows={3}
                      placeholder={isRtl ? "أضف ملاحظات للمتابعة الداخلية…" : "Add internal follow-up notes…"}
                      className="resize-none text-sm"
                    />
                  </div>

                  {/* Existing follow-up summary */}
                  {followUps[selected.id]?.handledAt && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {isRtl
                        ? `تمت المعالجة في ${format(new Date(followUps[selected.id].handledAt!), "d MMM yyyy · h:mm a")}`
                        : `Handled on ${format(new Date(followUps[selected.id].handledAt!), "d MMM yyyy · h:mm a")}`
                      }
                    </div>
                  )}
                </div>

                {/* Quick reply link */}
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Reply className="w-4 h-4" />
                  {isRtl ? "رد عبر البريد الإلكتروني" : "Reply via Email"}
                </a>
              </div>
            </AdminDialog>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
