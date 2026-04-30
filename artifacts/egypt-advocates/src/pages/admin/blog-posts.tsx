import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  useListBlogPosts,
  useCreateAdminBlogPost,
  useUpdateAdminBlogPost,
  useDeleteAdminBlogPost,
  getListBlogPostsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit, Trash, FileText, Image as ImageIcon } from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { PageHeader, SkeletonRows, EmptyState, SectionCard, FormSection, FieldGrid, AdminDialog, TableActions, ToggleField, NameCell } from "@/components/admin-ui";
import { CoverImagePicker } from "@/components/image-upload";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  titleAr: z.string().min(1, "Arabic title is required"),
  titleEn: z.string().min(1, "English title is required"),
  summaryAr: z.string().min(1),
  summaryEn: z.string().min(1),
  contentAr: z.string().min(1),
  contentEn: z.string().min(1),
  coverImageUrl: z.string().optional().nullable(),
  authorName: z.string().min(1),
  tags: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export default function AdminBlogPosts() {
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useListBlogPosts();
  const createPost = useCreateAdminBlogPost();
  const updatePost = useUpdateAdminBlogPost();
  const deletePost = useDeleteAdminBlogPost();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      titleAr: "",
      titleEn: "",
      summaryAr: "",
      summaryEn: "",
      contentAr: "",
      contentEn: "",
      coverImageUrl: "",
      authorName: "",
      tags: "",
      isPublished: false,
    },
  });

  const openEdit = (post: any) => {
    form.reset({
      slug: post.slug,
      titleAr: post.titleAr,
      titleEn: post.titleEn,
      summaryAr: post.summaryAr,
      summaryEn: post.summaryEn,
      contentAr: post.contentAr,
      contentEn: post.contentEn,
      coverImageUrl: post.coverImageUrl || "",
      authorName: post.authorName,
      tags: post.tags?.join(", ") || "",
      isPublished: post.isPublished,
    });
    setEditingId(post.id);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      tags: values.tags ? values.tags.split(",").map(t => t.trim()) : [],
    };

    try {
      if (editingId) {
        await updatePost.mutateAsync({ id: editingId, data: payload as any });
        toast.success("Blog post updated");
      } else {
        await createPost.mutateAsync({ data: payload as any });
        toast.success("Blog post created");
      }
      queryClient.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    } catch (e) {
      toast.error(editingId ? "Failed to update" : "Failed to create");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePost.mutateAsync({ id });
      toast.success("Blog post deleted");
      queryClient.invalidateQueries({ queryKey: getListBlogPostsQueryKey() });
    } catch (e) {
      toast.error("Failed to delete post");
    }
  };

  return (
    <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={ta("blog.title")}
        subtitle={isRtl ? "إدارة مقالات وأخبار المكتب" : "Manage firm news & blog posts"}
        icon={<FileText className="w-5 h-5" />}
        dir={isRtl ? "rtl" : "ltr"}
        action={
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) { setEditingId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> {ta("blog.add")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-hidden p-0 gap-0" dir={isRtl ? "rtl" : "ltr"}>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
              <AdminDialog
                  title={editingId ? ta("act.edit") : ta("blog.add")}
                  subtitle={isRtl ? "تفاصيل مقال المدونة" : "Blog post details"}
                  icon={<FileText className="w-4 h-4" />}
                  dir={isRtl ? "rtl" : "ltr"}
                  footer={<>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>{ta("act.cancel")}</Button>
                    <Button type="submit" size="sm" disabled={createPost.isPending || updatePost.isPending}>{ta("act.save")}</Button>
                  </>}
                >
                <FormSection title={isRtl ? "صورة الغلاف" : "Cover Image"} icon={<ImageIcon className="w-3.5 h-3.5" />}>
                  <FormField control={form.control} name="coverImageUrl" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CoverImagePicker value={field.value} onChange={field.onChange} isRtl={isRtl} />
                      </FormControl>
                    </FormItem>
                  )} />
                </FormSection>

                <FormSection title={isRtl ? "العنوان والتفاصيل" : "Title & Details"} icon={<FileText className="w-3.5 h-3.5" />}>
                  <FieldGrid cols={2}>
                    <FormField control={form.control} name="titleEn" render={({ field }) => (
                      <FormItem><FormLabel>Title <span className="lang-tag">EN</span></FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="titleAr" render={({ field }) => (
                      <FormItem><FormLabel>العنوان <span className="lang-tag">AR</span></FormLabel><FormControl><Input dir="rtl" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="slug" render={({ field }) => (
                      <FormItem><FormLabel>Slug <span className="lang-tag">URL</span></FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="authorName" render={({ field }) => (
                      <FormItem><FormLabel>{isRtl ? "اسم الكاتب" : "Author"}</FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="summaryEn" render={({ field }) => (
                      <FormItem><FormLabel>Summary <span className="lang-tag">EN</span></FormLabel><FormControl><Textarea rows={3} dir="ltr" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="summaryAr" render={({ field }) => (
                      <FormItem><FormLabel>الملخص <span className="lang-tag">AR</span></FormLabel><FormControl><Textarea rows={3} dir="rtl" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="tags" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>{isRtl ? "الوسوم (مفصولة بفاصلة)" : "Tags (comma-separated)"}</FormLabel><FormControl><Input placeholder="news, updates" dir="ltr" {...field} /></FormControl></FormItem>
                    )} />
                  </FieldGrid>
                </FormSection>

                <FormSection title={isRtl ? "المحتوى" : "Content"} icon={<FileText className="w-3.5 h-3.5" />}>
                  <FieldGrid cols={2}>
                    <FormField control={form.control} name="contentEn" render={({ field }) => (
                      <FormItem><FormLabel>Content <span className="lang-tag">EN</span></FormLabel><FormControl><Textarea rows={8} dir="ltr" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="contentAr" render={({ field }) => (
                      <FormItem><FormLabel>المحتوى <span className="lang-tag">AR</span></FormLabel><FormControl><Textarea rows={8} dir="rtl" {...field} /></FormControl></FormItem>
                    )} />
                  </FieldGrid>
                  <ToggleField
                    name="isPublished"
                    label={isRtl ? "نشر المقال" : "Published"}
                    description={isRtl ? "إظهار المقال على الموقع العام" : "Make this post visible to the public"}
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
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={5} />
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No posts found.</TableCell></TableRow>
              ) : (
                data?.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell><NameCell primary={isRtl ? post.titleAr : post.titleEn} secondary={isRtl ? post.titleEn : post.titleAr} maxWidth="max-w-[260px]" /></TableCell>
                    <TableCell>{post.authorName}</TableCell>
                    <TableCell>
                      {post.isPublished 
                        ? <Badge className="bg-emerald-100 text-emerald-800 border-none">Published</Badge>
                        : <Badge className="bg-gray-100 text-gray-800 border-none">Draft</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {format(new Date(post.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Post?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(post.id)} className="bg-destructive">Delete</AlertDialogAction>
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
