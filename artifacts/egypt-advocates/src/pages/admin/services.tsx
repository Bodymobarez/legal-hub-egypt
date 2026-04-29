import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListServices, useCreateAdminService, useUpdateAdminService, useDeleteAdminService,
  getListServicesQueryKey, useListPracticeAreas, CreateServiceInputDeliveryMode,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit, Trash, Settings, Clock, DollarSign, BookOpen, AlignLeft, Wifi } from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader, SkeletonRows, EmptyState, SectionCard,
  StatusBadge, FormSection, FieldGrid, FormFooter, DialogShell, AdminDialog, TableActions, ToggleField, NameCell,
} from "@/components/admin-ui";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  slug:            z.string().min(1),
  nameAr:          z.string().min(1),
  nameEn:          z.string().min(1),
  descriptionAr:   z.string().min(1),
  descriptionEn:   z.string().min(1),
  durationMinutes: z.coerce.number().min(1),
  priceEgp:        z.coerce.number().min(0),
  deliveryMode:    z.nativeEnum(CreateServiceInputDeliveryMode),
  practiceAreaId:  z.coerce.number().optional().nullable(),
  isActive:        z.boolean().default(true),
});

export default function AdminServices() {
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [open, setOpen]       = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const dir = isRtl ? "rtl" : "ltr";

  const { data, isLoading } = useListServices();
  const { data: practiceAreas } = useListPracticeAreas();
  const createService = useCreateAdminService();
  const updateService = useUpdateAdminService();
  const deleteService = useDeleteAdminService();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "", nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "",
      durationMinutes: 60, priceEgp: 0,
      deliveryMode: CreateServiceInputDeliveryMode.both, practiceAreaId: null, isActive: true,
    },
  });

  const openEdit = (s: any) => {
    form.reset({
      slug: s.slug, nameAr: s.nameAr, nameEn: s.nameEn,
      descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn,
      durationMinutes: s.durationMinutes, priceEgp: s.priceEgp,
      deliveryMode: s.deliveryMode as CreateServiceInputDeliveryMode,
      practiceAreaId: s.practiceAreaId, isActive: s.isActive,
    });
    setEditingId(s.id);
    setOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingId) {
        await updateService.mutateAsync({ id: editingId, data: values as any });
        toast.success(isRtl ? "تم التحديث" : "Updated");
      } else {
        await createService.mutateAsync({ data: values as any });
        toast.success(isRtl ? "تمت الإضافة" : "Created");
      }
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
      setOpen(false); setEditingId(null); form.reset();
    } catch { toast.error("Error"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteService.mutateAsync({ id });
      toast.success(isRtl ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    } catch { toast.error("Error"); }
  };

  const MODES = [
    { value: "online",    label: isRtl ? "أونلاين" : "Online" },
    { value: "in_office", label: isRtl ? "في المكتب" : "In Office" },
    { value: "both",      label: isRtl ? "كلاهما" : "Both" },
  ];

  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={ta("svc.title")}
        subtitle={isRtl ? "إدارة الخدمات القانونية والرسوم" : "Manage legal services & fees"}
        icon={<Settings className="w-5 h-5" />}
        dir={dir}
        action={
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditingId(null); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-9 text-sm shadow-sm"><Plus className="w-4 h-4" />{ta("svc.add")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl overflow-hidden p-0 gap-0" dir={dir}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
                  <AdminDialog
                    title={editingId ? ta("act.edit") : ta("svc.add")}
                    subtitle={isRtl ? "تفاصيل الخدمة القانونية" : "Legal service details"}
                    icon={<Settings className="w-4 h-4" />}
                    dir={dir}
                    footer={<>
                      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>{ta("act.cancel")}</Button>
                      <Button type="submit" size="sm" disabled={createService.isPending || updateService.isPending}>{ta("act.save")}</Button>
                    </>}
                  >
                    <FormSection title={isRtl ? "اسم الخدمة" : "Service Name"} icon={<AlignLeft className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="nameEn" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name <span className="lang-tag">EN</span></FormLabel>
                            <FormControl><Input dir="ltr" placeholder="General Legal Consultation" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="nameAr" render={({ field }) => (
                          <FormItem>
                            <FormLabel>الاسم <span className="lang-tag">AR</span></FormLabel>
                            <FormControl><Input dir="rtl" placeholder="استشارة قانونية عامة" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="slug" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug <span className="lang-tag">URL</span></FormLabel>
                            <FormControl><Input dir="ltr" placeholder="general-legal-consultation" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="practiceAreaId" render={({ field }) => (
                          <FormItem>
                            <FormLabel><BookOpen className="inline w-3 h-3 mb-0.5 me-1" />{isRtl ? "مجال القانون" : "Practice Area"}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                              <FormControl><SelectTrigger><SelectValue placeholder={isRtl ? "اختياري" : "Optional"} /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="null">{isRtl ? "لا شيء" : "None"}</SelectItem>
                                {practiceAreas?.map(pa => <SelectItem key={pa.id} value={String(pa.id)}>{isRtl ? pa.nameAr : pa.nameEn}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </FieldGrid>
                    </FormSection>

                    <FormSection title={isRtl ? "الوصف" : "Description"} icon={<AlignLeft className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="descriptionEn" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description <span className="lang-tag">EN</span></FormLabel>
                            <FormControl><Textarea rows={3} dir="ltr" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="descriptionAr" render={({ field }) => (
                          <FormItem>
                            <FormLabel>الوصف <span className="lang-tag">AR</span></FormLabel>
                            <FormControl><Textarea rows={3} dir="rtl" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </FieldGrid>
                    </FormSection>

                    <FormSection title={isRtl ? "التسعير والتوصيل" : "Pricing & Delivery"} icon={<DollarSign className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={3}>
                        <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                          <FormItem>
                            <FormLabel><Clock className="inline w-3 h-3 mb-0.5 me-1" />{isRtl ? "المدة (دقيقة)" : "Duration (min)"}</FormLabel>
                            <FormControl><Input type="number" dir="ltr" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="priceEgp" render={({ field }) => (
                          <FormItem>
                            <FormLabel><DollarSign className="inline w-3 h-3 mb-0.5 me-1" />{isRtl ? "السعر (ج.م)" : "Price (EGP)"}</FormLabel>
                            <FormControl><Input type="number" dir="ltr" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="deliveryMode" render={({ field }) => (
                          <FormItem>
                            <FormLabel><Wifi className="inline w-3 h-3 mb-0.5 me-1" />{isRtl ? "طريقة التقديم" : "Delivery Mode"}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>{MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </FieldGrid>
                      <ToggleField
                        name="isActive"
                        label={isRtl ? "الخدمة نشطة" : "Service Active"}
                        description={isRtl ? "السماح للعملاء بالحجز" : "Allow clients to book this service"}
                      />
                    </FormSection>
                  </AdminDialog>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard>
        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              <TableHead>{isRtl ? "اسم الخدمة" : "Service"}</TableHead>
              <TableHead><Clock className="inline w-3 h-3 me-1" />{isRtl ? "المدة" : "Duration"}</TableHead>
              <TableHead><DollarSign className="inline w-3 h-3 me-1" />{isRtl ? "السعر" : "Price"}</TableHead>
              <TableHead>{isRtl ? "التوصيل" : "Mode"}</TableHead>
              <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-end">{ta("act.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <SkeletonRows cols={6} /> :
             !data?.length ? <EmptyState cols={6} message={ta("act.noData")} icon={<Settings className="w-8 h-8" />} /> : (
              data.map(svc => (
                <TableRow key={svc.id}>
                  <TableCell>
                    <NameCell
                      primary={isRtl ? svc.nameAr : svc.nameEn}
                      secondary={isRtl ? svc.nameEn : svc.nameAr}
                      maxWidth="max-w-[260px]"
                    />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums whitespace-nowrap">{svc.durationMinutes} {isRtl ? "دقيقة" : "min"}</TableCell>
                  <TableCell className="font-medium text-sm tabular-nums">{svc.priceEgp.toLocaleString()} {isRtl ? "ج.م" : "EGP"}</TableCell>
                  <TableCell className="text-xs uppercase">{MODES.find(m => m.value === svc.deliveryMode)?.label ?? svc.deliveryMode}</TableCell>
                  <TableCell><StatusBadge status={svc.isActive ? "active" : "inactive"} label={svc.isActive ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")} /></TableCell>
                  <TableCell className="col-actions">
                    <TableActions>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(svc)}><Edit className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive"><Trash className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir={dir}>
                          <AlertDialogHeader><AlertDialogTitle>{isRtl ? "حذف الخدمة؟" : "Delete service?"}</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{ta("act.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(svc.id)} className="bg-destructive">{ta("act.delete")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableActions>
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
