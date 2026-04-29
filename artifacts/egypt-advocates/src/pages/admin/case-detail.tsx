import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  useGetAdminCase,
  useUpdateAdminCase,
  useDeleteAdminCase,
  useAddCaseEvent,
  getGetAdminCaseQueryKey,
  UpdateCaseInputStatus,
  UpdateCaseInputPriority,
  CreateCaseEventInputEventType,
  useListAdminLawyers,
  useListPracticeAreas,
  type CaseDetail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, Trash2, FileClock, Scale, User, Gavel,
  Plus, FileText, MessageSquare, CalendarDays, Receipt,
  AlertCircle, CheckCircle2, Clock, Circle,
  Printer, Download, Copy, ChevronDown, ChevronUp,
  Briefcase, FileSignature, Send, BookOpen, MoreHorizontal,
  Hash, MapPin, Star, Zap, Activity,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { PageHeader, StatusBadge, AdminDialog } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ═══════════════════════════════════════════
   Helpers & constants
   ═══════════════════════════════════════════ */
const STATUS_META: Record<string, { label: string; labelAr: string; color: string; icon: React.ComponentType<any> }> = {
  open:        { label: "Open",        labelAr: "مفتوحة",       color: "text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950",    icon: Circle },
  in_progress: { label: "In Progress", labelAr: "جارية",         color: "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950", icon: Activity },
  closed:      { label: "Closed",      labelAr: "مغلقة",         color: "text-gray-500 bg-gray-50 border-gray-200",                     icon: CheckCircle2 },
  won:         { label: "Won",         labelAr: "فُزنا بها",     color: "text-emerald-500 bg-emerald-50 border-emerald-200",            icon: CheckCircle2 },
  lost:        { label: "Lost",        labelAr: "خُسرت",         color: "text-red-500 bg-red-50 border-red-200",                        icon: AlertCircle },
};

const PRIORITY_META: Record<string, { label: string; labelAr: string; color: string }> = {
  low:    { label: "Low",    labelAr: "منخفضة",  color: "text-gray-500" },
  medium: { label: "Medium", labelAr: "متوسطة",  color: "text-blue-500" },
  high:   { label: "High",   labelAr: "عالية",   color: "text-orange-500" },
  urgent: { label: "Urgent", labelAr: "عاجلة",   color: "text-red-500" },
};

const EVENT_ICONS: Record<string, React.ComponentType<any>> = {
  note:          MessageSquare,
  document:      FileText,
  hearing:       Gavel,
  payment:       Receipt,
  status_change: Activity,
};

const EVENT_COLORS: Record<string, string> = {
  note:          "bg-blue-100 text-blue-600 dark:bg-blue-900",
  document:      "bg-purple-100 text-purple-600 dark:bg-purple-900",
  hearing:       "bg-amber-100 text-amber-600 dark:bg-amber-900",
  payment:       "bg-emerald-100 text-emerald-600 dark:bg-emerald-900",
  status_change: "bg-gray-100 text-gray-600 dark:bg-gray-800",
};

