import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  customFetch,
  useListAdminClients,
  type Client,
  type Invoice,
} from "@workspace/api-client-react";
import {
  Wallet,
  Search,
  User,
  Mail,
  Phone,
  FileText,
  Banknote,
  TrendingUp,
  TrendingDown,
  Printer,
  Send,
  Eye,
  CalendarDays,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Hash,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminI18n } from "@/lib/admin-i18n";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin-ui";

/* ──────────────────────────────────────────────
   Types — mirror the backend response shape
   ────────────────────────────────────────────── */

type LedgerEntry = {
  type: "invoice" | "payment";
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  invoiceId?: number | null;
  invoiceNumber?: string | null;
  paymentId?: number;
  status?: string;
  dueDate?: string | null;
  method?: string;
  referenceNumber?: string | null;
};

type StatementResponse = {
  client: Client;
  invoices: Invoice[];
  payments: {
    id: number;
    invoiceId: number | null;
    invoiceNumber: string | null;
    amountEgp: number;
    method: string;
    status: string;
    referenceNumber: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
  ledger: LedgerEntry[];
  totals: {
    invoiced: number;
    paid: number;
    outstanding: number;
    invoiceCount: number;
    paymentCount: number;
  };
  byStatus: Record<string, { count: number; total: number }>;
};

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */
export default function AdminStatements() {
  const { ta, isRtl } = useAdminI18n();
  const [location] = useLocation();
  const dir = isRtl ? "rtl" : "ltr";
  const dateLocale = isRtl ? ar : enUS;

  /* Read ?clientId= from URL (set when arriving from invoices). */
  const initialClientId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("clientId");
    return v ? Number(v) : null;
  }, [location]);

  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClientId);

  const { data: clients, isLoading: clientsLoading } = useListAdminClients({});

  /* When clients first load and nothing selected yet, pick the first client. */
  useEffect(() => {
    if (selectedClientId == null && clients && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  /** Fetch the statement for the selected client via direct customFetch. */
  const {
    data: statement,
    isLoading: stmtLoading,
    isFetching: stmtFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-statement", selectedClientId] as const,
    queryFn: async () => {
      if (selectedClientId == null) throw new Error("No client selected");
      return customFetch<StatementResponse>(`/api/admin/clients/${selectedClientId}/statement`);
    },
    enabled: selectedClientId != null,
    staleTime: 10_000,
  });

  /* ──────────────────────────────────────────────
     Filtered client list (with outstanding badges)
     ────────────────────────────────────────────── */
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.fullName} ${c.email} ${c.phone}`.toLowerCase().includes(q),
    );
  }, [clients, search]);

  /* ──────────────────────────────────────────────
     Render
     ────────────────────────────────────────────── */
  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={isRtl ? "كشف حساب العملاء" : "Customer Statements"}
        subtitle={isRtl ? "تابع المبالغ المستحقة على كل عميل وسداداته" : "Track each client's balance and payments"}
        icon={<Wallet className="w-5 h-5" />}
        dir={dir}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => refetch()}
              disabled={!selectedClientId || stmtFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${stmtFetching ? "animate-spin" : ""}`} />
              {isRtl ? "تحديث" : "Refresh"}
            </Button>
            {statement && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={() => sendStatementEmail(statement, isRtl)}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isRtl ? "إرسال بالبريد" : "Email statement"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isRtl ? "طباعة" : "Print"}
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Sidebar: client list ── */}
        <SectionCard className="lg:col-span-4 xl:col-span-3 self-start">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? "ابحث عن عميل…" : "Search clients…"}
                className="ps-9 h-9"
              />
              {search && (
                <button
                  type="button"
                  className="absolute top-1/2 -translate-y-1/2 end-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {clientsLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {isRtl ? "لا يوجد عملاء" : "No clients found"}
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {filteredClients.map((c) => {
                  const active = selectedClientId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-start transition-colors ${
                          active ? "bg-primary/10" : "hover:bg-muted/40"
                        }`}
                      >
                        <Avatar name={c.fullName} active={active} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-medium truncate ${active ? "text-primary" : ""}`}>
                            {c.fullName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{c.email || c.phone}</div>
                        </div>
                        {isRtl ? (
                          <ChevronLeft className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-muted-foreground/50"}`} />
                        ) : (
                          <ChevronRight className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-muted-foreground/50"}`} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SectionCard>

        {/* ── Main: statement detail ── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {selectedClientId == null ? (
            <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
              <Wallet className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{isRtl ? "اختر عميلاً لعرض كشف حسابه" : "Pick a client to view their statement"}</p>
            </div>
          ) : stmtLoading || !statement ? (
            <StatementSkeleton />
          ) : (
            <StatementView statement={statement} isRtl={isRtl} ta={ta} dateLocale={dateLocale} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Statement view
   ────────────────────────────────────────────── */
function StatementView({
  statement,
  isRtl,
  ta,
  dateLocale,
}: {
  statement: StatementResponse;
  isRtl: boolean;
  ta: (k: string) => string;
  dateLocale: typeof ar;
}) {
  const [, setLocation] = useLocation();
  const { client, invoices, payments, ledger, totals } = statement;
  const today = new Date();

  const isOverdue = (inv: Invoice) => {
    if (inv.status === "paid" || inv.status === "cancelled") return false;
    if (!inv.dueDate) return false;
    try { return parseISO(inv.dueDate) < today; } catch { return false; }
  };

  return (
    <div className="space-y-5 print:space-y-3">
      {/* ── Client header card ── */}
      <SectionCard>
        <div className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
          <Avatar name={client.fullName} active size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold leading-tight">{client.fullName}</h2>
              <StatusBadge status={client.status} label={statusLabel(client.status, isRtl, ta)} />
            </div>
            <div className="mt-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground">
              {client.email && (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 hover:text-primary" dir="ltr">
                  <Mail className="w-3 h-3" />
                  {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 hover:text-primary" dir="ltr">
                  <Phone className="w-3 h-3" />
                  {client.phone}
                </a>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {isRtl ? "عميل منذ" : "Client since"}{" "}
                {format(new Date(client.createdAt), "MMM yyyy", { locale: dateLocale })}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Totals cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat
          icon={<TrendingUp className="w-4 h-4" />}
          label={isRtl ? "إجمالي مفوتر" : "Total invoiced"}
          value={`${totals.invoiced.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`}
          subtitle={`${totals.invoiceCount} ${isRtl ? "فاتورة" : "invoices"}`}
          tone="primary"
        />
        <BigStat
          icon={<CheckCircle2 className="w-4 h-4" />}
          label={isRtl ? "إجمالي مدفوع" : "Total paid"}
          value={`${totals.paid.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`}
          subtitle={`${totals.paymentCount} ${isRtl ? "دفعة" : "payments"}`}
          tone="emerald"
        />
        <BigStat
          icon={<Wallet className="w-4 h-4" />}
          label={isRtl ? "الرصيد المستحق" : "Outstanding balance"}
          value={`${totals.outstanding.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`}
          subtitle={
            totals.outstanding > 0
              ? isRtl ? "مطلوب من العميل" : "Owed by client"
              : isRtl ? "لا توجد مستحقات" : "Fully settled"
          }
          tone={totals.outstanding > 0 ? "amber" : "emerald"}
          big
        />
        <BigStat
          icon={<Hash className="w-4 h-4" />}
          label={isRtl ? "حركات" : "Transactions"}
          value={String(ledger.length)}
          subtitle={isRtl ? "بنود الحركة" : "Ledger entries"}
          tone="violet"
        />
      </div>

      {/* ── Ledger (running balance) ── */}
      <SectionCard>
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary/70" />
          <h3 className="font-semibold text-sm">{isRtl ? "حركة الحساب" : "Account ledger"}</h3>
          <span className="text-xs text-muted-foreground ms-auto">
            {isRtl ? "تتم القراءة من الأقدم للأحدث" : "Sorted oldest → newest"}
          </span>
        </div>
        {ledger.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {isRtl ? "لا توجد حركات بعد" : "No transactions yet"}
          </div>
        ) : (
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">{isRtl ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRtl ? "البيان" : "Description"}</TableHead>
                <TableHead className="text-end whitespace-nowrap">{isRtl ? "مدين" : "Debit"}</TableHead>
                <TableHead className="text-end whitespace-nowrap">{isRtl ? "دائن" : "Credit"}</TableHead>
                <TableHead className="text-end whitespace-nowrap">{isRtl ? "الرصيد" : "Balance"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((e, i) => (
                <TableRow key={`${e.type}-${i}`} className={e.type === "payment" ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""}>
                  <TableCell className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                    {format(parseISO(e.date), "dd MMM yyyy", { locale: dateLocale })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                          e.type === "invoice"
                            ? "bg-primary/10 text-primary"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {e.type === "invoice" ? <FileText className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {e.type === "invoice"
                            ? `${isRtl ? "فاتورة" : "Invoice"} ${e.invoiceNumber ?? ""}`
                            : `${isRtl ? "دفعة" : "Payment"}${e.invoiceNumber ? ` — ${e.invoiceNumber}` : ""}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.type === "invoice" ? (
                            <>
                              {e.dueDate && (
                                <span className="inline-flex items-center gap-1">
                                  {isRtl ? "تستحق" : "Due"}{" "}
                                  {format(parseISO(e.dueDate), "dd MMM yyyy", { locale: dateLocale })}
                                </span>
                              )}
                              {e.status && (
                                <span className="ms-2 capitalize">· {statusLabel(e.status, isRtl, ta)}</span>
                              )}
                            </>
                          ) : (
                            <>
                              {e.method && <span className="capitalize">{e.method.replace("_", " ")}</span>}
                              {e.referenceNumber && (
                                <span className="ms-1 font-mono text-muted-foreground/70">· {e.referenceNumber}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-end font-medium tabular-nums whitespace-nowrap">
                    {e.debit > 0 ? (
                      <span className="text-foreground">{e.debit.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end font-medium tabular-nums whitespace-nowrap">
                    {e.credit > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">{e.credit.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-end font-bold tabular-nums whitespace-nowrap ${
                      e.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {e.balance.toLocaleString()}
                    <span className="text-muted-foreground text-[10px] font-normal ms-1">
                      {isRtl ? "ج.م" : "EGP"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-bold">
                <TableCell />
                <TableCell className="text-end">{isRtl ? "الرصيد النهائي" : "Closing balance"}</TableCell>
                <TableCell className="text-end tabular-nums">{totals.invoiced.toLocaleString()}</TableCell>
                <TableCell className="text-end tabular-nums text-emerald-600 dark:text-emerald-400">
                  {totals.paid.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-end text-base tabular-nums ${
                    totals.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {totals.outstanding.toLocaleString()}
                  <span className="text-muted-foreground text-[10px] font-normal ms-1">
                    {isRtl ? "ج.م" : "EGP"}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* ── Two columns: invoices + payments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Invoices list */}
        <SectionCard>
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">{isRtl ? "كل الفواتير" : "All invoices"}</h3>
            <span className="text-xs text-muted-foreground ms-auto">{invoices.length}</span>
          </div>
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {isRtl ? "لا توجد فواتير لهذا العميل" : "No invoices for this client"}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {invoices.map((inv) => {
                const overdue = isOverdue(inv);
                return (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/admin/invoices/${inv.id}`)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                        <StatusBadge
                          status={overdue ? "overdue" : inv.status}
                          label={overdue ? (isRtl ? "متأخرة" : "Overdue") : statusLabel(inv.status, isRtl, ta)}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {format(new Date(inv.issueDate), "dd MMM yyyy", { locale: dateLocale })}
                        {inv.dueDate && (
                          <span className={overdue ? "text-rose-600 ms-2" : "ms-2"}>
                            · {isRtl ? "تستحق" : "due"}{" "}
                            {format(new Date(inv.dueDate), "dd MMM yyyy", { locale: dateLocale })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="font-semibold text-sm tabular-nums">
                        {Number(inv.total).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{isRtl ? "ج.م" : "EGP"}</div>
                    </div>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Payments list */}
        <SectionCard>
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">{isRtl ? "كل المدفوعات" : "All payments"}</h3>
            <span className="text-xs text-muted-foreground ms-auto">{payments.length}</span>
          </div>
          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {isRtl ? "لم يستلم العميل دفعات بعد" : "No payments received yet"}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{p.method.replace("_", " ")}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{p.status}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.invoiceNumber && <span className="font-mono">{p.invoiceNumber}</span>}
                      {p.referenceNumber && <span className="font-mono ms-1">· {p.referenceNumber}</span>}
                      {(p.paidAt || p.createdAt) && (
                        <span className="ms-1 tabular-nums">
                          ·{" "}
                          {format(new Date(p.paidAt ?? p.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="font-semibold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{p.amountEgp.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{isRtl ? "ج.م" : "EGP"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function StatementSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function Avatar({
  name,
  active = false,
  size = "md",
}: {
  name?: string | null;
  active?: boolean;
  size?: "md" | "lg";
}) {
  const initials = (name || "??")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const sz = size === "lg" ? "w-14 h-14 text-base" : "w-9 h-9 text-xs";
  return (
    <div
      className={`${sz} rounded-full font-semibold flex items-center justify-center shrink-0 ${
        active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
      }`}
    >
      {initials || "??"}
    </div>
  );
}

function BigStat({
  icon,
  label,
  value,
  subtitle,
  tone = "primary",
  big = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  tone?: "primary" | "amber" | "emerald" | "violet";
  big?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <div
      className={`rounded-xl border bg-card p-4 ${
        big ? "border-amber-200 dark:border-amber-900/40 ring-1 ring-amber-100 dark:ring-amber-900/20" : "border-border/60"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tones[tone]}`}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`mt-2 font-bold tabular-nums truncate ${big ? "text-2xl" : "text-xl"}`}>{value}</div>
      {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  );
}

function statusLabel(s: string, isRtl: boolean, ta: (k: string) => string): string {
  if (s === "draft") return isRtl ? "مسودة" : "Draft";
  if (s === "sent") return isRtl ? "مُرسلة" : "Sent";
  if (s === "paid") return ta("status.paid") || (isRtl ? "مدفوع" : "Paid");
  if (s === "overdue") return isRtl ? "متأخرة" : "Overdue";
  if (s === "cancelled") return ta("status.cancelled") || (isRtl ? "ملغية" : "Cancelled");
  if (s === "active") return isRtl ? "نشط" : "Active";
  if (s === "lead") return isRtl ? "محتمل" : "Lead";
  if (s === "inactive") return isRtl ? "غير نشط" : "Inactive";
  if (s === "archived") return isRtl ? "مؤرشف" : "Archived";
  return s;
}

/** Compose a plain-text statement and open the user's mail client. */
function sendStatementEmail(s: StatementResponse, isRtl: boolean) {
  const lang = isRtl ? "ar" : "en";
  const subject = lang === "ar"
    ? `كشف حساب — ${s.client.fullName}`
    : `Statement of account — ${s.client.fullName}`;

  const lines: string[] = [];
  lines.push(lang === "ar" ? `مرحباً ${s.client.fullName}،` : `Hello ${s.client.fullName},`);
  lines.push("");
  lines.push(
    lang === "ar"
      ? "نرفق لكم ملخص حسابكم لدى مكتبنا:"
      : "Please find below the summary of your account with our office:",
  );
  lines.push("");
  lines.push(`${lang === "ar" ? "إجمالي مفوتر" : "Total invoiced"}: ${s.totals.invoiced.toLocaleString()} EGP`);
  lines.push(`${lang === "ar" ? "إجمالي مدفوع" : "Total paid"}: ${s.totals.paid.toLocaleString()} EGP`);
  lines.push(`${lang === "ar" ? "الرصيد المستحق" : "Outstanding balance"}: ${s.totals.outstanding.toLocaleString()} EGP`);
  lines.push("");
  if (s.invoices.length) {
    lines.push(lang === "ar" ? "الفواتير:" : "Invoices:");
    s.invoices.forEach((i) => {
      lines.push(
        ` • ${i.invoiceNumber} — ${i.issueDate} — ${Number(i.total).toLocaleString()} EGP — ${i.status}`,
      );
    });
    lines.push("");
  }
  if (s.payments.length) {
    lines.push(lang === "ar" ? "المدفوعات:" : "Payments:");
    s.payments.forEach((p) => {
      lines.push(
        ` • ${p.amountEgp.toLocaleString()} EGP — ${p.method} — ${p.invoiceNumber ?? ""}${p.referenceNumber ? ` (${p.referenceNumber})` : ""}`,
      );
    });
    lines.push("");
  }
  lines.push(lang === "ar" ? "في حال وجود أي استفسار يُرجى التواصل معنا." : "Please contact us with any questions.");
  lines.push("");
  lines.push(lang === "ar" ? "مع التحية،" : "Best regards,");

  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", lines.join("\n"));
  const url = `mailto:${encodeURIComponent(s.client.email || "")}?${params.toString().replace(/\+/g, "%20")}`;
  if (typeof window !== "undefined") window.open(url, "_self");
}
