import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useListAdminAppointments, 
  useUpdateAdminAppointment,
  getListAdminAppointmentsQueryKey,
  AppointmentStatus,
  UpdateAppointmentInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Filter, MoreHorizontal, Check, X, Edit, CheckCircle, Video } from "lucide-react";
import { useLocation } from "wouter";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useAdminI18n } from "@/lib/admin-i18n";
import { PageHeader, SkeletonRows, EmptyState, SectionCard, FilterBar, FormSection, FieldGrid, FormFooter, DialogShell, AdminDialog, TableActions, StatusBadge, NameCell, TwoLineCell } from "@/components/admin-ui";

export default function AdminAppointments() {
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<string>("all");
  
  const queryParams = {
    ...(status !== "all" && { status: status as AppointmentStatus }),
  };

  const { data, isLoading } = useListAdminAppointments(queryParams);
  const updateAppointment = useUpdateAdminAppointment();

  // Basic inline actions
  const handleStatusChange = async (id: number, newStatus: AppointmentStatus, payload: Partial<UpdateAppointmentInput> = {}) => {
    try {
      await updateAppointment.mutateAsync({ id, data: { ...payload, status: newStatus } });
      toast.success(ta(`status.${newStatus}`) || newStatus);
      queryClient.invalidateQueries({ queryKey: getListAdminAppointmentsQueryKey() });
    } catch { toast.error("Error"); }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending":   return <Badge className="bg-amber-100 text-amber-800">{ta("status.pending")}</Badge>;
      case "approved":  return <Badge className="bg-blue-100 text-blue-800">{ta("status.approved")}</Badge>;
      case "completed": return <Badge className="bg-emerald-100 text-emerald-800">{ta("status.completed")}</Badge>;
      case "rejected":  return <Badge className="bg-rose-100 text-rose-800">{ta("status.rejected")}</Badge>;
      case "cancelled": return <Badge className="bg-gray-100 text-gray-800">{ta("status.cancelled")}</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={ta("appts.title")}
        subtitle={isRtl ? "إدارة حجوزات الاستشارات" : "Manage consultation bookings"}
        icon={<CalendarDays className="w-5 h-5" />}
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
                <SelectItem value="approved">{ta("status.approved")}</SelectItem>
                <SelectItem value="completed">{ta("status.completed")}</SelectItem>
                <SelectItem value="rejected">{ta("status.rejected")}</SelectItem>
                <SelectItem value="cancelled">{ta("status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FilterBar>
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead>{ta("appts.client")}</TableHead>
                <TableHead>{ta("appts.service")}</TableHead>
                <TableHead>{ta("appts.date")}</TableHead>
                <TableHead>{ta("appts.mode")}</TableHead>
                <TableHead>{ta("appts.status")}</TableHead>
                <TableHead className="text-end">{ta("act.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : (data?.length ?? 0) === 0 ? (
                <EmptyState cols={6} message={ta("act.noData")} />
              ) : (
                data?.map((apt: any) => (
                  <TableRow key={apt.id}>
                    <TableCell>
                      <TwoLineCell primary={apt.clientName} secondary={apt.clientEmail} />
                    </TableCell>
                    <TableCell>
                      <NameCell
                        primary={(isRtl ? apt.serviceNameAr : apt.serviceNameEn) || `#${apt.serviceId}`}
                        secondary={(isRtl ? apt.lawyerNameAr : apt.lawyerNameEn) || undefined}
                        maxWidth="max-w-[200px]"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium text-sm">{format(new Date(apt.scheduledAt), "dd MMM yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(apt.scheduledAt), "h:mm a")}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {apt.mode === "online" ? ta("appts.online") : ta("appts.inOffice")}
                        </Badge>
                        {apt.mode === "online" && apt.status === "approved" && (
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[10px] gap-1 bg-primary/90 hover:bg-primary"
                            onClick={() => setLocation(`/admin/appointments/${apt.id}/meeting`)}
                          >
                            <Video className="w-3 h-3" />
                            {isRtl ? "دخول" : "Join"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{ta("act.actions")}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {apt.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "approved")}>
                                <Check className="mr-2 h-4 w-4 text-emerald-600" /> {ta("act.approve")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "rejected")}>
                                <X className="mr-2 h-4 w-4 text-rose-600" /> {ta("act.reject")}
                              </DropdownMenuItem>
                            </>
                          )}
                          {apt.status === "approved" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "completed")}>
                              <CheckCircle className="mr-2 h-4 w-4 text-blue-600" /> {ta("act.complete")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "cancelled")}>
                            {ta("status.cancelled")}
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
    </div>
  );
}
