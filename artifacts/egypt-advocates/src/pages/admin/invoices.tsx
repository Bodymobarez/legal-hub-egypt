import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  useListAdminInvoices,
  useCreateAdminInvoice,
  useMarkInvoicePaid,
  getListAdminInvoicesQueryKey,
  InvoiceStatus,
  CreateInvoiceInputStatus,
  InvoicePaymentMethod,
  useListAdminClients,
  useListAdminCases,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FileText,
  Receipt,
  Trash2,
  Eye,
  Send,
  CalendarDays,
  Calculator,
  AlertTriangle,
  Wallet,
  TrendingUp,
  RefreshCw,
  X,
  Hash,
  User,
  Briefcase,
  StickyNote,
  CheckCircle2,
  Banknote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
   Form schema
   ────────────────────────────────────────────── */
const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.01),
  unitPriceEgp: z.coerce.number().min(0),
});

const formSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  caseId: z.coerce.number().nullable().optional(),
  status: z.nativeEnum(CreateInvoiceInputStatus),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  issueDate: z.string().min(1),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(itemSchema).min(1, "At least one line item is required"),
});

type FormValues = z.infer<typeof formSchema>;

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */
export default function AdminInvoices() {
  const [, setLocation] = useLocation();
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const dir = isRtl ? "rtl" : "ltr";
  const dateLocale = isRtl ? ar : enUS;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);

  const queryParams = useMemo(
    () => ({
      ...(status !== "all" && { status: status as InvoiceStatus }),
    }),
    [status],
  );

  const { data, isLoading, refetch, isFetching } = useListAdminInvoices(queryParams);
  const { data: clients } = useListAdminClients({});
  const { data: cases } = useListAdminCases({});
  const createInvoice = useCreateAdminInvoice();
  const markPaid = useMarkInvoicePaid();

  /* ──────────────────────────────────────────────
     Derived rows + stats
     ────────────────────────────────────────────── */
  const today = new Date();
  const rows = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((inv) => {
      if (clientFilter !== "all" && String(inv.clientId) !== clientFilter) return false;
      if (q) {
        const hay = `${inv.invoiceNumber} ${inv.clientName ?? ""} ${(inv.notes ?? "")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, clientFilter]);

  const stats = useMemo(() => {
    const list = data ?? [];
    let invoiced = 0;
    let paid = 0;
    let outstanding = 0;
    let overdue = 0;
    let overdueCount = 0;
    list.forEach((inv) => {
      const total = Number(inv.total) || 0;
      invoiced += total;
      if (inv.status === "paid") paid += total;
      else outstanding += total;
      if (inv.status !== "paid" && inv.status !== "cancelled" && inv.dueDate) {
        try {
          if (isAfter(today, parseISO(inv.dueDate))) {
            overdue += total;
            overdueCount += 1;
          }
        } catch { /* ignore */ }
      }
    });
    return {
      invoiced,
      paid,
      outstanding,
      overdue,
      overdueCount,
      count: list.length,
    };
  }, [data, today]);

  /* ──────────────────────────────────────────────
     Form setup
     ────────────────────────────────────────────── */
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: 0,
      caseId: null,
      status: CreateInvoiceInputStatus.draft,
      taxPercent: 0,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      notes: "",
      items: [{ description: "", quantity: 1, unitPriceEgp: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  /** Watch line items + tax to compute totals live. */
  const watchedItems = form.watch("items");
  const watchedTax = form.watch("taxPercent");
  const watchedClientId = form.watch("clientId");
  const totals = useMemo(() => {
    const subtotal = (watchedItems ?? []).reduce(
      (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPriceEgp) || 0),
      0,
    );
    const tax = +(subtotal * ((Number(watchedTax) || 0) / 100)).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), tax, total };
  }, [watchedItems, watchedTax]);

  /** Filter cases to those of the selected client. */
  const clientCases = useMemo(() => {
    if (!cases) return [];
    if (!watchedClientId) return [];
    return cases.filter((c) => c.clientId === Number(watchedClientId));
  }, [cases, watchedClientId]);

  /** Reset case selection when client changes. */
  useEffect(() => {
    if (form.getValues("caseId") && !clientCases.find((c) => c.id === form.getValues("caseId"))) {
      form.setValue("caseId", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedClientId]);

  const paidForm = useForm({
    defaultValues: {
      paymentMethod: InvoicePaymentMethod.bank_transfer as string,
      paymentReference: "",
    },
  });

  /* ──────────────────────────────────────────────
     Submit handlers
     ────────────────────────────────────────────── */
  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        clientId: values.clientId,
        caseId: values.caseId ?? null,
        status: values.status,
        taxPercentage: values.taxPercent,
        issueDate: values.issueDate,
        dueDate: values.dueDate || null,
        notes: values.notes || null,
        items: values.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unitPriceEgp: Number(it.unitPriceEgp),
        })),
      };
      await createInvoice.mutateAsync({ data: payload });
      toast.success(isRtl ? "تم إنشاء الفاتورة" : "Invoice created");
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      setIsNewDialogOpen(false);
      form.reset();
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل إنشاء الفاتورة" : "Failed to create invoice");
    }
  };

  const onMarkPaidSubmit = async (values: { paymentMethod: string; paymentReference: string }) => {
    if (!selectedInvoice) return;
    try {
      await markPaid.mutateAsync({
        id: selectedInvoice,
        data: {
          paymentMethod: values.paymentMethod as InvoicePaymentMethod,
          referenceNumber: values.paymentReference || undefined,
        } as any,
      });
      toast.success(ta("act.markPaid"));
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      setIsPaidDialogOpen(false);
      paidForm.reset();
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل تأكيد الدفع" : "Failed to mark paid");
    }
  };

  const isOverdue = (inv: typeof rows[number]) => {
    if (inv.status === "paid" || inv.status === "cancelled") return false;
    if (!inv.dueDate) return false;
    try { return isAfter(new Date(), parseISO(inv.dueDate)); } catch { return false; }
  };

  /* ──────────────────────────────────────────────
     Render
     ────────────────────────────────────────────── */
  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={ta("inv.title")}
        subtitle={isRtl ? "إنشاء وإدارة الفواتير ومتابعة المدفوعات" : "Create invoices and track payments"}
        icon={<FileText className="w-5 h-5" />}
        dir={dir}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => setLocation("/admin/statements")}
            >
              <Wallet className="w-3.5 h-3.5" />
              {isRtl ? "كشف حساب" : "Statements"}
            </Button>
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
            <Dialog
              open={isNewDialogOpen}
              onOpenChange={(v) => {
                setIsNewDialogOpen(v);
                if (!v) form.reset();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 h-9 shadow-sm">
                  <Plus className="w-4 h-4" />
                  {ta("inv.add")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0" dir={dir}>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
                    <AdminDialog
                      title={ta("inv.add")}
                      subtitle={isRtl ? "إنشاء فاتورة جديدة بكامل التفاصيل" : "Create a fully-detailed invoice"}
                      icon={<FileText className="w-4 h-4" />}
                      dir={dir}
                      footer={
                        <>
                          <div className={`me-auto text-xs text-muted-foreground ${isRtl ? "text-right" : "text-left"}`}>
                            {isRtl ? "الإجمالي: " : "Total: "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {totals.total.toLocaleString()} {isRtl ? "ج.م" : "EGP"}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNewDialogOpen(false)}
                          >
                            {ta("act.cancel")}
                          </Button>
                          <Button type="submit" size="sm" disabled={createInvoice.isPending}>
                            {createInvoice.isPending ? ta("act.saving") : ta("act.save")}
                          </Button>
                        </>
                      }
                    >
                      <FormSection title={isRtl ? "بيانات الفاتورة" : "Invoice details"} icon={<Hash className="w-3.5 h-3.5" />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <User className="inline w-3 h-3 mb-0.5 me-1" />
                                  {ta("inv.client")}
                                </FormLabel>
                                <Select
                                  onValueChange={(v) => field.onChange(Number(v))}
                                  value={field.value ? String(field.value) : undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isRtl ? "اختر العميل" : "Select a client"} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {clients?.map((c) => (
                                      <SelectItem key={c.id} value={String(c.id)}>
                                        {c.fullName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="caseId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <Briefcase className="inline w-3 h-3 mb-0.5 me-1" />
                                  {isRtl ? "القضية المرتبطة (اختياري)" : "Linked case (optional)"}
                                </FormLabel>
                                <Select
                                  onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                                  value={field.value == null ? "none" : String(field.value)}
                                  disabled={!watchedClientId}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={
                                          watchedClientId
                                            ? isRtl ? "بدون قضية" : "No case"
                                            : isRtl ? "اختر العميل أولاً" : "Pick a client first"
                                        }
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">{isRtl ? "بدون قضية" : "No case"}</SelectItem>
                                    {clientCases.map((c) => (
                                      <SelectItem key={c.id} value={String(c.id)}>
                                        {c.caseNumber} — {isRtl ? c.titleAr : c.titleEn}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="issueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <CalendarDays className="inline w-3 h-3 mb-0.5 me-1" />
                                  {ta("inv.issued")}
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <CalendarDays className="inline w-3 h-3 mb-0.5 me-1" />
                                  {ta("inv.due")}
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} value={field.value ?? ""} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{ta("inv.status")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="draft">{isRtl ? "مسودة" : "Draft"}</SelectItem>
                                    <SelectItem value="sent">{isRtl ? "مُرسلة" : "Sent"}</SelectItem>
                                    <SelectItem value="paid">{ta("status.paid")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="taxPercent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isRtl ? "نسبة الضريبة %" : "Tax %"}</FormLabel>
                                <FormControl>
                                  <Input type="number" min={0} max={100} step={0.5} dir="ltr" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </FormSection>

                      <FormSection title={isRtl ? "البنود" : "Line items"} icon={<Calculator className="w-3.5 h-3.5" />}>
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
                            <div className="col-span-6">{isRtl ? "الوصف" : "Description"}</div>
                            <div className="col-span-2 text-center">{isRtl ? "الكمية" : "Qty"}</div>
                            <div className="col-span-3 text-end">{isRtl ? "سعر الوحدة" : "Unit price"}</div>
                            <div className="col-span-1" />
                          </div>
                          {fields.map((field, index) => {
                            const it = watchedItems?.[index];
                            const lineTotal =
                              (Number(it?.quantity) || 0) * (Number(it?.unitPriceEgp) || 0);
                            return (
                              <div
                                key={field.id}
                                className="grid grid-cols-12 gap-2 items-start bg-muted/30 rounded-lg p-2"
                              >
                                <div className="col-span-6">
                                  <Input
                                    placeholder={isRtl ? "وصف البند…" : "Item description…"}
                                    {...form.register(`items.${index}.description`)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    className="h-9 text-center tabular-nums"
                                    dir="ltr"
                                    {...form.register(`items.${index}.quantity`)}
                                  />
                                </div>
                                <div className="col-span-3">
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min={0}
                                      step={50}
                                      className="h-9 text-end tabular-nums pe-12"
                                      dir="ltr"
                                      {...form.register(`items.${index}.unitPriceEgp`)}
                                    />
                                    <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                                      {isRtl ? "ج.م" : "EGP"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground text-end mt-1 tabular-nums">
                                    = {lineTotal.toLocaleString()} {isRtl ? "ج.م" : "EGP"}
                                  </div>
                                </div>
                                <div className="col-span-1 flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-rose-500 hover:text-rose-600"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 mt-2"
                            onClick={() => append({ description: "", quantity: 1, unitPriceEgp: 0 })}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {isRtl ? "إضافة بند" : "Add line"}
                          </Button>
                        </div>

                        {/* Totals card */}
                        <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1.5">
                          <Row label={isRtl ? "المجموع الفرعي" : "Subtotal"} value={totals.subtotal} isRtl={isRtl} />
                          <Row
                            label={`${isRtl ? "الضريبة" : "Tax"} (${watchedTax || 0}%)`}
                            value={totals.tax}
                            isRtl={isRtl}
                          />
                          <div className="h-px bg-border/60 my-1" />
                          <Row label={isRtl ? "الإجمالي" : "Total"} value={totals.total} isRtl={isRtl} bold />
                        </div>
                      </FormSection>

                      <FormSection title={isRtl ? "ملاحظات" : "Notes"} icon={<StickyNote className="w-3.5 h-3.5" />}>
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder={isRtl ? "ملاحظات تظهر للعميل في أسفل الفاتورة…" : "Notes visible to the client at the bottom of the invoice…"}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </FormSection>
                    </AdminDialog>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label={isRtl ? "عدد الفواتير" : "Invoices"}
          value={String(stats.count)}
          tone="primary"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label={isRtl ? "إجمالي مفوتر" : "Invoiced"}
          value={`${stats.invoiced.toLocaleString()} ${isRtl ? "ج.م" : ""}`}
          tone="violet"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label={isRtl ? "مدفوع" : "Paid"}
          value={`${stats.paid.toLocaleString()} ${isRtl ? "ج.م" : ""}`}
          tone="emerald"
        />
        <StatCard
          icon={<Wallet className="w-4 h-4" />}
          label={isRtl ? "مستحق" : "Outstanding"}
          value={`${stats.outstanding.toLocaleString()} ${isRtl ? "ج.م" : ""}`}
          tone="amber"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label={isRtl ? "متأخرة" : "Overdue"}
          value={`${stats.overdueCount} · ${stats.overdue.toLocaleString()}`}
          tone={stats.overdueCount > 0 ? "rose" : "gray"}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* ── Status pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <PillButton active={status === "all"} onClick={() => setStatus("all")}>
          {ta("act.all")} <span className="opacity-60 ms-1">{stats.count}</span>
        </PillButton>
        {(["draft", "sent", "paid", "overdue", "cancelled"] as const).map((s) => (
          <PillButton key={s} active={status === s} onClick={() => setStatus(s)}>
            {labelForStatus(s, isRtl, ta)}
          </PillButton>
        ))}
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent dir={dir} className="overflow-hidden p-0 gap-0 max-w-md">
          <Form {...paidForm}>
            <form onSubmit={paidForm.handleSubmit(onMarkPaidSubmit)} className="admin-form">
              <AdminDialog
                title={ta("act.markPaid")}
                subtitle={isRtl ? "تأكيد استلام الدفع" : "Confirm payment receipt"}
                icon={<Banknote className="w-4 h-4" />}
                dir={dir}
                footer={
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsPaidDialogOpen(false)}>
                      {ta("act.cancel")}
                    </Button>
                    <Button type="submit" size="sm" disabled={markPaid.isPending}>
                      {ta("act.confirm")}
                    </Button>
                  </>
                }
              >
                <FormField
                  control={paidForm.control}
                  name="paymentMethod"
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
                          <SelectItem value="bank_transfer">{isRtl ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                          <SelectItem value="cash">{isRtl ? "نقداً" : "Cash"}</SelectItem>
                          <SelectItem value="visa">{isRtl ? "بطاقة ائتمان" : "Credit Card"}</SelectItem>
                          <SelectItem value="instapay">InstaPay</SelectItem>
                          <SelectItem value="vodafone_cash">Vodafone Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={paidForm.control}
                  name="paymentReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ta("pay.reference")}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" placeholder={isRtl ? "رقم العملية أو المرجع" : "Transaction or reference number"} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </AdminDialog>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <SectionCard>
        <FilterBar>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "ابحث برقم الفاتورة، العميل، أو الملاحظات…" : "Search by invoice #, client, or notes…"}
              className="ps-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder={isRtl ? "كل العملاء" : "All clients"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل العملاء" : "All clients"}</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || clientFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2"
                onClick={() => { setSearch(""); setClientFilter("all"); }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </FilterBar>

        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              <TableHead>{ta("inv.number")}</TableHead>
              <TableHead>{ta("inv.client")}</TableHead>
              <TableHead className="whitespace-nowrap">{ta("inv.issued")}</TableHead>
              <TableHead className="whitespace-nowrap">{ta("inv.due")}</TableHead>
              <TableHead className="text-end">{ta("inv.amount")}</TableHead>
              <TableHead>{ta("inv.status")}</TableHead>
              <TableHead className="text-end">{ta("act.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={7} />
            ) : rows.length === 0 ? (
              <EmptyState cols={7} message={ta("act.noData")} icon={<FileText className="w-8 h-8" />} />
            ) : (
              rows.map((inv) => {
                const overdue = isOverdue(inv);
                return (
                  <TableRow key={inv.id} className={overdue ? "bg-rose-50/50 dark:bg-rose-950/10" : ""}>
                    <TableCell className="font-medium font-mono text-xs">
                      {inv.invoiceNumber}
                      {(inv.notes ?? "").length > 0 && (
                        <span title={inv.notes ?? ""} className="ms-1 text-muted-foreground">
                          <StickyNote className="inline w-3 h-3 -mt-0.5" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <NameCell primary={inv.clientName ?? "—"} maxWidth="max-w-[200px]" />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {format(new Date(inv.issueDate), "dd MMM yyyy", { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {inv.dueDate ? (
                        <span className={overdue ? "text-rose-600 font-medium" : "text-muted-foreground"}>
                          {format(new Date(inv.dueDate), "dd MMM yyyy", { locale: dateLocale })}
                          {overdue && (
                            <span className="ms-1 inline-flex items-center text-[10px] gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end font-semibold text-sm tabular-nums whitespace-nowrap">
                      {Number(inv.total).toLocaleString()}
                      <span className="text-muted-foreground font-normal text-[10px] ms-1">
                        {isRtl ? "ج.م" : "EGP"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={overdue ? "overdue" : inv.status}
                        label={overdue ? (isRtl ? "متأخرة" : "Overdue") : labelForStatus(inv.status, isRtl, ta)}
                      />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1.5">
                        {inv.status !== "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:inline-flex h-8 gap-1 text-xs"
                            onClick={() => { setSelectedInvoice(inv.id); setIsPaidDialogOpen(true); }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {ta("act.markPaid")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={isRtl ? "كشف العميل" : "Client statement"}
                          onClick={() => setLocation(`/admin/statements?clientId=${inv.clientId}`)}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={ta("act.view")}
                          onClick={() => setLocation(`/admin/invoices/${inv.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

function Row({
  label,
  value,
  isRtl,
  bold = false,
}: {
  label: string;
  value: number;
  isRtl: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold text-base" : "font-medium"}`}>
        {value.toLocaleString()} <span className="text-muted-foreground text-xs font-normal">{isRtl ? "ج.م" : "EGP"}</span>
      </span>
    </div>
  );
}

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
  tone?: "primary" | "amber" | "blue" | "emerald" | "violet" | "rose" | "gray";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    gray: "bg-muted text-muted-foreground",
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

function labelForStatus(s: string, isRtl: boolean, ta: (k: string) => string): string {
  if (s === "draft") return isRtl ? "مسودة" : "Draft";
  if (s === "sent") return isRtl ? "مُرسلة" : "Sent";
  if (s === "paid") return ta("status.paid") || (isRtl ? "مدفوع" : "Paid");
  if (s === "overdue") return isRtl ? "متأخرة" : "Overdue";
  if (s === "cancelled") return ta("status.cancelled") || (isRtl ? "ملغية" : "Cancelled");
  return s;
}
