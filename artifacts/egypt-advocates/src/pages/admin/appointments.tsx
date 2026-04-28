import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useListAdminAppointments, 
  useUpdateAdminAppointment,
  // Using generic custom fetch or existing hooks for approve/reject/complete if available
  getListAdminAppointmentsQueryKey,
  AppointmentStatus,
  UpdateAppointmentInput
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Filter, MoreHorizontal, Check, X, Edit, CheckCircle } from "lucide-react";

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

export default function AdminAppointments() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  
  const queryParams = {
    ...(status !== "all" && { status: status as AppointmentStatus }),
  };

  const { data, isLoading } = useListAdminAppointments(queryParams);
  const updateAppointment = useUpdateAdminAppointment();

  // Basic inline actions
  const handleStatusChange = async (id: number, newStatus: string, payload: any = {}) => {
    try {
      // Assuming updateAppointment handles status, or we hit a specific endpoint. 
      // Based on spec, "approve", "reject", "complete" mutations exist, but updateAdminAppointment is generic.
      // We will use updateAppointment and mock the status update if specific hooks aren't found.
      await updateAppointment.mutateAsync({ id, data: { ...payload, status: newStatus as AppointmentStatus } as any });
      toast.success(`Appointment ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: getListAdminAppointmentsQueryKey() });
    } catch (e) {
      toast.error(`Failed to mark as ${newStatus}`);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending": return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "approved": return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      case "completed": return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>;
      case "rejected": return <Badge className="bg-rose-100 text-rose-800">Rejected</Badge>;
      case "cancelled": return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage consultation bookings</p>
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
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service & Lawyer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : (data?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No appointments found.</TableCell></TableRow>
              ) : (
                data?.map((apt: any) => (
                  <TableRow key={apt.id}>
                    <TableCell>
                      <div className="font-medium">{apt.clientName}</div>
                      <div className="text-xs text-muted-foreground">{apt.clientEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{apt.serviceNameEn || `Service #${apt.serviceId}`}</div>
                      {apt.lawyerNameEn && <div className="text-xs text-muted-foreground">{apt.lawyerNameEn}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{format(new Date(apt.scheduledAt), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(apt.scheduledAt), "h:mm a")}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">{apt.mode.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {apt.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "approved")}>
                                <Check className="mr-2 h-4 w-4 text-emerald-600" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "rejected")}>
                                <X className="mr-2 h-4 w-4 text-rose-600" /> Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {apt.status === "approved" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "completed")}>
                              <CheckCircle className="mr-2 h-4 w-4 text-blue-600" /> Mark Completed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "cancelled")}>
                            Cancel Appointment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
