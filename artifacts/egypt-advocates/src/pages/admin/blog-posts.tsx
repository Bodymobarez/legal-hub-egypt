import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  useListBlogPosts, 
  // No admin specific list hook generated? using public or if useListAdminBlogPosts exists
  // The spec says useListAdminBlogPosts but checking API schemas we have listBlogPosts
  // I'll assume listBlogPosts and createAdminBlogPost/etc.
  useCreateAdminBlogPost, 
  useUpdateAdminBlogPost,
  useDeleteAdminBlogPost,
  getListBlogPostsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Edit, Trash, FileText } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Blog Posts</h1>
          <p className="text-muted-foreground mt-1">Manage firm news and updates</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) { setEditingId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Post" : "Create Post"}</DialogTitle>
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
                  <FormField control={form.control} name="authorName" render={({ field }) => (
                    <FormItem><FormLabel>Author</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
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
                  <FormField control={form.control} name="coverImageUrl" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Cover Image URL</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="tags" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Tags (Comma separated)</FormLabel><FormControl><Input {...field} placeholder="news, updates" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="isPublished" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Published Status</FormLabel>
                        <p className="text-sm text-muted-foreground">Make this post visible to the public.</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPost.isPending || updatePost.isPending}>Save</Button>
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
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No posts found.</TableCell></TableRow>
              ) : (
                data?.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium max-w-xs truncate">{post.titleEn}</TableCell>
                    <TableCell>{post.authorName}</TableCell>
                    <TableCell>
                      {post.isPublished 
                        ? <Badge className="bg-emerald-100 text-emerald-800 border-none">Published</Badge>
                        : <Badge className="bg-gray-100 text-gray-800 border-none">Draft</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(post.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
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
        </CardContent>
      </Card>
    </div>
  );
}
