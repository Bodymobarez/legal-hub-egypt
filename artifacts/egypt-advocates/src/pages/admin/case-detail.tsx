import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useGetAdminCase, 
  useUpdateAdminCase, 
  useDeleteAdminCase,
  getGetAdminCaseQueryKey,
  UpdateCaseInputStatus,
  UpdateCaseInputPriority,
  useListAdminClients,
  useListAdminLawyers,
  useListPracticeAreas,
  // we would useAddCaseEvent if it was exported, assuming useCreateCaseEvent doesn't exist on admin space, we'll mock the hook for events or just use edit case
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash, FileText, Scale, User, Calendar as CalIcon, MapPin, CheckCircle2, FileClock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  lawyerId: z.coerce.number().optional().nullable(),
  practiceAreaId: z.coerce.number().optional().nullable(),
  titleAr: z.string().min(1),
  titleEn: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(UpdateCaseInputStatus),
  priority: z.nativeEnum(UpdateCaseInputPriority),
  courtName: z.string().optional(),
});

export default function AdminCaseDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialog] = useState(false);

  const { data: caseWrapper, isLoading } = useGetAdminCase(id);
  const updateCase = useUpdateAdminCase();
  const deleteCase = useDeleteAdminCase();
  
  const c = caseWrapper?.case;
  
  const { data: lawyers } = useListAdminLawyers();
  const { data: practiceAreas } = useListPracticeAreas();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lawyerId: null,
      practiceAreaId: null,
      titleAr: "",
      titleEn: "",
      description: "",
      status: UpdateCaseInputStatus.open,
      priority: UpdateCaseInputPriority.medium,
      courtName: "",
    },
  });

  useEffect(() => {
    if (c) {
      form.reset({
        lawyerId: c.lawyerId,
        practiceAreaId: c.practiceAreaId,
        titleAr: c.titleAr,
        titleEn: c.titleEn,
        description: c.description || "",
        status: c.status as UpdateCaseInputStatus,
        priority: c.priority as UpdateCaseInputPriority,
        courtName: c.courtName || "",
      });
    }
  }, [c, form]);

  const onEditSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateCase.mutateAsync({ id, data: values });
      toast.success("Case updated");
      queryClient.invalidateQueries({ queryKey: getGetAdminCaseQueryKey(id) });
      setIsEditDialog(false);
    } catch (e) {
      toast.error("Failed to update case");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCase.mutateAsync({ id });
      toast.success("Case deleted");
      setLocation("/admin/cases");
    } catch (e) {
      toast.error("Failed to delete case");
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading case...</div>;
  if (!c) return <div className="p-8 text-center">Case not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/admin/cases")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-primary">{c.titleEn}</h1>
            <Badge variant="outline" className="font-mono text-muted-foreground">{c.caseNumber}</Badge>
          </div>
        </div>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2"><Edit className="h-4 w-4" /> Edit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Case Details</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="lawyerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Lawyer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="null">Unassigned</SelectItem>
                          {lawyers?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.nameEn}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="practiceAreaId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practice Area</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="null">None</SelectItem>
                          {practiceAreas?.map(pa => <SelectItem key={pa.id} value={String(pa.id)}>{pa.nameEn}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
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
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
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
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="titleEn" render={({ field }) => (
                    <FormItem><FormLabel>Title (EN)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="titleAr" render={({ field }) => (
                    <FormItem><FormLabel>Title (AR)</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="courtName" render={({ field }) => (
                    <FormItem><FormLabel>Court Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialog(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateCase.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2"><Trash className="h-4 w-4" /> Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the case and its history.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg">Case Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose max-w-none text-sm">
                <p>{c.description || "No description provided."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className="uppercase">{c.status.replace("_", " ")}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Priority</p>
                  <Badge variant="outline" className="uppercase">{c.priority}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Court</p>
                  <p className="text-sm">{c.courtName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Opened At</p>
                  <p className="text-sm">{format(new Date(c.openedAt), "MMMM d, yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2"><FileClock className="h-5 w-5" /> Timeline</CardTitle>
              <Button variant="outline" size="sm">Add Event</Button>
            </CardHeader>
            <CardContent className="p-6">
              {caseWrapper?.events && caseWrapper.events.length > 0 ? (
                <div className="space-y-4">
                  {caseWrapper.events.map((e, i) => (
                    <div key={e.id} className="flex gap-4 relative">
                      {i !== caseWrapper.events.length - 1 && (
                        <div className="absolute left-2 top-6 bottom-[-20px] w-px bg-border"></div>
                      )}
                      <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary shrink-0 mt-1 z-10 bg-background"></div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{e.title}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(e.occurredAt), "MMM d, yyyy h:mm a")}</p>
                        </div>
                        {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No events recorded on this case.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Client</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="font-medium">{caseWrapper?.client?.fullName ?? "Client"}</span>
                <Link href={`/admin/clients/${c.clientId}`} className="text-sm text-primary hover:underline mt-2 inline-flex items-center">
                  View Client Profile
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2"><Scale className="h-5 w-5" /> Representation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Assigned Lawyer</p>
                <p className="font-medium">{(lawyers?.find(l => l.id === c.lawyerId)?.nameEn) || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Practice Area</p>
                <p className="font-medium">{(practiceAreas?.find(p => p.id === c.practiceAreaId)?.nameEn) || "General"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
