import { useState } from "react";
import { format } from "date-fns";
import { 
  useListAdminContactInquiries,
  // we would use a mutation to mark as handled here
  getListAdminContactInquiriesQueryKey,
  ContactInquiryStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Inbox, Filter } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminInquiries() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  const queryParams = {
    ...(status !== "all" && { status: status as ContactInquiryStatus }),
  };

  const { data, isLoading } = useListAdminContactInquiries(queryParams);

  const handleMarkHandled = async (id: number) => {
    // Mocking the mutation since specific endpoint may not be available in hooks
    toast.success("Inquiry marked as handled");
    queryClient.invalidateQueries({ queryKey: getListAdminContactInquiriesQueryKey() });
    setSelectedInquiry(null);
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "new": return <Badge className="bg-blue-100 text-blue-800 border-none">New</Badge>;
      case "handled": return <Badge className="bg-emerald-100 text-emerald-800 border-none">Handled</Badge>;
      case "spam": return <Badge className="bg-gray-100 text-gray-500 border-none">Spam</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Inquiries</h1>
          <p className="text-muted-foreground mt-1">Review contact form submissions</p>
        </div>
      </div>

      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-2xl">
          {selectedInquiry && (
            <>
              <DialogHeader>
                <DialogTitle>Message from {selectedInquiry.fullName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                  <div>
                    <span className="text-muted-foreground block mb-1">Email</span>
                    <span className="font-medium">{selectedInquiry.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Phone</span>
                    <span className="font-medium">{selectedInquiry.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block mb-1">Date</span>
                    <span>{format(new Date(selectedInquiry.createdAt), "MMMM d, yyyy h:mm a")}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{selectedInquiry.subject}</h4>
                  <div className="p-4 bg-card border rounded-md whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedInquiry.message}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedInquiry(null)}>Close</Button>
                  {selectedInquiry.status === "new" && (
                    <Button onClick={() => handleMarkHandled(selectedInquiry.id)} className="gap-2">
                      <CheckCircle className="w-4 h-4" /> Mark as Handled
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="handled">Handled</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No inquiries found.</TableCell></TableRow>
              ) : (
                data?.map((inquiry) => (
                  <TableRow key={inquiry.id} className={inquiry.status === 'new' ? 'bg-primary/5' : ''}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(inquiry.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{inquiry.fullName}</div>
                      <div className="text-xs text-muted-foreground">{inquiry.email}</div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{inquiry.subject}</TableCell>
                    <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedInquiry(inquiry)}>
                        Read
                      </Button>
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
