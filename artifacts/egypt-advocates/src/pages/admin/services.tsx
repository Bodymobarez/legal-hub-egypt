import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useListServices, 
  useCreateAdminService, 
  useUpdateAdminService,
  useDeleteAdminService,
  getListServicesQueryKey,
  useListPracticeAreas,
  CreateServiceInputDeliveryMode
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit, Trash, Settings } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
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
  slug: z.string().min(1, "Slug is required"),
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  descriptionAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  durationMinutes: z.coerce.number().min(1),
  priceEgp: z.coerce.number().min(0),
  deliveryMode: z.nativeEnum(CreateServiceInputDeliveryMode),
  practiceAreaId: z.coerce.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

export default function AdminServices() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useListServices();
  const { data: practiceAreas } = useListPracticeAreas();
  
  const createService = useCreateAdminService();
  const updateService = useUpdateAdminService();
  const deleteService = useDeleteAdminService();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      durationMinutes: 60,
      priceEgp: 0,
      deliveryMode: CreateServiceInputDeliveryMode.both,
      practiceAreaId: null,
      isActive: true,
    },
  });

  const openEdit = (service: any) => {
    form.reset({
      slug: service.slug,
      nameAr: service.nameAr,
      nameEn: service.nameEn,
      descriptionAr: service.descriptionAr,
      descriptionEn: service.descriptionEn,
      durationMinutes: service.durationMinutes,
      priceEgp: service.priceEgp,
      deliveryMode: service.deliveryMode as CreateServiceInputDeliveryMode,
      practiceAreaId: service.practiceAreaId,
      isActive: service.isActive,
    });
    setEditingId(service.id);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingId) {
        await updateService.mutateAsync({ id: editingId, data: values as any });
        toast.success("Service updated");
      } else {
        await createService.mutateAsync({ data: values as any });
        toast.success("Service created");
      }
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    } catch (e) {
      toast.error(editingId ? "Failed to update" : "Failed to create");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteService.mutateAsync({ id });
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    } catch (e) {
      toast.error("Failed to delete service");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Services</h1>
          <p className="text-muted-foreground mt-1">Manage consultation offerings and fees</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) { setEditingId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Service</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Service" : "Create Service"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="nameEn" render={({ field }) => (
                    <FormItem><FormLabel>Name (EN)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="nameAr" render={({ field }) => (
                    <FormItem><FormLabel>Name (AR)</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem><FormLabel>Slug (URL segment)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="practiceAreaId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practice Area (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="null">None</SelectItem>
                          {practiceAreas?.map(pa => <SelectItem key={pa.id} value={String(pa.id)}>{pa.nameEn}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                      <FormItem><FormLabel>Duration (Min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="priceEgp" render={({ field }) => (
                      <FormItem><FormLabel>Price (EGP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="deliveryMode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="in_office">In Office</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="descriptionEn" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Description (EN)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="descriptionAr" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Description (AR)</FormLabel><FormControl><Textarea rows={3} {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <p className="text-sm text-muted-foreground">Allow clients to book this service.</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createService.isPending || updateService.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No services found.</TableCell></TableRow>
              ) : (
                data?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium max-w-xs truncate">{service.nameEn}</TableCell>
                    <TableCell>{service.durationMinutes} min</TableCell>
                    <TableCell className="font-medium">{service.priceEgp.toLocaleString()} EGP</TableCell>
                    <TableCell className="uppercase text-xs">{service.deliveryMode.replace('_', ' ')}</TableCell>
                    <TableCell>
                      {service.isActive 
                        ? <Badge className="bg-emerald-100 text-emerald-800 border-none">Active</Badge>
                        : <Badge className="bg-gray-100 text-gray-800 border-none">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(service)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Service?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(service.id)} className="bg-destructive">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
