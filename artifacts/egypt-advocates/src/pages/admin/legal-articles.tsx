import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useListAdminLegalArticles, 
  useCreateAdminLegalArticle, 
  useUpdateAdminLegalArticle,
  useDeleteAdminLegalArticle,
  getListAdminLegalArticlesQueryKey,
  // We'd use specific query for categories if it existed, for now mock or fetch if available
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit, Trash, BookOpen, AlignLeft } from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { PageHeader, SkeletonRows, EmptyState, SectionCard, FormSection, FieldGrid, FormFooter, DialogShell, AdminDialog, TableActions, ToggleField, NameCell } from "@/components/admin-ui";

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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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

const formSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  titleAr: z.string().min(1, "Arabic title is required"),
  titleEn: z.string().min(1, "English title is required"),
  summaryAr: z.string().min(1),
  summaryEn: z.string().min(1),
  contentAr: z.string().min(1),
  contentEn: z.string().min(1),
  lawNumber: z.string().optional().nullable(),
  year: z.coerce.number().optional().nullable(),
  tags: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export default function AdminLegalArticles() {
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useListAdminLegalArticles();
  const createArt = useCreateAdminLegalArticle();
  const updateArt = useUpdateAdminLegalArticle();
  const deleteArt = useDeleteAdminLegalArticle();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      categoryId: 1, // Mock category ID since fetch might not be available
      titleAr: "",
      titleEn: "",
      summaryAr: "",
      summaryEn: "",
      contentAr: "",
      contentEn: "",
      lawNumber: "",
      year: new Date().getFullYear(),
      tags: "",
      isPublished: false,
    },
  });

  const openEdit = (article: any) => {
    form.reset({
      slug: article.slug,
      categoryId: article.categoryId,
      titleAr: article.titleAr,
      titleEn: article.titleEn,
      summaryAr: article.summaryAr,
      summaryEn: article.summaryEn,
      contentAr: article.contentAr,
      contentEn: article.contentEn,
      lawNumber: article.lawNumber || "",
      year: article.year || new Date().getFullYear(),
      tags: article.tags?.join(", ") || "",
      isPublished: article.isPublished,
    });
    setEditingId(article.id);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      tags: values.tags ? values.tags.split(",").map(t => t.trim()) : [],
    };

    try {
      if (editingId) {
        await updateArt.mutateAsync({ id: editingId, data: payload as any });
        toast.success("Article updated");
      } else {
        await createArt.mutateAsync({ data: payload as any });
        toast.success("Article created");
      }
      queryClient.invalidateQueries({ queryKey: getListAdminLegalArticlesQueryKey() });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    } catch (e) {
      toast.error(editingId ? "Failed to update" : "Failed to create");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteArt.mutateAsync({ id });
      toast.success("Article deleted");
      queryClient.invalidateQueries({ queryKey: getListAdminLegalArticlesQueryKey() });
    } catch (e) {
      toast.error("Failed to delete article");
    }
  };

  return (
    <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={ta("art.title")}
        subtitle={isRtl ? "إدارة المكتبة القانونية" : "Manage legal knowledge base"}
        icon={<BookOpen className="w-5 h-5" />}
        dir={isRtl ? "rtl" : "ltr"}
        action={
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) { setEditingId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> {ta("art.add")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-hidden p-0 gap-0" dir={isRtl ? "rtl" : "ltr"}>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
              <AdminDialog
                  title={editingId ? ta("act.edit") : ta("art.add")}
                  subtitle={isRtl ? "تفاصيل المقالة القانونية" : "Legal article details"}
                  icon={<BookOpen className="w-4 h-4" />}
                  dir={isRtl ? "rtl" : "ltr"}
                  footer={<>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>{ta("act.cancel")}</Button>
                    <Button type="submit" size="sm" disabled={createArt.isPending || updateArt.isPending}>{ta("act.save")}</Button>
                  </>}
                >
                <FormSection title={isRtl ? "عنوان المقالة" : "Article Title"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="titleEn" render={({ field }) => (
                    <FormItem><FormLabel>Title (EN)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="titleAr" render={({ field }) => (
                    <FormItem><FormLabel>Title (AR)</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem><FormLabel>Slug (URL segment)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name="lawNumber" render={({ field }) => (
                      <FormItem><FormLabel>Law No. (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="year" render={({ field }) => (
                      <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="summaryEn" render={({ field }) => (
                    <FormItem><FormLabel>Summary (EN)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="summaryAr" render={({ field }) => (
                    <FormItem><FormLabel>Summary (AR)</FormLabel><FormControl><Textarea rows={3} {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="contentEn" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Content (EN)</FormLabel><FormControl><Textarea rows={8} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="contentAr" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Content (AR)</FormLabel><FormControl><Textarea rows={8} {...field} dir="rtl" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="tags" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Tags (Comma separated)</FormLabel><FormControl><Input {...field} placeholder="civil, corporate, tax" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="isPublished" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Published Status</FormLabel>
                        <p className="text-sm text-muted-foreground">Make this article visible to the public.</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
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
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={5} />
              ) : data?.length === 0 ? (
                <EmptyState cols={5} message={ta("act.noData")} />
              ) : (
                data?.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell><NameCell primary={isRtl ? article.titleAr : article.titleEn} secondary={isRtl ? article.titleEn : article.titleAr} maxWidth="max-w-[260px]" /></TableCell>
                    <TableCell>{article.categoryNameEn || "General"}</TableCell>
                    <TableCell>
                      {article.isPublished 
                        ? <Badge className="bg-emerald-100 text-emerald-800 border-none">Published</Badge>
                        : <Badge className="bg-gray-100 text-gray-800 border-none">Draft</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {format(new Date(article.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(article)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Article?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(article.id)} className="bg-destructive">Delete</AlertDialogAction>
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
      </SectionCard>
    </div>
  );
}
