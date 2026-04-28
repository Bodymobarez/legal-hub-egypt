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
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");

  const queryParams = {
    ...(status !== "all" && { status: status as PaymentStatus }),
  };

  const { data, isLoading } = useListAdminPayments(queryParams);

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending": return <Badge className="bg-amber-100 text-amber-800 border-none">Pending</Badge>;
      case "confirmed": return <Badge className="bg-emerald-100 text-emerald-800 border-none">Confirmed</Badge>;
      case "failed": return <Badge className="bg-rose-100 text-rose-800 border-none">Failed</Badge>;
      case "refunded": return <Badge className="bg-gray-200 text-gray-800 border-none">Refunded</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage payment transactions</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments found.</TableCell></TableRow>
              ) : (
                data?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">{(payment.clientName ?? "—") || `PAY-${payment.id}`}</TableCell>
                    <TableCell>
                      {payment.appointmentId ? (
                        <div className="text-sm">Appointment #{payment.appointmentId}</div>
                      ) : payment.invoiceId ? (
                        <div className="text-sm cursor-pointer hover:underline text-primary" onClick={() => setLocation(`/admin/invoices/${payment.invoiceId}`)}>Invoice #{payment.invoiceId}</div>
                      ) : "Other"}
                    </TableCell>
                    <TableCell className="uppercase text-xs">{payment.method.replace('_', ' ')}</TableCell>
                    <TableCell className="font-medium">{payment.amountEgp.toLocaleString()} EGP</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(payment.createdAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
