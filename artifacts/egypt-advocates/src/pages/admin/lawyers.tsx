import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useListLawyers, 
  useCreateAdminLawyer, 
  useUpdateAdminLawyer,
    getListLawyersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit, Trash, Scale } from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  titleAr: z.string().min(1),
  titleEn: z.string().min(1),
  bioAr: z.string().min(1),
  bioEn: z.string().min(1),
  photoUrl: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().min(1),
  specializations: z.string().min(1),
  yearsExperience: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
});

export default function AdminLawyers() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useListLawyers();
  const createLawyer = useCreateAdminLawyer();
  const updateLawyer = useUpdateAdminLawyer();
    const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      nameAr: "",
      nameEn: "",
      titleAr: "",
      titleEn: "",
      bioAr: "",
      bioEn: "",
      photoUrl: "",
      email: "",
      phone: "",
      specializations: "",
      yearsExperience: 0,
      isActive: true,
    },
  });

  const openEdit = (lawyer: any) => {
    form.reset({
      slug: lawyer.slug,
      nameAr: lawyer.nameAr,
      nameEn: lawyer.nameEn,
      titleAr: lawyer.titleAr,
      titleEn: lawyer.titleEn,
      bioAr: lawyer.bioAr,
      bioEn: lawyer.bioEn,
      photoUrl: lawyer.photoUrl || "",
      email: lawyer.email,
      phone: lawyer.phone,
      specializations: lawyer.specializations?.join(", ") || "",
      yearsExperience: lawyer.yearsExperience,
      isActive: lawyer.isActive,
    });
    setEditingId(lawyer.id);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      specializations: values.specializations ? values.specializations.split(",").map(t => t.trim()) : [],
    };

    try {
      if (editingId) {
        await updateLawyer.mutateAsync({ id: editingId, data: payload as any });
        toast.success("Lawyer updated");
      } else {
        await createLawyer.mutateAsync({ data: payload as any });
        toast.success("Lawyer created");
      }
      queryClient.invalidateQueries({ queryKey: getListLawyersQueryKey() });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    } catch (e) {
      toast.error(editingId ? "Failed to update" : "Failed to create");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await updateLawyer.mutateAsync({ id, data: { isActive: false } });
      toast.success("Lawyer deactivated");
      queryClient.invalidateQueries({ queryKey: getListLawyersQueryKey() });
    } catch (e) {
      toast.error("Failed to delete lawyer");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Lawyers</h1>
          <p className="text-muted-foreground mt-1">Manage firm attorneys and their profiles</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) { setEditingId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Lawyer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Lawyer" : "Add Lawyer"}</DialogTitle>
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
                  <FormField control={form.control} name="titleEn" render={({ field }) => (
                    <FormItem><FormLabel>Title (EN)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="titleAr" render={({ field }) => (
                    <FormItem><FormLabel>Title (AR)</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="photoUrl" render={({ field }) => (
                    <FormItem><FormLabel>Photo URL</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name="yearsExperience" render={({ field }) => (
                      <FormItem><FormLabel>Years Exp.</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="specializations" render={({ field }) => (
                    <FormItem><FormLabel>Specializations (Comma separated)</FormLabel><FormControl><Input {...field} placeholder="Corporate, Family, Tax" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="bioEn" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Bio (EN)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="bioAr" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Bio (AR)</FormLabel><FormControl><Textarea rows={4} {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Profile</FormLabel>
                        <p className="text-sm text-muted-foreground">Show this lawyer on the public site.</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createLawyer.isPending || updateLawyer.isPending}>Save</Button>
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
                <TableHead>Lawyer</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No lawyers found.</TableCell></TableRow>
              ) : (
                data?.map((lawyer) => (
                  <TableRow key={lawyer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={lawyer.photoUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">{lawyer.nameEn.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{lawyer.nameEn}</span>
                      </div>
                    </TableCell>
                    <TableCell>{lawyer.titleEn}</TableCell>
                    <TableCell>
                      <div className="text-sm">{lawyer.email}</div>
                      <div className="text-xs text-muted-foreground">{lawyer.phone}</div>
                    </TableCell>
                    <TableCell>
                      {lawyer.isActive 
                        ? <Badge className="bg-emerald-100 text-emerald-800 border-none">Active</Badge>
                        : <Badge className="bg-gray-100 text-gray-800 border-none">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lawyer)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Lawyer?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(lawyer.id)} className="bg-destructive">Delete</AlertDialogAction>
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
