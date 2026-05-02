import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, startOfToday, startOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useListAdminPayments,
  useConfirmPayment,
  getListAdminPaymentsQueryKey,
  useListAdminInvoices,
  useListAdminClients,
  customFetch,
  PaymentStatus,
  PaymentMethod,
  type Payment,
} from "@workspace/api-client-react";

import {
  Receipt,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  MoreVertical,
  Wallet,
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  Calendar,
  Hash,
  User,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpDown,
  X,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  AdminDialog,
  StatusBadge,
  NameCell,
  FormSection,
} from "@/components/admin-ui";

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const METHOD_OPTIONS: { value: string; ar: string; en: string; icon: any }[] = [
  { value: "cash", ar: "نقدي", en: "Cash", icon: Banknote },
  { value: "bank_transfer", ar: "تحويل بنكي", en: "Bank Transfer", icon: Building2 },
  { value: "instapay", ar: "InstaPay", en: "InstaPay", icon: Smartphone },
  { value: "vodafone_cash", ar: "Vodafone Cash", en: "Vodafone Cash", icon: Smartphone },
  { value: "fawry", ar: "فوري", en: "Fawry", icon: Smartphone },
  { value: "visa", ar: "فيزا", en: "Visa", icon: CreditCard },
];

function methodLabel(m: string, isRtl: boolean): string {
  const opt = METHOD_OPTIONS.find((o) => o.value === m);
  return opt ? (isRtl ? opt.ar : opt.en) : m.replace("_", " ");
}

function MethodIcon({ method, className = "" }: { method: string; className?: string }) {
  const opt = METHOD_OPTIONS.find((o) => o.value === method);
  const Icon = opt?.icon ?? Banknote;
  return <Icon className={className} />;
}

function statusLabel(s: string, isRtl: boolean, ta: (k: string) => string): string {
  if (s === "pending") return ta("status.pending") || (isRtl ? "معلق" : "Pending");
  if (s === "confirmed") return isRtl ? "مؤكد" : "Confirmed";
  if (s === "failed") return isRtl ? "فشل" : "Failed";
  if (s === "refunded") return isRtl ? "مُسترد" : "Refunded";
  return s;
}

/* ──────────────────────────────────────────────
   Form schemas
   ────────────────────────────────────────────── */

const recordSchema = z
  .object({
    /* clientId is REQUIRED so the payment shows up on the customer's
       statement. When an invoice is picked it is pre-filled automatically. */
    clientId: z.coerce.number().int().min(1, "Client is required"),
    invoiceId: z.coerce.number().min(1).optional(),
    amountEgp: z.coerce.number().min(0.01),
    method: z.string().min(1),
    status: z.enum(["pending", "confirmed"]),
    referenceNumber: z.string().optional().or(z.literal("")),
    paidAt: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  });

