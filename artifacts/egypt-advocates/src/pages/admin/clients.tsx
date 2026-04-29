import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  useListAdminClients,
  useCreateAdminClient,
  useUpdateAdminClient,
  getListAdminClientsQueryKey,
  ClientStatus,
  CreateClientInputStatus,
  UpdateClientInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Search, Users, UserCheck, UserPlus, UserMinus, Archive,
  Mail, Phone, MapPin, MoreHorizontal, Star, ArrowUpRight,
  TrendingUp, ChevronDown,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader, SkeletonRows, EmptyState, SectionCard,
  AdminDialog, NameCell,
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Status helpers ─── */
type Status = "lead" | "active" | "inactive" | "archived";

const STATUS_META: Record<Status, {
  labelAr: string; labelEn: string;
  color: string; bg: string; icon: React.ComponentType<any>;
}> = {
  lead:     { labelAr: "عميل محتمل",   labelEn: "Lead",     color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",    icon: UserPlus },
  active:   { labelAr: "موكّل نشط",     labelEn: "Client",   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: UserCheck },
  inactive: { labelAr: "موكّل غير نشط", labelEn: "Inactive", color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",  icon: UserMinus },
  archived: { labelAr: "مؤرشف",         labelEn: "Archived", color: "text-gray-500",    bg: "bg-gray-50 border-gray-200",    icon: Archive },
};

const SOURCE_LABEL: Record<string, { ar: string; en: string }> = {
  chat_widget: { ar: "الشات", en: "Chat" },
  website:     { ar: "الموقع", en: "Website" },
  referral:    { ar: "توصية", en: "Referral" },
  walk_in:     { ar: "حضور مباشر", en: "Walk-in" },
  phone:       { ar: "هاتف", en: "Phone" },
};

function StatusBadge({ status, isRtl }: { status: Status; isRtl: boolean }) {
  const meta = STATUS_META[status] ?? STATUS_META.lead;
  const Icon = meta.icon;
  const label = isRtl ? meta.labelAr : meta.labelEn;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.color} ${meta.bg}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

/* ─── Form schema ─── */
const formSchema = z.object({
  fullName:   z.string().min(1, "Required"),
  email:      z.string().email("Valid email required"),
  phone:      z.string().min(1, "Required"),
  nationalId: z.string().optional(),
  address:    z.string().optional(),
  city:       z.string().optional(),
  status:     z.nativeEnum(CreateClientInputStatus),
  source:     z.string().optional(),
  notes:      z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

/* ═══════════════════════════════════════════════ */

export default function AdminClients() {
  const [, setLocation] = useLocation();
  const { ta, lang, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const dir = isRtl ? "rtl" : "ltr";

  const [q,          setQ]          = useState("");
  const [statusF,    setStatusF]    = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);

  const { data: raw, isLoading } = useListAdminClients(
    { ...(q && { q }), ...(statusF !== "all" && { status: statusF as ClientStatus }) },
  );
  const clients = Array.isArray(raw) ? raw : (raw as any)?.data ?? (raw as any)?.items ?? [];

  const createClient = useCreateAdminClient();
  const updateClient = useUpdateAdminClient();

  /* KPI counts */
  const { data: allRaw } = useListAdminClients({});
  const all = Array.isArray(allRaw) ? allRaw : (allRaw as any)?.data ?? (allRaw as any)?.items ?? [];
  const kpis = {
    total:    all.length,
    active:   all.filter((c: any) => c.status === "active").length,
    leads:    all.filter((c: any) => c.status === "lead").length,
    inactive: all.filter((c: any) => c.status === "inactive").length,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "", email: "", phone: "", nationalId: "",
      address: "", city: "",
      status: CreateClientInputStatus.lead,
      source: "website", notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createClient.mutateAsync({ data: values });
      toast.success(isRtl ? "تم إضافة العميل" : "Client added");
      queryClient.invalidateQueries({ queryKey: getListAdminClientsQueryKey() });
      form.reset();
      setOpenCreate(false);
    } catch {
      toast.error(isRtl ? "حدث خطأ" : "Error");
    }
  };

  /* Quick status change */
  const changeStatus = async (id: number, status: UpdateClientInputStatus) => {
    try {
      await updateClient.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getListAdminClientsQueryKey() });
      toast.success(isRtl ? "تم تحديث الحالة" : "Status updated");
    } catch {
      toast.error(isRtl ? "فشل التحديث" : "Update failed");
    }
  };

  const FILTER_TABS = [
    { id: "all",      labelAr: "الكل",           labelEn: "All" },
    { id: "lead",     labelAr: "عملاء محتملون",  labelEn: "Leads" },
    { id: "active",   labelAr: "موكّلون نشطون",  labelEn: "Active Clients" },
    { id: "inactive", labelAr: "غير نشطين",       labelEn: "Inactive" },
    { id: "archived", labelAr: "مؤرشف",           labelEn: "Archived" },
  ];

  return (
    <div dir={dir} className="space-y-5">
      <PageHeader
        title={isRtl ? "إدارة الموكّلين والعملاء" : "Clients & Leads Management"}
        subtitle={isRtl ? "موكّلون نشطون، عملاء محتملون، وأرشيف الحالات" : "Active clients, leads, and case archives"}
        icon={<Users className="w-5 h-5" />}
        action={
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{isRtl ? "إضافة عميل" : "Add Client"}</Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden p-0 gap-0 max-w-2xl">
              <AdminDialog
                title={isRtl ? "إضافة عميل / موكّل جديد" : "Add New Client / Lead"}
                subtitle={isRtl ? "أدخل بيانات العميل أو الموكّل المحتمل" : "Enter client or potential lead details"}
                icon={<UserPlus className="w-4 h-4" />}
                footer={
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={createClient.isPending}>
                      {createClient.isPending ? (isRtl ? "جارٍ الحفظ…" : "Saving…") : (isRtl ? "حفظ" : "Save")}
                    </Button>
                  </div>
                }
              >
                <Form {...form}>
                  <form className="p-5 space-y-5">
                    {/* Personal info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{isRtl ? "الاسم الكامل" : "Full Name"}</FormLabel>
                          <FormControl><Input dir={dir} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRtl ? "البريد الإلكتروني" : "Email"}</FormLabel>
                          <FormControl><Input dir="ltr" type="email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRtl ? "الهاتف" : "Phone"}</FormLabel>
                          <FormControl><Input dir="ltr" type="tel" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="nationalId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRtl ? "الرقم القومي" : "National ID"}</FormLabel>
                          <FormControl><Input dir="ltr" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRtl ? "المدينة" : "City"}</FormLabel>
                          <FormControl><Input dir={dir} {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{isRtl ? "العنوان" : "Address"}</FormLabel>
                          <FormControl><Input dir={dir} {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>

                    {/* Classification */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRtl ? "التصنيف" : "Status"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="lead">{isRtl ? "عميل محتمل" : "Lead"}</SelectItem>
                              <SelectItem value="active">{isRtl ? "موكّل نشط" : "Active Client"}</SelectItem>
                              <SelectItem value="inactive">{isRtl ? "موكّل غير نشط" : "Inactive"}</SelectItem>
                              <SelectItem value="archived">{isRtl ? "مؤرشف" : "Archived"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="source" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRtl ? "مصدر العميل" : "Source"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder={isRtl ? "المصدر" : "Source"} /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="website">{isRtl ? "الموقع الإلكتروني" : "Website"}</SelectItem>
                              <SelectItem value="chat_widget">{isRtl ? "الشات" : "Chat Widget"}</SelectItem>
                              <SelectItem value="referral">{isRtl ? "توصية" : "Referral"}</SelectItem>
                              <SelectItem value="walk_in">{isRtl ? "حضور مباشر" : "Walk-in"}</SelectItem>
                              <SelectItem value="phone">{isRtl ? "مكالمة هاتفية" : "Phone Call"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRtl ? "ملاحظات" : "Notes"}</FormLabel>
                        <FormControl>
                          <Textarea dir={dir} rows={3} className="resize-none" {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </form>
                </Form>
              </AdminDialog>
            </DialogContent>
          </Dialog>
        }
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "إجمالي العملاء" : "Total", value: kpis.total, icon: Users, color: "text-primary", bg: "bg-primary/8" },
          { label: isRtl ? "موكّلون نشطون" : "Active Clients", value: kpis.active, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: isRtl ? "عملاء محتملون" : "Leads", value: kpis.leads, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: isRtl ? "غير نشطين" : "Inactive", value: kpis.inactive, icon: UserMinus, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-none">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-none">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute inset-s-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            dir={dir}
            placeholder={isRtl ? "ابحث عن عميل أو موكّل…" : "Search clients…"}
            value={q}
            onChange={e => setQ(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusF(tab.id)}
              className={`h-8 px-3 rounded-full text-xs font-medium border transition-all ${
                statusF === tab.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {isRtl ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <SectionCard>
        <div className="relative w-full overflow-auto">
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">{isRtl ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRtl ? "التصنيف" : "Status"}</TableHead>
                <TableHead className="hidden md:table-cell">{isRtl ? "الاتصال" : "Contact"}</TableHead>
                <TableHead className="hidden lg:table-cell">{isRtl ? "المصدر" : "Source"}</TableHead>
                <TableHead className="hidden lg:table-cell">{isRtl ? "تاريخ التسجيل" : "Since"}</TableHead>
                <TableHead className="hidden sm:table-cell">{isRtl ? "القضايا" : "Cases"}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <SkeletonRows cols={7} rows={6} />}
              {!isLoading && clients.length === 0 && (
                <EmptyState cols={7} icon={<Users className="w-8 h-8" />} message={isRtl ? "لا يوجد عملاء" : "No clients found"} />
              )}
              {clients.map((c: any) => {
                const status = (c.status ?? "lead") as Status;
                const meta = STATUS_META[status] ?? STATUS_META.lead;
                const src = SOURCE_LABEL[c.source] ?? { ar: c.source, en: c.source };
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setLocation(`/admin/clients/${c.id}`)}
                  >
                    {/* Name + avatar */}
                    <TableCell className="text-start!">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-border shrink-0">
                          <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                            {c.fullName?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={status} isRtl={isRtl} />
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 shrink-0" /><span dir="ltr">{c.phone}</span>
                        </div>
                        {c.city && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" /><span>{c.city}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Source */}
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{isRtl ? src.ar : src.en}</span>
                    </TableCell>

                    {/* Since */}
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {c.createdAt ? format(new Date(c.createdAt), "d MMM yyyy") : "—"}
                      </span>
                    </TableCell>

                    {/* Cases count (placeholder) */}
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm font-medium">{c.casesCount ?? "—"}</span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-end!" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-52">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            {isRtl ? "الإجراءات" : "Actions"}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => setLocation(`/admin/clients/${c.id}`)}>
                            <ArrowUpRight className="w-3.5 h-3.5 me-2" />
                            {isRtl ? "عرض الملف الكامل" : "View Full Profile"}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                            {isRtl ? "تغيير التصنيف" : "Change Status"}
                          </DropdownMenuLabel>

                          {(Object.keys(STATUS_META) as Status[]).filter(s => s !== status).map(s => {
                            const sm = STATUS_META[s];
                            const SIcon = sm.icon;
                            return (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => changeStatus(c.id, s as UpdateClientInputStatus)}
                                className={sm.color}
                              >
                                <SIcon className="w-3.5 h-3.5 me-2" />
                                {isRtl ? `تحويل إلى ${sm.labelAr}` : `Set as ${sm.labelEn}`}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
