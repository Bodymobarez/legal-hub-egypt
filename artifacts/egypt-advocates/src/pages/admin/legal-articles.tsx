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
import { Plus, Edit, Trash, BookOpen } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Legal Library</h1>
          <p className="text-muted-foreground mt-1">Manage articles, laws, and knowledge base</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) { setEditingId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Article</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Article" : "Create Article"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createArt.isPending || updateArt.isPending}>Save</Button>
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
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No articles found.</TableCell></TableRow>
              ) : (
                data?.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium max-w-xs truncate">{article.titleEn}</TableCell>
                    <TableCell>{article.categoryNameEn || "General"}</TableCell>
                    <TableCell>
                      {article.isPublished 
                        ? <Badge className="bg-emerald-100 text-emerald-800 border-none">Published</Badge>
                        : <Badge className="bg-gray-100 text-gray-800 border-none">Draft</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(article.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
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
        </CardContent>
      </Card>
    </div>
  );
}