type RecordValues = z.infer<typeof recordSchema>;

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function AdminPayments() {
  const [location, setLocation] = useLocation();
  const { ta, isRtl } = useAdminI18n();

  /* When the page is reached via `/admin/payments?paymentId=N` (e.g. from
     a Statements ledger row that points at a non-invoiced payment), pop
     the payment-detail dialog open as soon as the row is in the cache. */
  const focusPaymentId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("paymentId");
    return v ? Number(v) : null;
  }, [location]);
  const queryClient = useQueryClient();
  const dir = isRtl ? "rtl" : "ltr";
  const dateLocale = isRtl ? ar : enUS;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [statusTarget, setStatusTarget] = useState<"failed" | "refunded" | null>(null);
  const [statusNote, setStatusNote] = useState("");

  const queryParams = useMemo(
    () => ({
      ...(statusFilter !== "all" && { status: statusFilter as PaymentStatus }),
    }),
    [statusFilter],
  );

  const { data, isLoading, isFetching, refetch } = useListAdminPayments(queryParams);
  const { data: invoices } = useListAdminInvoices({});
  const { data: clients } = useListAdminClients({});
  const confirmMutation = useConfirmPayment();

  /* Auto-open detail when arriving with `?paymentId=…` in the URL. */
  useEffect(() => {
    if (focusPaymentId == null || !Array.isArray(data)) return;
    const match = (data as Payment[]).find(p => p.id === focusPaymentId);
    if (match) {
      setActivePayment(match);
      setIsDetailOpen(true);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [focusPaymentId, data]);

  /** PATCH /admin/payments/:id used for failed/refunded actions. */
  const patchMutation = useMutation({
    mutationFn: async (vars: {
      id: number;
      body: Record<string, unknown>;
    }) => {
      return customFetch<Payment>(`/api/admin/payments/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.body),
      });
    },
  });

  /** POST /admin/payments to manually record a payment. */
  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      return customFetch<Payment>(`/api/admin/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  });

  const recordForm = useForm<RecordValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      clientId: undefined as unknown as number,
      invoiceId: undefined,
      amountEgp: 0,
      method: "cash",
      status: "confirmed",
      referenceNumber: "",
      paidAt: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  /* ──────────────────────────────────────────────
     Filtered/derived rows + stats
     ────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (methodFilter !== "all") rows = rows.filter((p) => p.method === methodFilter);
    if (typeFilter === "appointment") rows = rows.filter((p) => p.appointmentId != null);
    if (typeFilter === "invoice") rows = rows.filter((p) => p.invoiceId != null);
    if (typeFilter === "manual") rows = rows.filter((p) => !p.invoiceId && !p.appointmentId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) =>
        `${p.clientName ?? ""} ${p.referenceNumber ?? ""} ${p.invoiceNumber ?? ""} ${p.id}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (dateFrom) {
      try {
        const f = parseISO(dateFrom).getTime();
        rows = rows.filter((p) => new Date(p.paidAt ?? p.createdAt).getTime() >= f);
      } catch { /* ignore */ }
    }
    if (dateTo) {
      try {
        const t = parseISO(dateTo).getTime() + 24 * 60 * 60 * 1000;
        rows = rows.filter((p) => new Date(p.paidAt ?? p.createdAt).getTime() < t);
      } catch { /* ignore */ }
    }
    rows = [...rows].sort((a, b) => {
      const ta_ = new Date(a.paidAt ?? a.createdAt).getTime();
      const tb_ = new Date(b.paidAt ?? b.createdAt).getTime();
      return sortDesc ? tb_ - ta_ : ta_ - tb_;
    });
    return rows;
  }, [data, methodFilter, typeFilter, search, dateFrom, dateTo, sortDesc]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const today = startOfToday().getTime();
    const monthStart = startOfMonth(new Date()).getTime();
    let pendingCount = 0;
    let pendingAmount = 0;
    let confirmedAmount = 0;
    let confirmedTodayAmount = 0;
    let confirmedMonthAmount = 0;
    let failedCount = 0;
    list.forEach((p) => {
      const t = new Date(p.paidAt ?? p.createdAt).getTime();
      if (p.status === "pending") {
        pendingCount += 1;
        pendingAmount += p.amountEgp;
      } else if (p.status === "confirmed") {
        confirmedAmount += p.amountEgp;
        if (t >= today) confirmedTodayAmount += p.amountEgp;
        if (t >= monthStart) confirmedMonthAmount += p.amountEgp;
      } else if (p.status === "failed") {
        failedCount += 1;
      }
    });
    return {
      pendingCount,
      pendingAmount,
      confirmedAmount,
      confirmedTodayAmount,
      confirmedMonthAmount,
      failedCount,
      total: list.length,
    };
  }, [data]);

  /* ──────────────────────────────────────────────
     Handlers
     ────────────────────────────────────────────── */

  const openConfirm = (p: Payment) => {
    setActivePayment(p);
    setIsConfirmOpen(true);
  };
  const openStatusChange = (p: Payment, target: "failed" | "refunded") => {
    setActivePayment(p);
    setStatusTarget(target);
    setStatusNote("");
    setIsStatusOpen(true);
  };
  const openDetail = (p: Payment) => {
    setActivePayment(p);
    setIsDetailOpen(true);
  };

  const handleConfirm = async () => {
    if (!activePayment) return;
    try {
      await confirmMutation.mutateAsync({ id: activePayment.id });
      toast.success(isRtl ? "تم تأكيد الدفع" : "Payment confirmed");
      queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
      setIsConfirmOpen(false);
      setActivePayment(null);
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل تأكيد الدفع" : "Failed to confirm");
    }
  };

  const handleStatusChange = async () => {
    if (!activePayment || !statusTarget) return;
    try {
      const reference = statusNote.trim()
        ? `${activePayment.referenceNumber ?? ""}${activePayment.referenceNumber ? " · " : ""}${statusNote.trim()}`
        : activePayment.referenceNumber;
      await patchMutation.mutateAsync({
        id: activePayment.id,
        body: {
          status: statusTarget,
          ...(reference ? { referenceNumber: reference } : {}),
        },
      });
      toast.success(
        statusTarget === "failed"
          ? (isRtl ? "تم تعليم الدفعة كفاشلة" : "Marked as failed")
          : (isRtl ? "تم تعليم الدفعة كمستردة" : "Marked as refunded"),
      );
      queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
      setIsStatusOpen(false);
      setActivePayment(null);
      setStatusTarget(null);
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل تحديث الدفعة" : "Failed to update");
    }
  };

  const onRecordSubmit = async (values: RecordValues) => {
    try {
      const payload: Record<string, unknown> = {
        clientId: Number(values.clientId),
        amountEgp: Number(values.amountEgp),
        method: values.method,
        status: values.status,
        referenceNumber: values.referenceNumber || null,
        paidAt: values.paidAt || null,
      };
      if (values.invoiceId) payload.invoiceId = Number(values.invoiceId);
      await createMutation.mutateAsync(payload);
      toast.success(isRtl ? "تم تسجيل الدفعة" : "Payment recorded");
      queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
      setIsRecordOpen(false);
      recordForm.reset();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || (isRtl ? "فشل تسجيل الدفعة" : "Failed to record"));
    }
  };

  /* ──────────────────────────────────────────────
     Render
     ────────────────────────────────────────────── */

  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={ta("pay.title")}
        subtitle={isRtl ? "تتبع المعاملات وتأكيد المدفوعات" : "Track transactions and confirm payments"}
        icon={<Receipt className="w-5 h-5" />}
        dir={dir}
        action={
          <div className="flex items-center gap-2">
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => setLocation("/admin/statements")}
            >
              <Wallet className="w-3.5 h-3.5" />
              {isRtl ? "كشف العملاء" : "Statements"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-9 shadow-sm"
              onClick={() => {
                recordForm.reset({
                  invoiceId: undefined,
                  amountEgp: 0,
                  method: "cash",
                  status: "confirmed",
                  referenceNumber: "",
                  paidAt: new Date().toISOString().slice(0, 10),
                  notes: "",
                });
                setIsRecordOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {isRtl ? "تسجيل دفعة" : "Record Payment"}
            </Button>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label={isRtl ? "بانتظار التأكيد" : "Awaiting confirmation"}
          value={String(stats.pendingCount)}
          subtitle={`${stats.pendingAmount.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`}
          tone={stats.pendingCount > 0 ? "amber" : "gray"}
          onClick={() => setStatusFilter("pending")}
          highlighted={stats.pendingCount > 0}
          className="col-span-2"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label={isRtl ? "اليوم" : "Today"}
          value={`${stats.confirmedTodayAmount.toLocaleString()}`}
          subtitle={isRtl ? "ج.م مؤكدة" : "EGP confirmed"}
          tone="emerald"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label={isRtl ? "هذا الشهر" : "This month"}
          value={`${stats.confirmedMonthAmount.toLocaleString()}`}
          subtitle={isRtl ? "ج.م مؤكدة" : "EGP confirmed"}
          tone="violet"
        />
        <StatCard
          icon={<Wallet className="w-4 h-4" />}
          label={isRtl ? "إجمالي مؤكد" : "Total confirmed"}
          value={`${stats.confirmedAmount.toLocaleString()}`}
          subtitle={isRtl ? "ج.م" : "EGP"}
          tone="primary"
        />
        <StatCard
          icon={<XCircle className="w-4 h-4" />}
          label={isRtl ? "فشل/مسترد" : "Failed"}
          value={String(stats.failedCount)}
          subtitle={isRtl ? "معاملة" : "transactions"}
          tone={stats.failedCount > 0 ? "rose" : "gray"}
        />
      </div>

      {/* ── Status pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <PillButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          {ta("act.all")}{" "}
          <span className="opacity-60 ms-1">{stats.total}</span>
        </PillButton>
        {(["pending", "confirmed", "failed", "refunded"] as const).map((s) => (
          <PillButton key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {statusLabel(s, isRtl, ta)}
          </PillButton>
        ))}
      </div>

      {/* ── Table + filters ── */}
      <SectionCard>
        <FilterBar>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "ابحث بالعميل، الرقم، أو المرجع…" : "Search by client, ID, or reference…"}
              className="ps-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder={isRtl ? "كل الوسائل" : "All methods"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل الوسائل" : "All methods"}</SelectItem>
                {METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {isRtl ? o.ar : o.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder={isRtl ? "كل الأنواع" : "All types"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل الأنواع" : "All types"}</SelectItem>
                <SelectItem value="invoice">{isRtl ? "فواتير" : "Invoices"}</SelectItem>
                <SelectItem value="appointment">{isRtl ? "مواعيد" : "Appointments"}</SelectItem>
                <SelectItem value="manual">{isRtl ? "يدوية" : "Manual"}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-[140px]"
                title={isRtl ? "من تاريخ" : "From"}
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-[140px]"
                title={isRtl ? "إلى تاريخ" : "To"}
              />
            </div>
            {(search || methodFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2"
                onClick={() => {
                  setSearch("");
                  setMethodFilter("all");
                  setTypeFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </FilterBar>

        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead>{ta("pay.client") || (isRtl ? "العميل" : "Client")}</TableHead>
              <TableHead>{isRtl ? "النوع" : "Source"}</TableHead>
              <TableHead>{ta("pay.method")}</TableHead>
              <TableHead className="text-end">{ta("pay.amount")}</TableHead>
              <TableHead>{isRtl ? "المرجع" : "Reference"}</TableHead>
              <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => setSortDesc((v) => !v)}>
                <span className="inline-flex items-center gap-1">
                  {ta("pay.date")}
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </span>
              </TableHead>
              <TableHead>{ta("pay.status")}</TableHead>
              <TableHead className="text-end">{ta("act.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={9} />
            ) : filtered.length === 0 ? (
              <EmptyState cols={9} message={isRtl ? "لا توجد مدفوعات" : "No payments found"} icon={<Receipt className="w-8 h-8" />} />
            ) : (
              filtered.map((payment) => {
                const isPending = payment.status === "pending";
                const dateValue = payment.paidAt ?? payment.createdAt;
                return (
                  <TableRow
                    key={payment.id}
                    className={isPending ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}
                  >
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      #{payment.id}
                    </TableCell>
                    <TableCell>
                      <NameCell
                        primary={payment.clientName ?? "—"}
                        secondary={payment.invoiceNumber ?? undefined}
                        maxWidth="max-w-[220px]"
                      />
                    </TableCell>
                    <TableCell>
                      {payment.appointmentId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          onClick={() => setLocation(`/admin/appointments`)}
                          title={isRtl ? "فتح المواعيد" : "Open appointments"}
                        >
                          <Calendar className="w-3 h-3" />
                          {isRtl ? "موعد" : "Appt."} #{payment.appointmentId}
                        </button>
                      ) : payment.invoiceId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          onClick={() => setLocation(`/admin/invoices/${payment.invoiceId}`)}
                          title={isRtl ? "فتح الفاتورة" : "Open invoice"}
                        >
                          <FileText className="w-3 h-3" />
                          {payment.invoiceNumber ?? `#${payment.invoiceId}`}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{isRtl ? "يدوي" : "Manual"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <MethodIcon method={payment.method} className="w-3.5 h-3.5 text-muted-foreground" />
                        {methodLabel(payment.method, isRtl)}
                      </span>
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums whitespace-nowrap">
                      {payment.amountEgp.toLocaleString()}
                      <span className="text-muted-foreground font-normal text-[10px] ms-1">
                        {isRtl ? "ج.م" : "EGP"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {payment.referenceNumber ? (
                        <span className="font-mono text-[11px] text-muted-foreground" title={payment.referenceNumber}>
                          {payment.referenceNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {format(new Date(dateValue), "dd MMM yy · HH:mm", { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} isRtl={isRtl} ta={ta} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        {isPending && (
                          <Button
                            size="sm"
                            className="h-8 gap-1 hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openConfirm(payment)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isRtl ? "تأكيد" : "Confirm"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDetail(payment)}
                          title={ta("act.view")}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRtl ? "start" : "end"}>
                            <DropdownMenuLabel className="text-xs">
                              {isRtl ? "إجراءات" : "Actions"}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isPending && (
                              <DropdownMenuItem onClick={() => openConfirm(payment)}>
                                <CheckCircle2 className="w-3.5 h-3.5 me-2 text-emerald-600" />
                                {isRtl ? "تأكيد الدفع" : "Confirm payment"}
                              </DropdownMenuItem>
                            )}
                            {payment.status !== "failed" && (
                              <DropdownMenuItem onClick={() => openStatusChange(payment, "failed")}>
                                <XCircle className="w-3.5 h-3.5 me-2 text-rose-500" />
                                {isRtl ? "تعليم كفاشل" : "Mark as failed"}
                              </DropdownMenuItem>
                            )}
                            {payment.status !== "refunded" && (
                              <DropdownMenuItem onClick={() => openStatusChange(payment, "refunded")}>
                                <RefreshCw className="w-3.5 h-3.5 me-2 text-muted-foreground" />
                                {isRtl ? "تعليم كمسترد" : "Mark as refunded"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {payment.invoiceId && (
                              <DropdownMenuItem onClick={() => setLocation(`/admin/invoices/${payment.invoiceId}`)}>
                                <FileText className="w-3.5 h-3.5 me-2" />
                                {isRtl ? "عرض الفاتورة" : "View invoice"}
                              </DropdownMenuItem>
                            )}
                            {payment.clientId != null && (
                              <DropdownMenuItem onClick={() => setLocation(`/admin/clients/${payment.clientId}`)}>
                                <User className="w-3.5 h-3.5 me-2" />
                                {isRtl ? "ملف العميل" : "View client"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                setLocation(
                                  payment.clientId != null
                                    ? `/admin/statements?clientId=${payment.clientId}`
                                    : `/admin/statements`,
                                )
                              }
                            >
                              <Wallet className="w-3.5 h-3.5 me-2" />
                              {isRtl ? "كشف حساب العميل" : "Client statement"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Footer summary row */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 text-sm bg-muted/20">
            <span className="text-muted-foreground">
              {filtered.length} {isRtl ? "معاملة" : filtered.length === 1 ? "transaction" : "transactions"}
            </span>
            <span className="font-semibold tabular-nums">
              {isRtl ? "الإجمالي: " : "Total: "}
              {filtered.reduce((s, p) => s + p.amountEgp, 0).toLocaleString()}{" "}
              <span className="text-muted-foreground font-normal text-xs">{isRtl ? "ج.م" : "EGP"}</span>
            </span>
          </div>
        )}
      </SectionCard>

      {/* ─────────────────── Confirm dialog ─────────────────── */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" dir={dir}>
          <AdminDialog
            title={isRtl ? "تأكيد الدفع" : "Confirm payment"}
            subtitle={isRtl ? "تأكيد استلام المبلغ بشكل نهائي" : "Acknowledge that the amount has been received"}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            dir={dir}
            footer={
              <>
                <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(false)}>
                  {ta("act.cancel")}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleConfirm}
                  disabled={confirmMutation.isPending}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 me-1.5" />
                  {confirmMutation.isPending ? ta("act.saving") : (isRtl ? "نعم، أكد" : "Yes, confirm")}
                </Button>
              </>
            }
          >
            {activePayment && (
              <PaymentSummary payment={activePayment} isRtl={isRtl} />
            )}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isRtl
                  ? "بمجرد التأكيد، إذا كانت هذه الدفعة تغطي قيمة الفاتورة كاملة، سيتم تعليم الفاتورة كمدفوعة تلقائياً."
                  : "Once confirmed, if this payment covers the full invoice, the invoice will be marked as paid automatically."}
              </span>
            </div>
          </AdminDialog>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── Failed/Refunded dialog ─────────────────── */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" dir={dir}>
          <AdminDialog
            title={
              statusTarget === "failed"
                ? isRtl ? "تعليم كدفعة فاشلة" : "Mark payment as failed"
                : isRtl ? "تعليم كدفعة مستردة" : "Mark payment as refunded"
            }
            subtitle={
              statusTarget === "failed"
                ? isRtl ? "تسجيل أن الدفعة لم تتم بنجاح" : "Record that the payment did not go through"
                : isRtl ? "تسجيل أن المبلغ تم رده للعميل" : "Record that the amount has been returned to the client"
            }
            icon={
              statusTarget === "failed" ? (
                <XCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              )
            }
            dir={dir}
            footer={
              <>
                <Button variant="outline" size="sm" onClick={() => setIsStatusOpen(false)}>
                  {ta("act.cancel")}
                </Button>
                <Button
                  size="sm"
                  variant={statusTarget === "failed" ? "destructive" : "default"}
                  onClick={handleStatusChange}
                  disabled={patchMutation.isPending}
                >
                  {patchMutation.isPending ? ta("act.saving") : (isRtl ? "تأكيد" : "Confirm")}
                </Button>
              </>
            }
          >
            {activePayment && <PaymentSummary payment={activePayment} isRtl={isRtl} />}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "ملاحظة (اختياري)" : "Note (optional)"}
              </label>
              <Textarea
                rows={3}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={
                  statusTarget === "failed"
                    ? isRtl ? "سبب فشل الدفعة…" : "Reason for failure…"
                    : isRtl ? "سبب الاسترداد…" : "Reason for refund…"
                }
              />
              <p className="text-[10px] text-muted-foreground">
                {isRtl
                  ? "الملاحظة ستُضاف لحقل المرجع للرجوع لها لاحقاً."
                  : "The note will be appended to the reference field for future audit."}
              </p>
            </div>
          </AdminDialog>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── Detail drawer ─────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" dir={dir}>
          <AdminDialog
            title={isRtl ? "تفاصيل الدفعة" : "Payment details"}
            subtitle={`#${activePayment?.id ?? ""}`}
            icon={<Receipt className="w-4 h-4" />}
            dir={dir}
            footer={
              <>
                <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                  {isRtl ? "إغلاق" : "Close"}
                </Button>
                {activePayment?.status === "pending" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openConfirm(activePayment);
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isRtl ? "تأكيد الدفع" : "Confirm payment"}
                  </Button>
                )}
              </>
            }
          >
            {activePayment && (
              <div className="space-y-4">
                <PaymentSummary payment={activePayment} isRtl={isRtl} expanded />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <DetailRow icon={<Hash className="w-3 h-3" />} label={isRtl ? "رقم الدفعة" : "Payment ID"} value={`#${activePayment.id}`} />
                  <DetailRow
                    icon={<Calendar className="w-3 h-3" />}
                    label={isRtl ? "تاريخ الإنشاء" : "Created"}
                    value={format(new Date(activePayment.createdAt), "dd MMM yyyy HH:mm", { locale: dateLocale })}
                  />
                  {activePayment.paidAt && (
                    <DetailRow
                      icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      label={isRtl ? "تاريخ الدفع" : "Paid at"}
                      value={format(new Date(activePayment.paidAt), "dd MMM yyyy HH:mm", { locale: dateLocale })}
                    />
                  )}
                  <DetailRow
                    icon={<MethodIcon method={activePayment.method} className="w-3 h-3" />}
                    label={ta("pay.method")}
                    value={methodLabel(activePayment.method, isRtl)}
                  />
                  {activePayment.referenceNumber && (
                    <DetailRow
                      icon={<Hash className="w-3 h-3" />}
                      label={isRtl ? "المرجع" : "Reference"}
                      value={activePayment.referenceNumber}
                      mono
                      span={2}
                    />
                  )}
                  {activePayment.invoiceNumber && (
                    <DetailRow
                      icon={<FileText className="w-3 h-3" />}
                      label={isRtl ? "الفاتورة" : "Invoice"}
                      value={activePayment.invoiceNumber}
                      mono
                      span={2}
                    />
                  )}
                </div>
              </div>
            )}
          </AdminDialog>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── Record manual payment ─────────────────── */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" dir={dir}>
          <Form {...recordForm}>
            <form onSubmit={recordForm.handleSubmit(onRecordSubmit)} className="admin-form">
              <AdminDialog
                title={isRtl ? "تسجيل دفعة جديدة" : "Record a new payment"}
                subtitle={isRtl ? "أضف دفعة يدوياً وربطها بفاتورة (اختياري)" : "Add a payment manually, optionally linked to an invoice"}
                icon={<Plus className="w-4 h-4" />}
                dir={dir}
                footer={
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsRecordOpen(false)}>
                      {ta("act.cancel")}
                    </Button>
                    <Button type="submit" size="sm" disabled={createMutation.isPending}>
                      {createMutation.isPending ? ta("act.saving") : (isRtl ? "تسجيل الدفعة" : "Record")}
                    </Button>
                  </>
                }
              >
                <FormSection title={isRtl ? "تفاصيل الدفعة" : "Payment details"} icon={<Banknote className="w-3.5 h-3.5" />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={recordForm.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            <User className="inline w-3 h-3 me-1 mb-0.5" />
                            {isRtl ? "العميل *" : "Client *"}
                          </FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(Number(v))}
                            value={field.value ? String(field.value) : ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isRtl ? "اختر العميل…" : "Select a client…"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.fullName}{c.email ? ` — ${c.email}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {isRtl
                              ? "الدفعة لن تظهر في كشف الحساب بدون اختيار العميل."
                              : "Required — the payment won't appear on the customer's statement without it."}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={recordForm.control}
                      name="invoiceId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            <FileText className="inline w-3 h-3 me-1 mb-0.5" />
                            {isRtl ? "الفاتورة المرتبطة (اختياري)" : "Linked invoice (optional)"}
                          </FormLabel>
                          <Select
                            onValueChange={(v) => {
                              if (v === "none") {
                                field.onChange(undefined);
                                return;
                              }
                              const invId = Number(v);
                              field.onChange(invId);
                              /* Auto-fill the client from the invoice. */
                              const inv = invoices?.find((i) => i.id === invId);
                              if (inv?.clientId) {
                                recordForm.setValue("clientId", inv.clientId, { shouldValidate: true });
                              }
                              /* And pre-fill amount with the invoice total if not yet set. */
                              if (inv && !recordForm.getValues("amountEgp")) {
                                recordForm.setValue("amountEgp", Number(inv.total));
                              }
                            }}
                            value={field.value == null ? "none" : String(field.value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isRtl ? "بدون ربط" : "Not linked"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">{isRtl ? "بدون ربط بفاتورة (دفعة على الحساب)" : "Not linked (on-account payment)"}</SelectItem>
                              {invoices
                                ?.filter((i) => i.status !== "paid" && i.status !== "cancelled")
                                .filter((i) => {
                                  /* If a client is already chosen, only show their invoices. */
                                  const cid = recordForm.getValues("clientId");
                                  return !cid || i.clientId === cid;
                                })
                                .map((i) => (
                                  <SelectItem key={i.id} value={String(i.id)}>
                                    {i.invoiceNumber} — {i.clientName} — {Number(i.total).toLocaleString()} {isRtl ? "ج.م" : "EGP"}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {isRtl
                              ? "إذا كانت الدفعة تغطي قيمة الفاتورة بالكامل، ستُعلَّم الفاتورة كمدفوعة تلقائياً."
                              : "If the payment covers the full invoice amount, it will be auto-marked as paid."}
                          </p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={recordForm.control}
                      name="amountEgp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{ta("pay.amount")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                step={50}
                                dir="ltr"
                                className="pe-12 tabular-nums"
                                {...field}
                              />
                              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                {isRtl ? "ج.م" : "EGP"}
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={recordForm.control}
                      name="paidAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Calendar className="inline w-3 h-3 me-1 mb-0.5" />
                            {isRtl ? "تاريخ الدفع" : "Payment date"}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ?? ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={recordForm.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{ta("pay.method")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {METHOD_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  <span className="inline-flex items-center gap-2">
                                    <o.icon className="w-3.5 h-3.5" />
                                    {isRtl ? o.ar : o.en}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={recordForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{ta("pay.status")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="confirmed">
                                {isRtl ? "مؤكدة (تم استلام المبلغ)" : "Confirmed (amount received)"}
                              </SelectItem>
                              <SelectItem value="pending">
                                {isRtl ? "معلقة (بانتظار التأكيد)" : "Pending (awaiting confirmation)"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={recordForm.control}
                      name="referenceNumber"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            <Hash className="inline w-3 h-3 me-1 mb-0.5" />
                            {isRtl ? "رقم المرجع / المعاملة (اختياري)" : "Reference / transaction # (optional)"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              dir="ltr"
                              placeholder={isRtl ? "مثال: TXN-1234، رقم إيصال…" : "e.g. TXN-1234, receipt number…"}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </FormSection>
              </AdminDialog>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

function PaymentStatusBadge({
  status,
  isRtl,
  ta,
}: {
  status: string;
  isRtl: boolean;
  ta: (k: string) => string;
}) {
  const cls =
    status === "confirmed"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-200/50"
      : status === "pending"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200/50 animate-pulse"
      : status === "failed"
      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border-rose-200/50"
      : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const Icon =
    status === "confirmed" ? CheckCircle2 :
    status === "pending"   ? Clock :
    status === "failed"    ? XCircle :
    RefreshCw;
  return (
    <Badge className={`${cls} border gap-1 font-medium`}>
      <Icon className="w-3 h-3" />
      {statusLabel(status, isRtl, ta)}
    </Badge>
  );
}

function PaymentSummary({
  payment,
  isRtl,
  expanded = false,
}: {
  payment: Payment;
  isRtl: boolean;
  expanded?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{payment.clientName ?? (isRtl ? "بدون عميل" : "No client")}</div>
          <div className="text-[11px] text-muted-foreground">
            {payment.appointmentId ? `${isRtl ? "موعد" : "Appt."} #${payment.appointmentId}` :
             payment.invoiceId ? payment.invoiceNumber ?? `${isRtl ? "فاتورة" : "Invoice"} #${payment.invoiceId}` :
             (isRtl ? "دفعة يدوية" : "Manual payment")}
          </div>
        </div>
        <div className="text-end shrink-0">
          <div className="text-lg font-bold tabular-nums">
            {payment.amountEgp.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">{isRtl ? "ج.م" : "EGP"}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MethodIcon method={payment.method} className="w-3 h-3" />
          {methodLabel(payment.method, isRtl)}
        </span>
        {payment.referenceNumber && expanded && (
          <span className="font-mono">· {payment.referenceNumber}</span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  tone = "primary",
  className = "",
  highlighted = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  tone?: "primary" | "amber" | "emerald" | "violet" | "rose" | "gray";
  className?: string;
  highlighted?: boolean;
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    gray: "bg-muted text-muted-foreground",
  };
  const Component: any = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border bg-card p-3.5 flex items-center gap-3 text-start transition-all ${
        highlighted
          ? "border-amber-300 dark:border-amber-900/50 ring-1 ring-amber-100 dark:ring-amber-900/20"
          : "border-border/60"
      } ${onClick ? "hover:bg-muted/30 hover:border-primary/40 cursor-pointer" : ""} ${className}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate">
          {label}
        </div>
        <div className="text-base sm:text-lg font-semibold tabular-nums truncate">{value}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>}
      </div>
    </Component>
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

function DetailRow({
  icon,
  label,
  value,
  mono = false,
  span = 1,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  span?: 1 | 2;
}) {
  return (
    <div className={`p-2 rounded-md bg-muted/30 ${span === 2 ? "col-span-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`text-xs mt-0.5 ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
    </div>
  );
}
