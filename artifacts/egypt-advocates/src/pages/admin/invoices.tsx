import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useListAdminInvoices, 
  useCreateAdminInvoice, 
  useMarkInvoicePaid,
  getListAdminInvoicesQueryKey,
  InvoiceStatus,
  CreateInvoiceInputStatus,
  InvoicePaymentMethod,
  useListAdminClients
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Filter, Receipt, FileText, CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminI18n } from "@/lib/admin-i18n";
import { PageHeader, SkeletonRows, EmptyState, SectionCard, FilterBar, FormSection, FieldGrid, FormFooter, DialogShell, AdminDialog, TableActions, StatusBadge, NameCell } from "@/components/admin-ui";

const formSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  caseId: z.coerce.number().optional().nullable(),
  status: z.nativeEnum(CreateInvoiceInputStatus),
  currency: z.string().default("EGP"),
  taxPercent: z.coerce.number().min(0).max(100).default(14),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export default function AdminInvoices() {
  const [, setLocation] = useLocation();
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);

  const queryParams = {
    ...(status !== "all" && { status: status as InvoiceStatus }),
  };

  const { data, isLoading } = useListAdminInvoices(queryParams);
  const createInvoice = useCreateAdminInvoice();
  const markPaid = useMarkInvoicePaid();
  
  const { data: clients } = useListAdminClients({
});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: 0,
      caseId: null,
      status: CreateInvoiceInputStatus.draft,
      currency: "EGP",
      taxPercent: 14,
      dueDate: "",
      notes: "",
    },
  });

  const paidForm = useForm({
    defaultValues: {
      paymentMethod: InvoicePaymentMethod.bank_transfer,
      paymentReference: "",
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload = {
        ...values,
        items: [{ description: "Legal Services", quantity: 1, unitPriceEgp: 1000 }],
        issueDate: new Date().toISOString().slice(0, 10),
      };
      await createInvoice.mutateAsync({ data: payload });
      toast.success(ta("inv.add"));
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      setIsNewDialogOpen(false);
      form.reset();
    } catch { toast.error("Error"); }
  };

  const onMarkPaidSubmit = async (values: any) => {
    if (!selectedInvoice) return;
    try {
      await markPaid.mutateAsync({ id: selectedInvoice, data: values });
      toast.success(ta("act.markPaid"));
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      setIsPaidDialogOpen(false);
      paidForm.reset();
    } catch { toast.error("Error"); }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "draft":     return <Badge className="bg-gray-100 text-gray-800 border-none">{isRtl ? "مسودة" : "Draft"}</Badge>;
      case "sent":      return <Badge className="bg-blue-100 text-blue-800 border-none">{isRtl ? "مُرسلة" : "Sent"}</Badge>;
      case "paid":      return <Badge className="bg-emerald-100 text-emerald-800 border-none">{ta("status.paid")}</Badge>;
      case "overdue":   return <Badge className="bg-rose-100 text-rose-800 border-none">{isRtl ? "متأخرة" : "Overdue"}</Badge>;
      case "cancelled": return <Badge className="bg-gray-200 text-gray-600 border-none">{ta("status.cancelled")}</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader title={ta("inv.title")} subtitle={isRtl ? "إدارة الفواتير والمدفوعات" : "Manage invoices & payments"} icon={<FileText className="w-5 h-5" />} dir={isRtl ? "rtl" : "ltr"} action={
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />{ta("inv.add")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0" dir={isRtl ? "rtl" : "ltr"}>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
              <AdminDialog
                title={ta("inv.add")}
                subtitle={isRtl ? "إنشاء فاتورة جديدة" : "Create new invoice"}
                icon={<FileText className="w-4 h-4" />}
                dir={isRtl ? "rtl" : "ltr"}
                footer={<>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsNewDialogOpen(false)}>{ta("act.cancel")}</Button>
                  <Button type="submit" size="sm" disabled={createInvoice.isPending}>{createInvoice.isPending ? ta("act.saving") : ta("act.save")}</Button>
                </>}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ta("inv.client")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ta("inv.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="draft">{isRtl ? "مسودة" : "Draft"}</SelectItem>
                          <SelectItem value="sent">{isRtl ? "مُرسلة" : "Sent"}</SelectItem>
                          <SelectItem value="paid">{ta("status.paid")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel>{ta("inv.due")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="taxPercent" render={({ field }) => (
                    <FormItem><FormLabel>{isRtl ? "نسبة الضريبة %" : "Tax %"}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </AdminDialog>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Mark Paid Dialog */}
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"} className="overflow-hidden p-0 gap-0">

          <Form {...paidForm}>
            <form onSubmit={paidForm.handleSubmit(onMarkPaidSubmit)} className="admin-form">
            <AdminDialog
              title={ta("act.markPaid")}
              subtitle={isRtl ? "تأكيد استلام الدفع" : "Confirm payment receipt"}
              icon={<FileText className="w-4 h-4" />}
              dir={isRtl ? "rtl" : "ltr"}
              footer={<>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPaidDialogOpen(false)}>{ta("act.cancel")}</Button>
                <Button type="submit" size="sm" disabled={markPaid.isPending}>{ta("act.confirm")}</Button>
              </>}
            >
              <FormField control={paidForm.control} name="paymentMethod" render={({ field }) => (
                <FormItem>
                  <FormLabel>{ta("pay.method")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">{isRtl ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                      <SelectItem value="cash">{isRtl ? "نقداً" : "Cash"}</SelectItem>
                      <SelectItem value="visa">{isRtl ? "بطاقة ائتمان" : "Credit Card"}</SelectItem>
                      <SelectItem value="instapay">InstaPay</SelectItem>
                      <SelectItem value="vodafone_cash">Vodafone Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={paidForm.control} name="paymentReference" render={({ field }) => (
                <FormItem>
                  <FormLabel>{ta("pay.reference")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
            </AdminDialog>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <SectionCard>
        <FilterBar>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ta("act.all")}</SelectItem>
                <SelectItem value="draft">{isRtl ? "مسودة" : "Draft"}</SelectItem>
                <SelectItem value="sent">{isRtl ? "مُرسلة" : "Sent"}</SelectItem>
                <SelectItem value="paid">{ta("status.paid")}</SelectItem>
                <SelectItem value="overdue">{isRtl ? "متأخرة" : "Overdue"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FilterBar>
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead>{ta("inv.number")}</TableHead>
                <TableHead>{ta("inv.client")}</TableHead>
                <TableHead>{ta("inv.issued")}</TableHead>
                <TableHead>{ta("inv.amount")}</TableHead>
                <TableHead>{ta("inv.status")}</TableHead>
                <TableHead className="text-end">{ta("act.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : data?.length === 0 ? (
                <EmptyState cols={6} message={ta("act.noData")} />
              ) : (
                data?.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium font-mono">{inv.invoiceNumber}</TableCell>
                    <TableCell><NameCell primary={inv.clientName} maxWidth="max-w-[180px]" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{format(new Date(inv.issueDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-semibold text-sm tabular-nums whitespace-nowrap">{inv.total.toLocaleString()} <span className="text-muted-foreground font-normal text-xs">EGP</span></TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        {inv.status !== "paid" && (
                          <Button variant="outline" size="sm" className="hidden sm:flex"
                            onClick={() => { setSelectedInvoice(inv.id); setIsPaidDialogOpen(true); }}>
                            {ta("act.markPaid")}
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => setLocation(`/admin/invoices/${inv.id}`)}>
                          {ta("act.view")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </SectionCard>
    </div>
  );
}
