import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListLawyers, useCreateAdminLawyer, useUpdateAdminLawyer, getListLawyersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit, Trash, Scale, Mail, Phone, Award, AlignLeft, Camera } from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader, SkeletonRows, EmptyState, SectionCard,
  StatusBadge, FormSection, FieldGrid, AdminDialog, TableActions, ToggleField, NameCell, TwoLineCell,
} from "@/components/admin-ui";
import { PhotoPicker } from "@/components/image-upload";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  slug:            z.string().min(1),
  nameAr:          z.string().min(1),
  nameEn:          z.string().min(1),
  titleAr:         z.string().min(1),
  titleEn:         z.string().min(1),
  bioAr:           z.string().min(1),
  bioEn:           z.string().min(1),
  photoUrl:        z.string().optional().nullable(),
  email:           z.string().email(),
  phone:           z.string().min(1),
  specializations: z.string().min(1),
  yearsExperience: z.coerce.number().min(0),
  isActive:        z.boolean().default(true),
});

export default function AdminLawyers() {
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [open, setOpen]       = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const dir = isRtl ? "rtl" : "ltr";

  const { data, isLoading } = useListLawyers();
  const createLawyer = useCreateAdminLawyer();
  const updateLawyer = useUpdateAdminLawyer();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "", nameAr: "", nameEn: "", titleAr: "", titleEn: "",
      bioAr: "", bioEn: "", photoUrl: "", email: "", phone: "",
      specializations: "", yearsExperience: 0, isActive: true,
    },
  });

  const openEdit = (l: any) => {
    form.reset({
      slug: l.slug, nameAr: l.nameAr, nameEn: l.nameEn,
      titleAr: l.titleAr, titleEn: l.titleEn,
      bioAr: l.bioAr, bioEn: l.bioEn,
      photoUrl: l.photoUrl || "", email: l.email, phone: l.phone,
      specializations: l.specializations?.join(", ") || "",
      yearsExperience: l.yearsExperience, isActive: l.isActive,
    });
    setEditingId(l.id);
    setOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      specializations: values.specializations.split(",").map(t => t.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await updateLawyer.mutateAsync({ id: editingId, data: payload as any });
        toast.success(isRtl ? "تم التحديث" : "Updated");
      } else {
        await createLawyer.mutateAsync({ data: payload as any });
        toast.success(isRtl ? "تمت الإضافة" : "Created");
      }
      queryClient.invalidateQueries({ queryKey: getListLawyersQueryKey() });
      setOpen(false); setEditingId(null); form.reset();
    } catch { toast.error("Error"); }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await updateLawyer.mutateAsync({ id, data: { isActive: false } });
      toast.success(isRtl ? "تم إلغاء التنشيط" : "Deactivated");
      queryClient.invalidateQueries({ queryKey: getListLawyersQueryKey() });
    } catch { toast.error("Error"); }
  };

  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={ta("law.title")}
        subtitle={isRtl ? "إدارة محامي المكتب وملفاتهم" : "Manage attorneys & their profiles"}
        icon={<Scale className="w-5 h-5" />}
        dir={dir}
        action={
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditingId(null); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-9 text-sm shadow-sm"><Plus className="w-4 h-4" />{ta("law.add")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl overflow-hidden p-0 gap-0" dir={dir}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
                  <AdminDialog
                    title={editingId ? ta("act.edit") : ta("law.add")}
                    subtitle={isRtl ? "بيانات الملف الشخصي للمحامي" : "Attorney profile details"}
                    icon={<Scale className="w-4 h-4" />}
                    dir={dir}
                    footer={<>
                      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>{ta("act.cancel")}</Button>
                      <Button type="submit" size="sm" disabled={createLawyer.isPending || updateLawyer.isPending}>{ta("act.save")}</Button>
                    </>}
                  >
                    <FormSection title={isRtl ? "الاسم والمسمى" : "Name & Title"} icon={<Scale className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="nameEn" render={({ field }) => (
                          <FormItem><FormLabel>Name <span className="lang-tag">EN</span></FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="nameAr" render={({ field }) => (
                          <FormItem><FormLabel>الاسم <span className="lang-tag">AR</span></FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="titleEn" render={({ field }) => (
                          <FormItem><FormLabel>Title <span className="lang-tag">EN</span></FormLabel><FormControl><Input dir="ltr" placeholder="Senior Partner" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="titleAr" render={({ field }) => (
                          <FormItem><FormLabel>اللقب <span className="lang-tag">AR</span></FormLabel><FormControl><Input dir="rtl" placeholder="شريك أول" {...field} /></FormControl></FormItem>
                        )} />
                      </FieldGrid>
                    </FormSection>

                    <FormSection title={isRtl ? "الصورة الشخصية" : "Profile Photo"} icon={<Camera className="w-3.5 h-3.5" />}>
                      <FormField control={form.control} name="photoUrl" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <PhotoPicker
                              value={field.value}
                              onChange={field.onChange}
                              initials={form.watch("nameEn")?.substring(0, 2) || "?"}
                              isRtl={isRtl}
                            />
                          </FormControl>
                        </FormItem>
                      )} />
                    </FormSection>

                    <FormSection title={isRtl ? "التواصل والتعريف" : "Contact & Identity"} icon={<Mail className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel><Mail className="inline w-3 h-3 me-1" />Email</FormLabel><FormControl><Input type="email" dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                          <FormItem><FormLabel><Phone className="inline w-3 h-3 me-1" />{isRtl ? "الهاتف" : "Phone"}</FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="slug" render={({ field }) => (
                          <FormItem><FormLabel>Slug <span className="lang-tag">URL</span></FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="yearsExperience" render={({ field }) => (
                          <FormItem><FormLabel><Award className="inline w-3 h-3 me-1" />{isRtl ? "سنوات الخبرة" : "Exp. Years"}</FormLabel><FormControl><Input type="number" dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="specializations" render={({ field }) => (
                          <FormItem className="md:col-span-2"><FormLabel>{isRtl ? "التخصصات (مفصولة بفاصلة)" : "Specializations (comma-separated)"}</FormLabel><FormControl><Input placeholder="Corporate, Family, Tax" dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                      </FieldGrid>
                    </FormSection>

                    <FormSection title={isRtl ? "السيرة الذاتية" : "Biography"} icon={<AlignLeft className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="bioEn" render={({ field }) => (
                          <FormItem><FormLabel>Bio <span className="lang-tag">EN</span></FormLabel><FormControl><Textarea rows={4} dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="bioAr" render={({ field }) => (
                          <FormItem><FormLabel>السيرة <span className="lang-tag">AR</span></FormLabel><FormControl><Textarea rows={4} dir="rtl" {...field} /></FormControl></FormItem>
                        )} />
                      </FieldGrid>
                      <ToggleField
                        name="isActive"
                        label={isRtl ? "الملف نشط" : "Profile Active"}
                        description={isRtl ? "إظهار المحامي على الموقع العام" : "Show on public website"}
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
              <TableHead>{isRtl ? "المحامي" : "Lawyer"}</TableHead>
              <TableHead>{isRtl ? "اللقب" : "Title"}</TableHead>
              <TableHead>{isRtl ? "التواصل" : "Contact"}</TableHead>
              <TableHead>{isRtl ? "الخبرة" : "Experience"}</TableHead>
              <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-end">{ta("act.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <SkeletonRows cols={6} /> :
             !data?.length ? <EmptyState cols={6} message={ta("act.noData")} icon={<Scale className="w-8 h-8" />} /> : (
              data.map(l => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={l.photoUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{l.nameEn.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <NameCell primary={isRtl ? l.nameAr : l.nameEn} secondary={isRtl ? l.nameEn : l.nameAr} maxWidth="max-w-[200px]" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <NameCell primary={isRtl ? l.titleAr : l.titleEn} secondary={isRtl ? l.titleEn : l.titleAr} maxWidth="max-w-[180px]" />
                  </TableCell>
                  <TableCell>
                    <TwoLineCell primary={l.email} secondary={l.phone} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{l.yearsExperience} {isRtl ? "سنة" : "yrs"}</TableCell>
                  <TableCell><StatusBadge status={l.isActive ? "active" : "inactive"} label={l.isActive ? (isRtl ? "نشط" : "Active") : (isRtl ? "غير نشط" : "Inactive")} /></TableCell>
                  <TableCell className="col-actions">
                    <TableActions>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}><Edit className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive"><Trash className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir={dir}>
                          <AlertDialogHeader><AlertDialogTitle>{isRtl ? "إلغاء تنشيط؟" : "Deactivate?"}</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{ta("act.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeactivate(l.id)} className="bg-destructive">{ta("act.delete")}</AlertDialogAction>
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
