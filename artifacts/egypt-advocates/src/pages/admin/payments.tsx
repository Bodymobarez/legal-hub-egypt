import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useListAdminPayments,
  // Assuming a mutation exists to confirm/update payment
  getListAdminPaymentsQueryKey,
  PaymentStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Filter, Receipt, CheckCircle } from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { PageHeader, SkeletonRows, EmptyState, SectionCard, FilterBar, FormSection, FieldGrid, FormFooter, DialogShell, AdminDialog, TableActions, StatusBadge, TwoLineCell } from "@/components/admin-ui";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminPayments() {
  const [, setLocation] = useLocation();
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");

  const queryParams = {
    ...(status !== "all" && { status: status as PaymentStatus }),
  };

  const { data, isLoading } = useListAdminPayments(queryParams);

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending":   return <Badge className="bg-amber-100 text-amber-800 border-none">{ta("status.pending")}</Badge>;
      case "confirmed": return <Badge className="bg-emerald-100 text-emerald-800 border-none">{isRtl ? "مؤكد" : "Confirmed"}</Badge>;
      case "failed":    return <Badge className="bg-rose-100 text-rose-800 border-none">{isRtl ? "فشل" : "Failed"}</Badge>;
      case "refunded":  return <Badge className="bg-gray-200 text-gray-800 border-none">{isRtl ? "مُسترد" : "Refunded"}</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={ta("pay.title")}
        subtitle={isRtl ? "تتبع وتأكيد معاملات الدفع" : "Track & confirm payment transactions"}
        icon={<Receipt className="w-5 h-5" />}
        dir={isRtl ? "rtl" : "ltr"}
      />

      <SectionCard>
        <FilterBar>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ta("act.all")}</SelectItem>
                <SelectItem value="pending">{ta("status.pending")}</SelectItem>
                <SelectItem value="confirmed">{isRtl ? "مؤكد" : "Confirmed"}</SelectItem>
                <SelectItem value="failed">{isRtl ? "فشل" : "Failed"}</SelectItem>
                <SelectItem value="refunded">{isRtl ? "مُسترد" : "Refunded"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FilterBar>
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead>{ta("pay.client")}</TableHead>
                <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                <TableHead>{ta("pay.method")}</TableHead>
                <TableHead>{ta("pay.amount")}</TableHead>
                <TableHead>{ta("pay.date")}</TableHead>
                <TableHead>{ta("pay.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : data?.length === 0 ? (
                <EmptyState cols={6} message={ta("act.noData")} />
              ) : (
                data?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <TwoLineCell
                        primary={payment.clientName ?? "—"}
                        secondary={`REF-${payment.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {payment.appointmentId
                          ? `${isRtl ? "موعد" : "Appt."} #${payment.appointmentId}`
                          : payment.invoiceId
                            ? `${isRtl ? "فاتورة" : "Invoice"} #${payment.invoiceId}`
                            : (isRtl ? "أخرى" : "Other")}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium uppercase whitespace-nowrap">{payment.method.replace("_", " ")}</TableCell>
                    <TableCell className="font-semibold text-sm tabular-nums whitespace-nowrap">
                      {payment.amountEgp.toLocaleString()} <span className="text-muted-foreground font-normal text-xs">{isRtl ? "ج.م" : "EGP"}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{format(new Date(payment.createdAt), "dd MMM yy")}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </SectionCard>
    </div>
  );
}
