import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  useGetAdminClient,
  useUpdateAdminClient,
  useDeleteAdminClient,
  useListAdminInvoices,
  useListAdminAppointments,
  getGetAdminClientQueryKey,
  UpdateClientInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, IdCard, FileText,
  Briefcase, CalendarDays, CreditCard, MessageSquare,
  UserCheck, UserPlus, UserMinus, Archive,
  CheckCircle2, Clock, XCircle, Circle,
  TrendingUp, DollarSign, Activity, Star,
  MoreHorizontal, ExternalLink,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { AdminDialog, PageHeader, SkeletonRows, EmptyState } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ─── Status config ─── */
type Status = "lead" | "active" | "inactive" | "archived";
const STATUS_META: Record<Status, { labelAr: string; labelEn: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  lead:     { labelAr: "عميل محتمل",   labelEn: "Lead",     color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",       icon: UserPlus   },
  active:   { labelAr: "موكّل نشط",     labelEn: "Active Client", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: UserCheck  },
  inactive: { labelAr: "موكّل غير نشط", labelEn: "Inactive", color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     icon: UserMinus  },
  archived: { labelAr: "مؤرشف",         labelEn: "Archived", color: "text-gray-500",    bg: "bg-gray-50 border-gray-200",       icon: Archive    },
};

function ClientStatusBadge({ status, isRtl }: { status: Status; isRtl: boolean }) {
  const m = STATUS_META[status] ?? STATUS_META.lead;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${m.color} ${m.bg}`}>
      <Icon className="w-3.5 h-3.5" />{isRtl ? m.labelAr : m.labelEn}
    </span>
  );
}

/* ─── Invoice status helpers ─── */
function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] ?? "bg-gray-100 text-gray-500"}`}>{status}</span>;
}

function ApptBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending:  "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    completed:"bg-blue-50 text-blue-700 border-blue-200",
    cancelled:"bg-gray-100 text-gray-500 border-gray-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] ?? "bg-gray-100 text-gray-500"}`}>{status}</span>;
}

/* ─── Form schema ─── */
const formSchema = z.object({
  fullName:   z.string().min(1),
  email:      z.string().email(),
  phone:      z.string().min(1),
  nationalId: z.string().optional(),
  address:    z.string().optional(),
  city:       z.string().optional(),
  status:     z.nativeEnum(UpdateClientInputStatus),
  source:     z.string().optional(),
  notes:      z.string().optional(),
});

/* ═════════════════════════════════════════ */