/* Legal document templates */
const DOC_TEMPLATES = [
  {
    id: "petition",
    labelAr: "عريضة دعوى",
    labelEn: "Statement of Claim",
    icon: FileSignature,
    color: "text-primary bg-primary/10",
    templateAr: (c: any, client: any) =>
`بسم الله الرحمن الرحيم

السيد/ رئيس محكمة ${c.courtName || "——————"}
تحية طيبة وبعد،

يتشرف المحامي الموقع أدناه بالتقدم إلى محكمتكم الموقرة بهذه العريضة نيابةً عن موكله:

الطرف الأول (المدعي): ${client?.fullName || "——————"}

موضوع الدعوى: ${c.titleAr || c.titleEn}

الوقائع:
${c.description || "يرجى إدراج وقائع الدعوى هنا..."}

الطلبات:
1. [أدرج الطلبات هنا]

مع خالص الاحترام والتقدير،
المحامي: ——————
التاريخ: ${format(new Date(), "d MMMM yyyy")}
القضية رقم: ${c.caseNumber}`,
  },
  {
    id: "defense",
    labelAr: "مذكرة دفاع",
    labelEn: "Defense Memorandum",
    icon: BookOpen,
    color: "text-blue-500 bg-blue-50",
    templateAr: (c: any, client: any) =>
`بسم الله الرحمن الرحيم

مذكرة دفاع مقدمة في الدعوى رقم: ${c.caseNumber}

أمام محكمة: ${c.courtName || "——————"}

لصالح: ${client?.fullName || "——————"}

أولاً: وقائع الدعوى
${c.description || "يرجى إدراج الوقائع هنا..."}

ثانياً: الدفوع القانونية
[أدرج الدفوع هنا...]

ثالثاً: الطلبات
نلتمس من عدالتكم رفض الدعوى وما يترتب على ذلك من آثار.

وتفضلوا بقبول فائق الاحترام،
المحامي: ——————
التاريخ: ${format(new Date(), "d MMMM yyyy")}`,
  },
  {
    id: "adjournment",
    labelAr: "طلب تأجيل",
    labelEn: "Adjournment Request",
    icon: Clock,
    color: "text-amber-500 bg-amber-50",
    templateAr: (c: any, client: any) =>
`السيد/ رئيس محكمة ${c.courtName || "——————"}

بعد التحية،

نلتمس منكم التفضل بتأجيل نظر الدعوى رقم ${c.caseNumber} المحددة ليوم ——————

وذلك للأسباب التالية:
[يرجى ذكر أسباب التأجيل]

مع الشكر والتقدير،
المحامي نيابة عن: ${client?.fullName || "——————"}
التاريخ: ${format(new Date(), "d MMMM yyyy")}`,
  },
  {
    id: "letter",
    labelAr: "مراسلة قانونية",
    labelEn: "Legal Letter",
    icon: Send,
    color: "text-emerald-600 bg-emerald-50",
    templateAr: (c: any, client: any) =>
`مكتب محاماة إيجيبت أدفوكيتس

التاريخ: ${format(new Date(), "d MMMM yyyy")}
الموضوع: إخطار قانوني — القضية رقم ${c.caseNumber}

إلى من يهمه الأمر،

نحيطكم علماً بأن موكلنا السيد/ة ${client?.fullName || "——————"} يتمتع بكامل حقوقه القانونية في ما يتعلق بـ ${c.titleAr || c.titleEn}.

[محتوى الخطاب]

وتفضلوا بقبول فائق الاحترام،
مكتب إيجيبت أدفوكيتس للمحاماة`,
  },
  {
    id: "blank",
    labelAr: "مستند فارغ",
    labelEn: "Blank Document",
    icon: FileText,
    color: "text-muted-foreground bg-muted/30",
    templateAr: (_c: any) => "",
  },
];

/* ═══════════════════════════════════════════
   Edit case schema
   ═══════════════════════════════════════════ */
const editSchema = z.object({
  lawyerId:      z.coerce.number().optional().nullable(),
  practiceAreaId: z.coerce.number().optional().nullable(),
  titleAr:       z.string().min(1),
  titleEn:       z.string().min(1),
  description:   z.string().optional(),
  status:        z.nativeEnum(UpdateCaseInputStatus),
  priority:      z.nativeEnum(UpdateCaseInputPriority),
  courtName:     z.string().optional(),
});

const eventSchema = z.object({
  eventType:   z.nativeEnum(CreateCaseEventInputEventType),
  title:       z.string().min(1),
  description: z.string().min(1),
  occurredAt:  z.string().min(1),
});

