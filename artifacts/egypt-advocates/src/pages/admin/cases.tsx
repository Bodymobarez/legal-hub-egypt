import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useListAdminCases, 
  useCreateAdminCase, 
  getListAdminCasesQueryKey,
  CaseStatus,
  CreateCaseInputStatus,
  CreateCaseInputPriority,
  useListAdminClients,
  useListAdminLawyers,
  useListPracticeAreas
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Filter, Briefcase, Scale } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  clientId: z.coerce.number().min(1, "Client is required"),
  lawyerId: z.coerce.number().optional().nullable(),
  practiceAreaId: z.coerce.number().optional().nullable(),
  titleAr: z.string().min(1, "Arabic title is required"),
  titleEn: z.string().min(1, "English title is required"),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  status: z.nativeEnum(CreateCaseInputStatus),
  priority: z.nativeEnum(CreateCaseInputPriority),
});

export default function AdminCases() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const queryParams = {
    ...(q && { q }),
    ...(status !== "all" && { status: status as CaseStatus }),
  };

  const { data, isLoading } = useListAdminCases(queryParams);
  const createCase = useCreateAdminCase();
  
  // Data for selects
  const { data: clients } = useListAdminClients({
});
  const { data: lawyers } = useListAdminLawyers();
  const { data: practiceAreas } = useListPracticeAreas();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: 0,
      lawyerId: null,
      practiceAreaId: null,
      titleAr: "",
      titleEn: "",
      descriptionAr: "",
      descriptionEn: "",
      status: CreateCaseInputStatus.open,
      priority: CreateCaseInputPriority.medium,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createCase.mutateAsync({ data: { ...values, description: (values as any).descriptionEn || (values as any).descriptionAr || "" } });
      toast.success("Case created successfully");
      queryClient.invalidateQueries({ queryKey: getListAdminCasesQueryKey() });
      setIsNewDialogOpen(false);
      form.reset();
    } catch (e) {
      toast.error("Failed to create case");
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "open": return <Badge className="bg-blue-100 text-blue-800 border-none">Open</Badge>;
      case "in_progress": return <Badge className="bg-amber-100 text-amber-800 border-none">In Progress</Badge>;
      case "closed": return <Badge className="bg-gray-100 text-gray-800 border-none">Closed</Badge>;
      case "won": return <Badge className="bg-emerald-100 text-emerald-800 border-none">Won</Badge>;
      case "lost": return <Badge className="bg-rose-100 text-rose-800 border-none">Lost</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Cases</h1>
          <p className="text-muted-foreground mt-1">Manage active and past legal cases</p>
        </div>

        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lawyerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Lawyer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Unassigned</SelectItem>
                            {lawyers?.map(l => (
                              <SelectItem key={l.id} value={String(l.id)}>{l.nameEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="practiceAreaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Practice Area</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select practice area" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">None</SelectItem>
                            {practiceAreas?.map(pa => (
                              <SelectItem key={pa.id} value={String(pa.id)}>{pa.nameEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="won">Won</SelectItem>
                              <SelectItem value="lost">Lost</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField control={form.control} name="titleEn" render={({ field }) => (
                    <FormItem><FormLabel>Title (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="titleAr" render={({ field }) => (
                    <FormItem><FormLabel>Title (Arabic)</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="descriptionEn" render={({ field }) => (
                    <FormItem><FormLabel>Description (English)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="descriptionAr" render={({ field }) => (
                    <FormItem><FormLabel>Description (Arabic)</FormLabel><FormControl><Textarea {...field} dir="rtl" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createCase.isPending}>
                    {createCase.isPending ? "Creating..." : "Create Case"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases by number or title..."
                className="pl-8"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status & Priority</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No cases found.</TableCell></TableRow>
              ) : (
                data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium font-mono">{c.caseNumber}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.titleEn}</TableCell>
                    <TableCell>{c.clientName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(c.status)}
                        <Badge variant="outline" className="text-xs uppercase">{c.priority}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.openedAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setLocation(`/admin/cases/${c.id}`)}>
                        Manage
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
