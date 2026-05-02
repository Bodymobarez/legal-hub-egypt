import { useMemo, useState } from "react";
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
  CreateServiceInputDeliveryMode,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash,
  Settings,
  Clock,
  BookOpen,
  AlignLeft,
  Wifi,
  Search,
  Filter,
  Globe,
  Building2,
  Layers,
  RefreshCw,
  CheckCircle2,
  Eye,
  PauseCircle,
  Tag,
  ListTree,
  X,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader,
  SkeletonRows,
  EmptyState,
  SectionCard,
  StatusBadge,
  FormSection,
  FieldGrid,
  AdminDialog,
  TableActions,
  ToggleField,
  NameCell,
  FilterBar,
} from "@/components/admin-ui";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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

/* ──────────────────────────────────────────────
   Form schema — price is intentionally excluded;
   the API still requires `priceEgp`, so we send 0
   on every save so consultations stay free.
   ────────────────────────────────────────────── */
const formSchema = z.object({
  slug: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  durationMinutes: z.coerce.number().min(1),
  deliveryMode: z.nativeEnum(CreateServiceInputDeliveryMode),
  practiceAreaId: z.coerce.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */
export default function AdminServices() {
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const dir = isRtl ? "rtl" : "ltr";

  /* filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");

  const { data, isLoading, refetch, isFetching } = useListServices();
  const { data: practiceAreas } = useListPracticeAreas();
  const createService = useCreateAdminService();
  const updateService = useUpdateAdminService();
  const deleteService = useDeleteAdminService();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      durationMinutes: 60,
      deliveryMode: CreateServiceInputDeliveryMode.both,
      practiceAreaId: null,
      isActive: true,
    },
  });

  /* ──────────────────────────────────────────────
     Derived data
     ────────────────────────────────────────────── */
  const rows = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      if (modeFilter !== "all" && s.deliveryMode !== modeFilter) return false;
      if (areaFilter !== "all") {
        const expected = areaFilter === "none" ? null : Number(areaFilter);
        if ((s.practiceAreaId ?? null) !== expected) return false;
      }
      if (q) {
        const hay = `${s.nameAr} ${s.nameEn} ${s.slug} ${s.descriptionAr} ${s.descriptionEn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, modeFilter, areaFilter]);

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      active: list.filter((s) => s.isActive).length,
      inactive: list.filter((s) => !s.isActive).length,
      online: list.filter((s) => s.deliveryMode === "online" || s.deliveryMode === "both").length,
      inOffice: list.filter((s) => s.deliveryMode === "in_office" || s.deliveryMode === "both").length,
    };
  }, [data]);

  /* ──────────────────────────────────────────────
     Handlers
     ────────────────────────────────────────────── */
  const openNew = () => {
    setEditingId(null);
    form.reset({
      slug: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      durationMinutes: 60,
      deliveryMode: CreateServiceInputDeliveryMode.both,
      practiceAreaId: null,
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (s: NonNullable<typeof data>[number]) => {
    form.reset({
      slug: s.slug,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      descriptionAr: s.descriptionAr,
      descriptionEn: s.descriptionEn,
      durationMinutes: s.durationMinutes,
      deliveryMode: s.deliveryMode as CreateServiceInputDeliveryMode,
      practiceAreaId: s.practiceAreaId ?? null,
      isActive: s.isActive,
    });
    setEditingId(s.id);
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    /** Always send price = 0 — services are free; admins shouldn't think about pricing. */
    const payload = { ...values, priceEgp: 0 };
    try {
      if (editingId) {
        await updateService.mutateAsync({ id: editingId, data: payload });
        toast.success(isRtl ? "تم التحديث" : "Updated");
      } else {
        await createService.mutateAsync({ data: payload });
        toast.success(isRtl ? "تمت الإضافة" : "Created");
      }
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
      setOpen(false);
      setEditingId(null);
      form.reset();
    } catch {
      toast.error(isRtl ? "فشل الحفظ" : "Save failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteService.mutateAsync({ id });
      toast.success(isRtl ? "تم الحذف" : "Deleted");
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    } catch {
      toast.error(isRtl ? "فشل الحذف" : "Delete failed");
    }
  };

  const toggleActive = async (s: NonNullable<typeof data>[number]) => {
    try {
      await updateService.mutateAsync({ id: s.id, data: { isActive: !s.isActive } });
      toast.success(s.isActive ? (isRtl ? "تم الإيقاف" : "Deactivated") : (isRtl ? "تم التفعيل" : "Activated"));
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    } catch {
      toast.error(isRtl ? "فشل الحفظ" : "Save failed");
    }
  };

  const slugify = (input: string) =>
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

  const onNameEnBlur = (value: string) => {
    if (!editingId && value && !form.getValues("slug")) {
      form.setValue("slug", slugify(value));
    }
  };

  /* ──────────────────────────────────────────────
     Render helpers
     ────────────────────────────────────────────── */
  const MODES: { value: CreateServiceInputDeliveryMode; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { value: CreateServiceInputDeliveryMode.online, labelAr: "أونلاين", labelEn: "Online", icon: <Globe className="w-3 h-3" /> },
    { value: CreateServiceInputDeliveryMode.in_office, labelAr: "في المكتب", labelEn: "In Office", icon: <Building2 className="w-3 h-3" /> },
    { value: CreateServiceInputDeliveryMode.both, labelAr: "كلاهما", labelEn: "Both", icon: <Layers className="w-3 h-3" /> },
  ];

  const findArea = (id?: number | null) => practiceAreas?.find((p) => p.id === id);

  const modeMeta = (m?: string | null) => MODES.find((x) => x.value === m);

  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={ta("svc.title")}
        subtitle={isRtl ? "إدارة الخدمات والاستشارات القانونية" : "Manage your legal services and consultations"}
        icon={<Settings className="w-5 h-5" />}
        dir={dir}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              {isRtl ? "تحديث" : "Refresh"}
            </Button>
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) {
                  setEditingId(null);
                  form.reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 h-9 text-sm shadow-sm" onClick={openNew}>
                  <Plus className="w-4 h-4" />
                  {ta("svc.add")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0" dir={dir}>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
                    <AdminDialog
                      title={editingId ? (isRtl ? "تعديل الخدمة" : "Edit service") : ta("svc.add")}
                      subtitle={isRtl ? "تفاصيل الخدمة القانونية" : "Legal service details"}
                      icon={<Settings className="w-4 h-4" />}
                      dir={dir}
                      footer={
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                            {ta("act.cancel")}
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={createService.isPending || updateService.isPending}
                          >
                            {ta("act.save")}
                          </Button>
                        </>
                      }
                    >
                      <FormSection title={isRtl ? "المعلومات الأساسية" : "Basics"} icon={<Tag className="w-3.5 h-3.5" />}>
                        <FieldGrid cols={2}>
                          <FormField
                            control={form.control}
                            name="nameEn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Name <span className="lang-tag">EN</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    dir="ltr"
                                    placeholder="General Legal Consultation"
                                    {...field}
                                    onBlur={(e) => {
                                      field.onBlur();
                                      onNameEnBlur(e.target.value);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="nameAr"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  الاسم <span className="lang-tag">AR</span>
                                </FormLabel>
                                <FormControl>
                                  <Input dir="rtl" placeholder="استشارة قانونية عامة" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Slug <span className="lang-tag">URL</span>
                                </FormLabel>
                                <FormControl>
                                  <Input dir="ltr" placeholder="general-legal-consultation" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="practiceAreaId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <BookOpen className="inline w-3 h-3 mb-0.5 me-1" />
                                  {isRtl ? "مجال القانون" : "Practice Area"}
                                </FormLabel>
                                <Select
                                  onValueChange={(v) => field.onChange(v === "null" ? null : Number(v))}
                                  value={field.value == null ? "null" : String(field.value)}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isRtl ? "اختياري" : "Optional"} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="null">{isRtl ? "لا شيء" : "None"}</SelectItem>
                                    {practiceAreas?.map((pa) => (
                                      <SelectItem key={pa.id} value={String(pa.id)}>
                                        {isRtl ? pa.nameAr : pa.nameEn}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </FieldGrid>
                      </FormSection>

                      <FormSection title={isRtl ? "الوصف" : "Description"} icon={<AlignLeft className="w-3.5 h-3.5" />}>
                        <FieldGrid cols={2}>
                          <FormField
                            control={form.control}
                            name="descriptionEn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Description <span className="lang-tag">EN</span>
                                </FormLabel>
                                <FormControl>
                                  <Textarea rows={4} dir="ltr" placeholder="What this service covers, expected outcomes…" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="descriptionAr"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  الوصف <span className="lang-tag">AR</span>
                                </FormLabel>
                                <FormControl>
                                  <Textarea rows={4} dir="rtl" placeholder="ما الذي تغطيه هذه الخدمة، النتائج المتوقعة…" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </FieldGrid>
                      </FormSection>

                      <FormSection title={isRtl ? "الإعدادات" : "Settings"} icon={<Wifi className="w-3.5 h-3.5" />}>
                        <FieldGrid cols={2}>
                          <FormField
                            control={form.control}
                            name="durationMinutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <Clock className="inline w-3 h-3 mb-0.5 me-1" />
                                  {isRtl ? "مدة الجلسة (دقيقة)" : "Session duration (min)"}
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" min={5} dir="ltr" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryMode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <Wifi className="inline w-3 h-3 mb-0.5 me-1" />
                                  {isRtl ? "طريقة التقديم" : "Delivery method"}
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {MODES.map((m) => (
                                      <SelectItem key={m.value} value={m.value}>
                                        <span className="inline-flex items-center gap-2">
                                          {m.icon}
                                          {isRtl ? m.labelAr : m.labelEn}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </FieldGrid>
                        <ToggleField
                          name="isActive"
                          label={isRtl ? "الخدمة نشطة" : "Service is active"}
                          description={isRtl ? "تظهر في الموقع ويمكن للعملاء حجزها" : "Visible on the public site, available for booking"}
                        />
                      </FormSection>
                    </AdminDialog>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard icon={<Layers className="w-4 h-4" />} label={isRtl ? "إجمالي الخدمات" : "Total"} value={String(stats.total)} tone="primary" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label={isRtl ? "نشطة" : "Active"} value={String(stats.active)} tone="emerald" />
        <StatCard icon={<PauseCircle className="w-4 h-4" />} label={isRtl ? "موقوفة" : "Inactive"} value={String(stats.inactive)} tone="gray" />
        <StatCard icon={<Globe className="w-4 h-4" />} label={isRtl ? "تدعم أونلاين" : "Online"} value={String(stats.online)} tone="blue" />
        <StatCard
          icon={<Building2 className="w-4 h-4" />}
          label={isRtl ? "تدعم المكتب" : "In office"}
          value={String(stats.inOffice)}
          tone="amber"
          className="col-span-2 md:col-span-1"
        />
      </div>

      <SectionCard>
        <FilterBar>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "ابحث بالاسم أو الوصف…" : "Search by name or description…"}
              className="ps-9 h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ta("act.all")}</SelectItem>
                <SelectItem value="active">{isRtl ? "النشطة" : "Active"}</SelectItem>
                <SelectItem value="inactive">{isRtl ? "الموقوفة" : "Inactive"}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل أنواع التقديم" : "All modes"}</SelectItem>
                {MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {isRtl ? m.labelAr : m.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل المجالات" : "All areas"}</SelectItem>
                <SelectItem value="none">{isRtl ? "بدون مجال" : "No area"}</SelectItem>
                {practiceAreas?.map((pa) => (
                  <SelectItem key={pa.id} value={String(pa.id)}>
                    {isRtl ? pa.nameAr : pa.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all" || modeFilter !== "all" || areaFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setModeFilter("all");
                  setAreaFilter("all");
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </FilterBar>

        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[260px]">{isRtl ? "اسم الخدمة" : "Service"}</TableHead>
              <TableHead>
                <ListTree className="inline w-3 h-3 me-1" />
                {isRtl ? "المجال" : "Practice area"}
              </TableHead>
              <TableHead>
                <Clock className="inline w-3 h-3 me-1" />
                {isRtl ? "المدة" : "Duration"}
              </TableHead>
              <TableHead>{isRtl ? "التقديم" : "Mode"}</TableHead>
              <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-end">{ta("act.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={6} />
            ) : rows.length === 0 ? (
              <EmptyState cols={6} message={ta("act.noData")} icon={<Settings className="w-8 h-8" />} />
            ) : (
              rows.map((svc) => {
                const m = modeMeta(svc.deliveryMode);
                const area = findArea(svc.practiceAreaId);
                return (
                  <TableRow key={svc.id}>
                    <TableCell>
                      <NameCell
                        primary={isRtl ? svc.nameAr : svc.nameEn}
                        secondary={isRtl ? svc.nameEn : svc.nameAr}
                        caption={`/${svc.slug}`}
                        maxWidth="max-w-[300px]"
                      />
                    </TableCell>
                    <TableCell>
                      {area ? (
                        <Badge variant="outline" className="text-xs gap-1 max-w-[180px]">
                          <BookOpen className="w-3 h-3" />
                          <span className="truncate">{isRtl ? area.nameAr : area.nameEn}</span>
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">{isRtl ? "بدون مجال" : "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      {svc.durationMinutes} {isRtl ? "دقيقة" : "min"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1.5">
                        {m?.icon}
                        {isRtl ? m?.labelAr ?? svc.deliveryMode : m?.labelEn ?? svc.deliveryMode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleActive(svc)}
                        title={svc.isActive ? (isRtl ? "اضغط لإيقاف" : "Click to deactivate") : (isRtl ? "اضغط لتفعيل" : "Click to activate")}
                        className="cursor-pointer"
                      >
                        <StatusBadge
                          status={svc.isActive ? "active" : "inactive"}
                          label={svc.isActive ? (isRtl ? "نشط" : "Active") : (isRtl ? "موقوف" : "Inactive")}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="col-actions">
                      <TableActions>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          title={isRtl ? "عرض في الموقع" : "View on site"}
                        >
                          <a href={`/services/${svc.id}`} target="_blank" rel="noreferrer">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(svc)}
                          title={ta("act.edit")}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive/70 hover:text-destructive"
                              title={ta("act.delete")}
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir={dir}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{isRtl ? "حذف الخدمة؟" : "Delete service?"}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isRtl
                                  ? `سيتم حذف "${svc.nameAr}" نهائياً. لن يمكن التراجع عن هذا الإجراء.`
                                  : `"${svc.nameEn}" will be permanently removed. This action cannot be undone.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{ta("act.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(svc.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {ta("act.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableActions>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

/* ──────────────────────────────────────────────
   StatCard — same look as appointments page so
   the admin feels consistent across modules.
   ────────────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  tone = "primary",
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "primary" | "amber" | "blue" | "emerald" | "violet" | "gray";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    gray: "bg-muted text-muted-foreground",
  };
  return (
    <div className={`rounded-xl border border-border/60 bg-card p-3.5 flex items-center gap-3 ${className}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-lg font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