/* ═══════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════ */
export default function AdminCaseDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { isRtl } = useAdminI18n();
  const dir = isRtl ? "rtl" : "ltr";

  const [isEditOpen,  setIsEditOpen]  = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [activeDoc,   setActiveDoc]   = useState<string | null>(null);
  const [docContent,  setDocContent]  = useState("");
  const [docTitle,    setDocTitle]    = useState("");
  const [expandedEvt, setExpandedEvt] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: caseWrapper, isLoading } = useGetAdminCase(id);
  const updateCase  = useUpdateAdminCase();
  const deleteCase  = useDeleteAdminCase();
  const addEvent    = useAddCaseEvent();
  const { data: lawyers }       = useListAdminLawyers();
  const { data: practiceAreas } = useListPracticeAreas();

  const caseData = caseWrapper as CaseDetail | undefined;
  const c = caseData?.case;

  /* ── Forms ── */
  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { lawyerId: null, practiceAreaId: null, titleAr: "", titleEn: "",
                     description: "", status: UpdateCaseInputStatus.open,
                     priority: UpdateCaseInputPriority.medium, courtName: "" },
  });

  const eventForm = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: { eventType: CreateCaseEventInputEventType.note, title: "",
                     description: "", occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm") },
  });

  useEffect(() => {
    if (c) {
      editForm.reset({
        lawyerId: c.lawyerId, practiceAreaId: c.practiceAreaId,
        titleAr: c.titleAr, titleEn: c.titleEn,
        description: c.description || "",
        status: c.status as UpdateCaseInputStatus,
        priority: c.priority as UpdateCaseInputPriority,
        courtName: c.courtName || "",
      });
    }
  }, [c]);

  /* ── Handlers ── */
  const onEditSubmit = async (v: z.infer<typeof editSchema>) => {
    try {
      await updateCase.mutateAsync({ id, data: v });
      toast.success(isRtl ? "تم تحديث القضية" : "Case updated");
      queryClient.invalidateQueries({ queryKey: getGetAdminCaseQueryKey(id) });
      setIsEditOpen(false);
    } catch { toast.error(isRtl ? "فشل التحديث" : "Update failed"); }
  };

  const onEventSubmit = async (v: z.infer<typeof eventSchema>) => {
    try {
      await addEvent.mutateAsync({ id, data: v });
      toast.success(isRtl ? "تمت إضافة الحدث" : "Event added");
      queryClient.invalidateQueries({ queryKey: getGetAdminCaseQueryKey(id) });
      setIsEventOpen(false);
      eventForm.reset();
    } catch { toast.error(isRtl ? "فشلت الإضافة" : "Failed to add event"); }
  };

  const handleDelete = async () => {
    try {
      await deleteCase.mutateAsync({ id });
      toast.success(isRtl ? "تم حذف القضية" : "Case deleted");
      setLocation("/admin/cases");
    } catch { toast.error(isRtl ? "فشل الحذف" : "Delete failed"); }
  };

  const openDocTemplate = (tmplId: string) => {
    const tmpl = DOC_TEMPLATES.find(t => t.id === tmplId);
    if (!tmpl || !c) return;
    setDocTitle(isRtl ? tmpl.labelAr : tmpl.labelEn);
    setDocContent(tmpl.templateAr(c, caseData?.client));
    setActiveDoc(tmplId);
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><title>${docTitle}</title>
      <style>body{font-family:serif;font-size:14pt;line-height:2;direction:rtl;padding:40px;white-space:pre-wrap;}</style>
    </head><body><h2>${docTitle}</h2><hr/><pre style="font-family:inherit">${docContent}</pre></body></html>`);
    w.document.close();
    w.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(docContent);
    toast.success(isRtl ? "تم النسخ" : "Copied!");
  };

  const saveDocAsEvent = async () => {
    if (!c) return;
    try {
      await addEvent.mutateAsync({ id, data: {
        eventType: CreateCaseEventInputEventType.document,
        title: docTitle,
        description: docContent.slice(0, 2000),
        occurredAt: new Date().toISOString(),
      }});
      toast.success(isRtl ? "تم حفظ المستند في الملف" : "Saved to case file");
      queryClient.invalidateQueries({ queryKey: getGetAdminCaseQueryKey(id) });
    } catch { toast.error(isRtl ? "فشل الحفظ" : "Save failed"); }
  };

  /* ── Loading / error ── */
  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        <div className="h-12 rounded-xl bg-muted/30 animate-pulse w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
        <div className="h-64 rounded-xl bg-muted/30 animate-pulse" />
      </div>
    );
  }
  if (!c || !caseData) return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <AlertCircle className="w-12 h-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">{isRtl ? "لم يتم العثور على القضية" : "Case not found"}</p>
      <Button variant="outline" onClick={() => setLocation("/admin/cases")}>
        <ArrowLeft className="w-4 h-4 me-2" />{isRtl ? "العودة للقضايا" : "Back to Cases"}
      </Button>
    </div>
  );

  const statusM   = STATUS_META[c.status]   ?? STATUS_META.open;
  const priorityM = PRIORITY_META[c.priority] ?? PRIORITY_META.medium;
  const StatusIcon = statusM.icon;
  const assignedLawyer = lawyers?.find(l => l.id === c.lawyerId);
  const practiceArea   = practiceAreas?.find(p => p.id === c.practiceAreaId);
  const totalBilled    = caseData.invoices?.reduce((s, inv) => s + inv.total, 0) ?? 0;

  /* ══════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════ */
  return (
    <div dir={dir} className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 mt-1" onClick={() => setLocation("/admin/cases")}>
          <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-serif font-bold truncate">{isRtl ? c.titleAr : c.titleEn}</h1>
            <Badge variant="outline" className="font-mono text-xs shrink-0 bg-muted/30">
              <Hash className="w-3 h-3 me-1" />{c.caseNumber}
            </Badge>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${statusM.color}`}>
              <StatusIcon className="w-3 h-3" />
              {isRtl ? statusM.labelAr : statusM.label}
            </span>
            <span className={`text-xs font-semibold ${priorityM.color}`}>
              <Star className="w-3 h-3 inline me-1" />
              {isRtl ? priorityM.labelAr : priorityM.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{c.openedAt ? format(new Date(c.openedAt), "d MMM yyyy") : "—"}</span>
            {c.courtName && <span className="flex items-center gap-1"><Gavel className="w-3 h-3" />{c.courtName}</span>}
            {assignedLawyer && <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{isRtl ? assignedLawyer.nameAr : assignedLawyer.nameEn}</span>}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-3.5 h-3.5" />{isRtl ? "تعديل" : "Edit"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0" dir={dir}>
              <AdminDialog
                title={isRtl ? "تعديل القضية" : "Edit Case"}
                subtitle={c.caseNumber}
                icon={<Briefcase className="w-4 h-4" />}
                dir={dir}
                footer={<>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                  <Button type="submit" form="edit-case-form" size="sm" disabled={updateCase.isPending}>{isRtl ? "حفظ" : "Save"}</Button>
                </>}
              >
                <Form {...editForm}>
                  <form id="edit-case-form" onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={editForm.control} name="lawyerId" render={({ field }) => (
                        <FormItem><FormLabel>{isRtl ? "المحامي المسؤول" : "Assigned Lawyer"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ? String(field.value) : "null"}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="null">{isRtl ? "غير محدد" : "Unassigned"}</SelectItem>
                              {lawyers?.map(l => <SelectItem key={l.id} value={String(l.id)}>{isRtl ? l.nameAr : l.nameEn}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="practiceAreaId" render={({ field }) => (
                        <FormItem><FormLabel>{isRtl ? "مجال القانون" : "Practice Area"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ? String(field.value) : "null"}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="null">{isRtl ? "عام" : "General"}</SelectItem>
                              {practiceAreas?.map(pa => <SelectItem key={pa.id} value={String(pa.id)}>{isRtl ? pa.nameAr : pa.nameEn}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>{isRtl ? "الحالة" : "Status"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(STATUS_META).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{isRtl ? v.labelAr : v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="priority" render={({ field }) => (
                        <FormItem><FormLabel>{isRtl ? "الأولوية" : "Priority"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(PRIORITY_META).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{isRtl ? v.labelAr : v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="titleEn" render={({ field }) => (
                        <FormItem><FormLabel>Title <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1 rounded font-mono">EN</span></FormLabel>
                          <FormControl><Input dir="ltr" {...field} /></FormControl><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="titleAr" render={({ field }) => (
                        <FormItem><FormLabel>العنوان <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-mono">AR</span></FormLabel>
                          <FormControl><Input dir="rtl" {...field} /></FormControl><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="courtName" render={({ field }) => (
                        <FormItem><FormLabel>{isRtl ? "اسم المحكمة" : "Court Name"}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="description" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{isRtl ? "الوصف" : "Description"}</FormLabel>
                          <FormControl><Textarea rows={3} dir={dir} {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </form>
                </Form>
              </AdminDialog>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                <Trash2 className="w-3.5 h-3.5" />{isRtl ? "حذف" : "Delete"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir={dir}>
              <AlertDialogHeader>
                <AlertDialogTitle>{isRtl ? "حذف القضية؟" : "Delete this case?"}</AlertDialogTitle>
                <AlertDialogDescription>{isRtl ? "هذا الإجراء لا يمكن التراجع عنه." : "This action cannot be undone."}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                  {isRtl ? "حذف نهائياً" : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isRtl ? "عدد الأحداث" : "Events",     value: caseData.events?.length ?? 0,  icon: Activity,  color: "text-primary" },
          { label: isRtl ? "الفواتير"   : "Invoices",    value: caseData.invoices?.length ?? 0, icon: Receipt,   color: "text-emerald-500" },
          { label: isRtl ? "إجمالي الفواتير" : "Billed", value: `${totalBilled.toLocaleString()} EGP`, icon: Zap, color: "text-amber-500" },
          { label: isRtl ? "مفتوحة منذ" : "Open since",  value: c.openedAt ? format(new Date(c.openedAt), "MMM yyyy") : "—", icon: CalendarDays, color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color} bg-current/10`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">

        {/* Left: Tabs */}
        <div className="min-w-0">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="h-10 bg-muted/30 border border-border/50 p-1 gap-1 mb-4">
              <TabsTrigger value="overview" className="gap-2 text-xs">
                <Briefcase className="w-3.5 h-3.5" />{isRtl ? "ملخص القضية" : "Overview"}
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2 text-xs">
                <FileClock className="w-3.5 h-3.5" />{isRtl ? "التسلسل الزمني" : "Timeline"}
                {(caseData.events?.length ?? 0) > 0 && (
                  <Badge className="h-4 min-w-4 px-1 bg-primary text-[9px]">{caseData.events.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2 text-xs">
                <FileSignature className="w-3.5 h-3.5" />{isRtl ? "المستندات القانونية" : "Legal Documents"}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2 text-xs">
                <Receipt className="w-3.5 h-3.5" />{isRtl ? "الفواتير" : "Invoices"}
              </TabsTrigger>
            </TabsList>

            {/* ── Overview Tab ── */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Description */}
              <div className="rounded-xl border border-border/60 bg-card shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary/70" />
                  {isRtl ? "وصف القضية" : "Case Description"}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {c.description || (isRtl ? "لا يوجد وصف" : "No description provided.")}
                </p>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: isRtl ? "رقم القضية" : "Case Number",   value: c.caseNumber,   icon: Hash },
                  { label: isRtl ? "المحكمة" : "Court",            value: c.courtName || "—", icon: Gavel },
                  { label: isRtl ? "تاريخ الفتح" : "Opened",       value: c.openedAt ? format(new Date(c.openedAt), "d MMMM yyyy") : "—", icon: CalendarDays },
                  { label: isRtl ? "الحالة" : "Status",             value: isRtl ? statusM.labelAr : statusM.label, icon: Activity },
                  { label: isRtl ? "الأولوية" : "Priority",         value: isRtl ? priorityM.labelAr : priorityM.label, icon: Star },
                  { label: isRtl ? "المحامي" : "Lawyer",            value: assignedLawyer ? (isRtl ? assignedLawyer.nameAr : assignedLawyer.nameEn) : (isRtl ? "غير محدد" : "Unassigned"), icon: Scale },
                  { label: isRtl ? "مجال القانون" : "Practice Area", value: practiceArea ? (isRtl ? practiceArea.nameAr : practiceArea.nameEn) : (isRtl ? "عام" : "General"), icon: BookOpen },
                  { label: isRtl ? "العميل" : "Client",             value: caseData.client?.fullName || "—", icon: User },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-border/40 bg-muted/10 p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-card border border-border/40 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── Timeline Tab ── */}
            <TabsContent value="timeline" className="mt-0">
              <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/10">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileClock className="w-4 h-4 text-primary/70" />
                    {isRtl ? "الأحداث والتحديثات" : "Events & Updates"}
                  </h3>
                  <Dialog open={isEventOpen} onOpenChange={setIsEventOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8">
                        <Plus className="w-3.5 h-3.5" />{isRtl ? "إضافة حدث" : "Add Event"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg overflow-hidden p-0 gap-0" dir={dir}>
                      <AdminDialog
                        title={isRtl ? "إضافة حدث جديد" : "Add New Event"}
                        icon={<Activity className="w-4 h-4" />}
                        dir={dir}
                        footer={<>
                          <Button type="button" variant="outline" size="sm" onClick={() => setIsEventOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                          <Button type="submit" form="add-event-form" size="sm" disabled={addEvent.isPending}>{isRtl ? "إضافة" : "Add"}</Button>
                        </>}
                      >
                        <Form {...eventForm}>
                          <form id="add-event-form" onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-4">
                            <FormField control={eventForm.control} name="eventType" render={({ field }) => (
                              <FormItem><FormLabel>{isRtl ? "نوع الحدث" : "Event Type"}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="note">{isRtl ? "ملاحظة" : "Note"}</SelectItem>
                                    <SelectItem value="document">{isRtl ? "مستند" : "Document"}</SelectItem>
                                    <SelectItem value="hearing">{isRtl ? "جلسة استماع" : "Hearing"}</SelectItem>
                                    <SelectItem value="payment">{isRtl ? "دفعة مالية" : "Payment"}</SelectItem>
                                    <SelectItem value="status_change">{isRtl ? "تغيير حالة" : "Status Change"}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <FormField control={eventForm.control} name="title" render={({ field }) => (
                              <FormItem><FormLabel>{isRtl ? "العنوان" : "Title"}</FormLabel>
                                <FormControl><Input dir={dir} {...field} /></FormControl><FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={eventForm.control} name="description" render={({ field }) => (
                              <FormItem><FormLabel>{isRtl ? "التفاصيل" : "Details"}</FormLabel>
                                <FormControl><Textarea rows={3} dir={dir} {...field} /></FormControl><FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={eventForm.control} name="occurredAt" render={({ field }) => (
                              <FormItem><FormLabel>{isRtl ? "التاريخ والوقت" : "Date & Time"}</FormLabel>
                                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                              </FormItem>
                            )} />
                          </form>
                        </Form>
                      </AdminDialog>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Events list */}
                {(!caseData.events || caseData.events.length === 0) ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
                    <FileClock className="w-10 h-10 opacity-20" />
                    <p className="text-sm">{isRtl ? "لا توجد أحداث مسجلة بعد" : "No events recorded yet"}</p>
                    <Button size="sm" variant="outline" onClick={() => setIsEventOpen(true)} className="gap-2 mt-1">
                      <Plus className="w-3.5 h-3.5" />{isRtl ? "إضافة أول حدث" : "Add first event"}
                    </Button>
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute inset-s-4 top-4 bottom-4 w-px bg-border/60" />

                      <div className="space-y-1">
                        {caseData.events.map((evt, i) => {
                          const EvtIcon = EVENT_ICONS[evt.eventType] ?? Circle;
                          const isExpanded = expandedEvt === evt.id;
                          return (
                            <div key={evt.id} className="relative ps-11">
                              {/* Dot */}
                              <div className={`absolute inset-s-2 top-3.5 w-5 h-5 rounded-full flex items-center justify-center ${EVENT_COLORS[evt.eventType]} border-2 border-card z-10`}>
                                <EvtIcon className="w-2.5 h-2.5" />
                              </div>

                              <button
                                className="w-full text-start p-3 rounded-lg hover:bg-muted/30 transition-colors"
                                onClick={() => setExpandedEvt(isExpanded ? null : evt.id)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm">{evt.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {evt.occurredAt ? format(new Date(evt.occurredAt), "d MMM yyyy · h:mm a") : "—"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full ${EVENT_COLORS[evt.eventType]}`}>
                                      {evt.eventType.replace("_", " ")}
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                                  </div>
                                </div>

                                {isExpanded && evt.description && (
                                  <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/40 text-sm whitespace-pre-wrap text-muted-foreground">
                                    {evt.description}
                                  </div>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Legal Documents Tab ── */}
            <TabsContent value="documents" className="mt-0 space-y-4">
              {activeDoc ? (
                /* Document editor */
                <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "620px" }}>
                  {/* Editor toolbar */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/10 flex-wrap gap-y-2 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setActiveDoc(null)}>
                        <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                      </Button>
                      <Input
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        className="h-7 text-sm font-medium border-0 bg-transparent focus-visible:ring-0 px-1 w-56"
                        placeholder={isRtl ? "عنوان المستند" : "Document title"}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
                        <Copy className="w-3 h-3" />{isRtl ? "نسخ" : "Copy"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handlePrint}>
                        <Printer className="w-3 h-3" />{isRtl ? "طباعة" : "Print"}
                      </Button>
                      <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={saveDocAsEvent}>
                        <Download className="w-3 h-3" />{isRtl ? "حفظ في الملف" : "Save to file"}
                      </Button>
                    </div>
                  </div>

                  {/* Text area */}
                  <div className="flex-1 p-1">
                    <Textarea
                      dir="rtl"
                      value={docContent}
                      onChange={e => setDocContent(e.target.value)}
                      className="w-full h-full resize-none border-0 focus-visible:ring-0 rounded-none font-[serif] text-sm leading-loose p-6 min-h-[540px] bg-card"
                      placeholder={isRtl ? "ابدأ الكتابة هنا…" : "Start typing here…"}
                      spellCheck={false}
                    />
                  </div>

                  {/* Footer status */}
                  <div className="px-5 py-2 border-t bg-muted/5 flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {docContent.length.toLocaleString()} {isRtl ? "حرف" : "characters"} ·{" "}
                      {docContent.split(/\s+/).filter(Boolean).length.toLocaleString()} {isRtl ? "كلمة" : "words"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{isRtl ? "قضية رقم" : "Case #"} {c.caseNumber}</span>
                  </div>
                </div>
              ) : (
                /* Template picker */
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/60 bg-card shadow-sm p-5">
                    <h3 className="font-semibold text-sm mb-1">{isRtl ? "إنشاء مستند قانوني" : "Create Legal Document"}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {isRtl ? "اختر نوع المستند وسيتم ملء بيانات القضية تلقائياً" : "Choose a document type and case details will be pre-filled"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {DOC_TEMPLATES.map(tmpl => {
                        const TIcon = tmpl.icon;
                        return (
                          <button
                            key={tmpl.id}
                            onClick={() => openDocTemplate(tmpl.id)}
                            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group text-center"
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tmpl.color}`}>
                              <TIcon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium leading-tight">{isRtl ? tmpl.labelAr : tmpl.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Saved docs from events */}
                  {caseData.events?.filter(e => e.eventType === "document").length > 0 && (
                    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b bg-muted/10">
                        <h3 className="font-semibold text-sm">{isRtl ? "المستندات المحفوظة" : "Saved Documents"}</h3>
                      </div>
                      <div className="divide-y divide-border/40">
                        {caseData.events.filter(e => e.eventType === "document").map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                            <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.title}</p>
                              <p className="text-[10px] text-muted-foreground">{format(new Date(doc.occurredAt), "d MMM yyyy")}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => { setDocTitle(doc.title); setDocContent(doc.description); setActiveDoc("saved"); }}
                            >
                              {isRtl ? "فتح" : "Open"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── Invoices Tab ── */}
            <TabsContent value="invoices" className="mt-0">
              <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/10">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary/70" />
                    {isRtl ? "الفواتير المرتبطة" : "Related Invoices"}
                  </h3>
                  <Link href="/admin/invoices">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                      <Plus className="w-3 h-3" />{isRtl ? "فاتورة جديدة" : "New Invoice"}
                    </Button>
                  </Link>
                </div>
                {(!caseData.invoices || caseData.invoices.length === 0) ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                    <Receipt className="w-8 h-8 opacity-20" />
                    <p className="text-sm">{isRtl ? "لا توجد فواتير" : "No invoices linked"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {caseData.invoices.map(inv => (
                      <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Receipt className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(inv.issueDate), "d MMM yyyy")}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{inv.total.toLocaleString()} {inv.currency}</p>
                          <Badge variant="outline" className="text-[9px] uppercase">{inv.status}</Badge>
                        </div>
                        <Link href={`/admin/invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <ChevronDown className={`w-3.5 h-3.5 ${isRtl ? "rotate-90" : "-rotate-90"}`} />
                          </Button>
                        </Link>
                      </div>
                    ))}
                    <div className="px-5 py-3 bg-muted/10 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{isRtl ? "المجموع" : "Total billed"}</span>
                      <span className="font-bold text-sm tabular-nums">{totalBilled.toLocaleString()} EGP</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">

          {/* Client card */}
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/10">
              <User className="w-3.5 h-3.5 text-primary/70" />
              <h4 className="font-semibold text-xs">{isRtl ? "العميل" : "Client"}</h4>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm uppercase shrink-0">
                  {caseData.client?.fullName?.[0] ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{caseData.client?.fullName}</p>
                  {caseData.client?.email && (
                    <p className="text-[10px] text-muted-foreground truncate">{caseData.client.email}</p>
                  )}
                </div>
              </div>
              <Link href={`/admin/clients/${c.clientId}`}>
                <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">
                  {isRtl ? "عرض ملف العميل" : "View Client Profile"}
                </Button>
              </Link>
            </div>
          </div>

          {/* Lawyer card */}
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/10">
              <Scale className="w-3.5 h-3.5 text-primary/70" />
              <h4 className="font-semibold text-xs">{isRtl ? "المحامي" : "Lawyer"}</h4>
            </div>
            <div className="p-4 space-y-3">
              {assignedLawyer ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-semibold text-sm uppercase shrink-0">
                    {(isRtl ? assignedLawyer.nameAr : assignedLawyer.nameEn)?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{isRtl ? assignedLawyer.nameAr : assignedLawyer.nameEn}</p>
                    {assignedLawyer.titleEn && (
                      <p className="text-[10px] text-muted-foreground truncate">{isRtl ? assignedLawyer.titleAr : assignedLawyer.titleEn}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{isRtl ? "لم يُعين محامٍ بعد" : "No lawyer assigned"}</p>
              )}
              {practiceArea && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <BookOpen className="w-3 h-3 shrink-0" />
                  {isRtl ? practiceArea.nameAr : practiceArea.nameEn}
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-border/60 bg-card shadow-sm p-4 space-y-3">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">{isRtl ? "إحصاءات" : "Quick Stats"}</h4>
            {[
              { label: isRtl ? "الجلسات" : "Hearings",   value: caseData.events?.filter(e => e.eventType === "hearing").length ?? 0 },
              { label: isRtl ? "المستندات" : "Documents", value: caseData.events?.filter(e => e.eventType === "document").length ?? 0 },
              { label: isRtl ? "الملاحظات" : "Notes",     value: caseData.events?.filter(e => e.eventType === "note").length ?? 0 },
              { label: isRtl ? "الدفعات" : "Payments",    value: caseData.events?.filter(e => e.eventType === "payment").length ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