export default function AdminClientDetail() {
  const [, setLocation] = useLocation();
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const qc = useQueryClient();
  const { isRtl } = useAdminI18n();
  const dir = isRtl ? "rtl" : "ltr";

  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  /* ── Data ── */
  const { data: wrapper, isLoading } = useGetAdminClient(id);
  const { data: invoicesRaw } = useListAdminInvoices({ clientId: id });
  const { data: apptsRaw }    = useListAdminAppointments({});

  const client   = (wrapper as any)?.client ?? (wrapper as any);
  const cases    = (wrapper as any)?.cases   ?? [];
  const invoices = Array.isArray(invoicesRaw) ? invoicesRaw
    : (invoicesRaw as any)?.data ?? (invoicesRaw as any)?.items ?? [];
  const allAppts = Array.isArray(apptsRaw) ? apptsRaw
    : (apptsRaw as any)?.data ?? (apptsRaw as any)?.items ?? [];

  /* Filter appointments by clientEmail (no clientId param available) */
  const appts = client?.email
    ? allAppts.filter((a: any) => a.clientEmail === client.email)
    : [];

  const updateClient = useUpdateAdminClient();
  const deleteClient = useDeleteAdminClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { fullName: "", email: "", phone: "", nationalId: "", address: "", city: "", status: UpdateClientInputStatus.lead, source: "", notes: "" },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        fullName:   client.fullName ?? "",
        email:      client.email ?? "",
        phone:      client.phone ?? "",
        nationalId: client.nationalId ?? "",
        address:    client.address ?? "",
        city:       client.city ?? "",
        status:     client.status as UpdateClientInputStatus,
        source:     client.source ?? "",
        notes:      client.notes ?? "",
      });
    }
  }, [client]);

  const onEdit = async (v: z.infer<typeof formSchema>) => {
    try {
      await updateClient.mutateAsync({ id, data: v });
      qc.invalidateQueries({ queryKey: getGetAdminClientQueryKey(id) });
      toast.success(isRtl ? "تم تحديث البيانات" : "Client updated");
      setEditOpen(false);
    } catch { toast.error(isRtl ? "حدث خطأ" : "Error"); }
  };

  const onDelete = async () => {
    try {
      await deleteClient.mutateAsync({ id });
      toast.success(isRtl ? "تم حذف العميل" : "Client deleted");
      setLocation("/admin/clients");
    } catch { toast.error(isRtl ? "فشل الحذف" : "Delete failed"); }
  };

  /* Quick convert to active */
  const convertToActive = async () => {
    try {
      await updateClient.mutateAsync({ id, data: { status: UpdateClientInputStatus.active } });
      qc.invalidateQueries({ queryKey: getGetAdminClientQueryKey(id) });
      toast.success(isRtl ? "تم تحويله إلى موكّل نشط" : "Converted to active client");
    } catch { toast.error(isRtl ? "فشل التحويل" : "Failed"); }
  };

  /* KPIs */
  const totalBilled = invoices.reduce((s: number, inv: any) => s + (inv.total ?? 0), 0);
  const paidInvoices = invoices.filter((inv: any) => inv.status === "paid").length;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div dir={dir} className="space-y-5">
        <div className="h-8 w-40 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-48 rounded-2xl bg-muted/30 animate-pulse" />
      </div>
    );
  }
  if (!client) {
    return (
      <div dir={dir} className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">{isRtl ? "العميل غير موجود" : "Client not found"}</p>
        <Button variant="outline" onClick={() => setLocation("/admin/clients")}>
          {isRtl ? "العودة للقائمة" : "Back to list"}
        </Button>
      </div>
    );
  }

  const status = (client.status ?? "lead") as Status;
  const statusMeta = STATUS_META[status] ?? STATUS_META.lead;

  return (
    <div dir={dir} className="space-y-5">

      {/* ── Back ── */}
      <button
        onClick={() => setLocation("/admin/clients")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
        {isRtl ? "العودة إلى قائمة العملاء" : "Back to Clients"}
      </button>

      {/* ══════════════════════════════
          PROFILE HEADER CARD
         ══════════════════════════════ */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {/* Gradient banner */}
        <div className="h-24 bg-linear-to-r from-primary/15 via-primary/8 to-transparent relative">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--primary)/0.12) 0%, transparent 60%)" }} />
        </div>

        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between">
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <Avatar className="w-20 h-20 border-4 border-card shadow-lg shrink-0">
                <AvatarFallback className="text-2xl font-bold bg-primary/15 text-primary">
                  {client.fullName?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="mb-1">
                <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">{client.fullName}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <ClientStatusBadge status={status} isRtl={isRtl} />
                  {client.source && (
                    <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                      {client.source.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {status === "lead" && (
                <Button
                  size="sm"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={convertToActive}
                  disabled={updateClient.isPending}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {isRtl ? "تحويل إلى موكّل نشط" : "Convert to Client"}
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                <Edit className="w-3.5 h-3.5" />
                {isRtl ? "تعديل" : "Edit"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{isRtl ? "حذف العميل" : "Delete Client"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isRtl ? "هذا الإجراء لا يمكن التراجع عنه." : "This action cannot be undone."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                      {deleteClient.isPending ? (isRtl ? "جارٍ الحذف…" : "Deleting…") : (isRtl ? "حذف" : "Delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Contact row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</div>
            <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{client.phone}</span></div>
            {client.city && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{client.city}</div>}
            {client.nationalId && <div className="flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" />{client.nationalId}</div>}
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "القضايا" : "Cases",          value: cases.length,                             icon: Briefcase,   color: "text-primary",      bg: "bg-primary/8" },
          { label: isRtl ? "المواعيد" : "Appointments",  value: appts.length,                             icon: CalendarDays, color: "text-blue-600",    bg: "bg-blue-50" },
          { label: isRtl ? "إجمالي الفواتير" : "Billed", value: `${totalBilled.toLocaleString()} ج.م`,     icon: DollarSign,  color: "text-emerald-600",  bg: "bg-emerald-50" },
          { label: isRtl ? "فواتير مدفوعة" : "Paid",     value: `${paidInvoices}/${invoices.length}`,      icon: CheckCircle2, color: "text-violet-600",  bg: "bg-violet-50" },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground leading-none truncate">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-none">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════
          TABS
         ══════════════════════════════ */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">{isRtl ? "نظرة عامة" : "Overview"}</TabsTrigger>
          <TabsTrigger value="cases">{isRtl ? `القضايا (${cases.length})` : `Cases (${cases.length})`}</TabsTrigger>
          <TabsTrigger value="appointments">{isRtl ? `المواعيد (${appts.length})` : `Appointments (${appts.length})`}</TabsTrigger>
          <TabsTrigger value="invoices">{isRtl ? `الفواتير (${invoices.length})` : `Invoices (${invoices.length})`}</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact details card */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                {isRtl ? "بيانات الاتصال" : "Contact Details"}
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Mail,    label: isRtl ? "البريد الإلكتروني" : "Email",   value: client.email,      ltr: true },
                  { icon: Phone,   label: isRtl ? "الهاتف" : "Phone",              value: client.phone,      ltr: true },
                  { icon: MapPin,  label: isRtl ? "العنوان" : "Address",           value: client.address || "—" },
                  { icon: MapPin,  label: isRtl ? "المدينة" : "City",              value: client.city || "—" },
                  { icon: IdCard,  label: isRtl ? "الرقم القومي" : "National ID",  value: client.nationalId || "—", ltr: true },
                ].map(row => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="flex items-start gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{row.label}</p>
                        <p className={`text-sm text-foreground`} dir={row.ltr ? "ltr" : dir}>{row.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes + meta */}
            <div className="space-y-4">
              {client.notes && (
                <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    {isRtl ? "الملاحظات" : "Notes"}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
              <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  {isRtl ? "معلومات الحساب" : "Account Info"}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRtl ? "مصدر العميل" : "Source"}</span>
                    <span className="font-medium">{client.source?.replace("_", " ") || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRtl ? "تاريخ التسجيل" : "Registered"}</span>
                    <span className="font-medium">{client.createdAt ? format(new Date(client.createdAt), "d MMM yyyy") : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRtl ? "آخر تحديث" : "Last Updated"}</span>
                    <span className="font-medium">{client.updatedAt ? format(new Date(client.updatedAt), "d MMM yyyy") : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent cases preview */}
          {cases.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {isRtl ? "أحدث القضايا" : "Recent Cases"}
                </h3>
                <button onClick={() => setTab("cases")} className="text-xs text-primary hover:underline">
                  {isRtl ? "عرض الكل" : "View all"}
                </button>
              </div>
              <div className="p-0">
                {cases.slice(0, 3).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{isRtl ? c.titleAr : c.titleEn}</p>
                      <p className="text-xs text-muted-foreground">{c.caseNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                      <button onClick={() => setLocation(`/admin/cases/${c.id}`)} className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Cases ── */}
        <TabsContent value="cases" className="mt-4">
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{isRtl ? "رقم القضية" : "Case #"}</TableHead>
                  <TableHead>{isRtl ? "العنوان" : "Title"}</TableHead>
                  <TableHead>{isRtl ? "المحامي" : "Lawyer"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRtl ? "تاريخ الفتح" : "Opened"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState icon={<Briefcase className="w-7 h-7" />} message={isRtl ? "لا توجد قضايا" : "No cases"} />
                    </TableCell>
                  </TableRow>
                )}
                {cases.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setLocation(`/admin/cases/${c.id}`)}>
                    <TableCell className="font-mono text-xs text-start!">{c.caseNumber}</TableCell>
                    <TableCell className="text-start!">
                      <p className="font-medium text-sm">{isRtl ? c.titleAr : c.titleEn}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.lawyerName || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.openedAt ? format(new Date(c.openedAt), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-end!">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Appointments ── */}
        <TabsContent value="appointments" className="mt-4">
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{isRtl ? "التاريخ والوقت" : "Date & Time"}</TableHead>
                  <TableHead>{isRtl ? "الخدمة" : "Service"}</TableHead>
                  <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRtl ? "المدة" : "Duration"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState icon={<CalendarDays className="w-7 h-7" />} message={isRtl ? "لا توجد مواعيد" : "No appointments"} />
                    </TableCell>
                  </TableRow>
                )}
                {appts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-start!">
                      <p className="text-sm font-medium">{format(new Date(a.scheduledAt), "d MMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.scheduledAt), "h:mm a")}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isRtl ? a.serviceNameAr : a.serviceNameEn || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {a.mode === "online" ? (isRtl ? "أونلاين" : "Online") : (isRtl ? "حضوري" : "In-Office")}
                      </Badge>
                    </TableCell>
                    <TableCell><ApptBadge status={a.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.durationMinutes} {isRtl ? "دقيقة" : "min"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Invoices & Payments ── */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: isRtl ? "إجمالي الفواتير" : "Total Invoiced", value: `${totalBilled.toLocaleString()} ج.م`, color: "text-foreground" },
              { label: isRtl ? "المدفوع" : "Paid",     value: `${invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.total, 0).toLocaleString()} ج.م`, color: "text-emerald-600" },
              { label: isRtl ? "المتبقي" : "Outstanding", value: `${invoices.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + i.total, 0).toLocaleString()} ج.م`, color: "text-amber-600" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4 text-center shadow-sm">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Invoices table */}
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{isRtl ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                  <TableHead>{isRtl ? "تاريخ الإصدار" : "Date"}</TableHead>
                  <TableHead>{isRtl ? "تاريخ الاستحقاق" : "Due"}</TableHead>
                  <TableHead>{isRtl ? "الإجمالي" : "Total"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState icon={<FileText className="w-7 h-7" />} message={isRtl ? "لا توجد فواتير" : "No invoices"} />
                    </TableCell>
                  </TableRow>
                )}
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setLocation(`/admin/invoices/${inv.id}`)}>
                    <TableCell className="font-mono text-xs text-start!">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.issueDate ? format(new Date(inv.issueDate), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.dueDate ? format(new Date(inv.dueDate), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{inv.total?.toLocaleString()} ج.م</TableCell>
                    <TableCell><InvoiceBadge status={inv.status} /></TableCell>
                    <TableCell className="text-end!">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══ Edit Dialog ══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="overflow-hidden p-0 gap-0 max-w-2xl">
          <AdminDialog
            title={isRtl ? "تعديل بيانات العميل" : "Edit Client"}
            subtitle={isRtl ? "تحديث بيانات الموكّل أو العميل المحتمل" : "Update client or lead information"}
            icon={<Edit className="w-4 h-4" />}
            footer={
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={form.handleSubmit(onEdit)} disabled={updateClient.isPending}>
                  {updateClient.isPending ? (isRtl ? "جارٍ الحفظ…" : "Saving…") : (isRtl ? "حفظ التعديلات" : "Save Changes")}
                </Button>
              </div>
            }
          >
            <Form {...form}>
              <form className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{isRtl ? "الاسم الكامل" : "Full Name"}</FormLabel>
                      <FormControl><Input dir={dir} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "البريد الإلكتروني" : "Email"}</FormLabel>
                      <FormControl><Input dir="ltr" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "الهاتف" : "Phone"}</FormLabel>
                      <FormControl><Input dir="ltr" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nationalId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "الرقم القومي" : "National ID"}</FormLabel>
                      <FormControl><Input dir="ltr" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "المدينة" : "City"}</FormLabel>
                      <FormControl><Input dir={dir} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{isRtl ? "العنوان" : "Address"}</FormLabel>
                      <FormControl><Input dir={dir} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "التصنيف" : "Status"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="lead">{isRtl ? "عميل محتمل" : "Lead"}</SelectItem>
                          <SelectItem value="active">{isRtl ? "موكّل نشط" : "Active Client"}</SelectItem>
                          <SelectItem value="inactive">{isRtl ? "موكّل غير نشط" : "Inactive"}</SelectItem>
                          <SelectItem value="archived">{isRtl ? "مؤرشف" : "Archived"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "المصدر" : "Source"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="website">{isRtl ? "الموقع" : "Website"}</SelectItem>
                          <SelectItem value="chat_widget">{isRtl ? "الشات" : "Chat"}</SelectItem>
                          <SelectItem value="referral">{isRtl ? "توصية" : "Referral"}</SelectItem>
                          <SelectItem value="walk_in">{isRtl ? "حضور مباشر" : "Walk-in"}</SelectItem>
                          <SelectItem value="phone">{isRtl ? "هاتف" : "Phone"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{isRtl ? "ملاحظات" : "Notes"}</FormLabel>
                      <FormControl><Textarea dir={dir} rows={3} className="resize-none" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </form>
            </Form>
          </AdminDialog>
        </DialogContent>
      </Dialog>
    </div>
  );
}
