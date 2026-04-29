import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  useListAdminCases, useCreateAdminCase, useUpdateAdminCase,
  getListAdminCasesQueryKey,
  CaseStatus, CreateCaseInputStatus, CreateCaseInputPriority,
  useListAdminClients, useListAdminLawyers, useListPracticeAreas,
  useAdminMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Filter, Briefcase, Users, Scale, BookOpen, AlignLeft, UserCheck, X } from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader, SkeletonRows, EmptyState, SectionCard, FilterBar,
  StatusBadge, FormSection, FieldGrid, FormFooter, DialogShell, AdminDialog, TableActions, NameCell,
} from "@/components/admin-ui";
import {
  resolvePermissions, loadUsers, loadCaseCounsels, saveCaseCounsel,
} from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITY_COLORS: Record<string, string> = {
  low:    "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-rose-100 text-rose-700",
};

const formSchema = z.object({
  clientId:       z.coerce.number().min(1),
  lawyerId:       z.coerce.number().optional().nullable(),
  practiceAreaId: z.coerce.number().optional().nullable(),
  titleAr:        z.string().min(1),
  titleEn:        z.string().min(1),
  descriptionAr:  z.string().optional(),
  descriptionEn:  z.string().optional(),
  status:         z.nativeEnum(CreateCaseInputStatus),
  priority:       z.nativeEnum(CreateCaseInputPriority),
});

export default function AdminCases() {
  const [, setLocation] = useLocation();
  const { ta, isRtl } = useAdminI18n();
  const queryClient = useQueryClient();
  const [q, setQ]     = useState("");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const dir = isRtl ? "rtl" : "ltr";

  /* Current user + permissions */
  const { data: currentUser } = useAdminMe({ query: { queryKey: [] as const } as any });
  const perms = currentUser ? resolvePermissions(currentUser.email, currentUser.role) : null;
  const isLawyerUser = currentUser?.role === "lawyer";
  const viewOwnOnly = isLawyerUser && perms?.viewAssignedCasesOnly && !perms?.editCases;

  /* Find linked lawyer ID for current user */
  const allUsers = loadUsers();
  const myRecord = allUsers.find(u => u.email.toLowerCase() === (currentUser?.email ?? "").toLowerCase());
  const myLinkedLawyerId = myRecord?.linkedLawyerId ?? null;

  /* Co-counsel localStorage */
  const [caseCounsels, setCaseCounsels] = useState(loadCaseCounsels());
  const refreshCounsels = () => setCaseCounsels(loadCaseCounsels());

  /* Assign dialog */
  const [assignCase, setAssignCase] = useState<any | null>(null);
  const [assignLawyerId, setAssignLawyerId] = useState<string>("null");
  const [coCounselIds, setCoCounselIds] = useState<number[]>([]);

  const { data, isLoading } = useListAdminCases({
    ...(q && { q }),
    ...(status !== "all" && { status: status as CaseStatus }),
  });
  const createCase   = useCreateAdminCase();
  const updateCase   = useUpdateAdminCase();
  const { data: clients }       = useListAdminClients({});
  const { data: lawyers }       = useListAdminLawyers();
  const { data: practiceAreas } = useListPracticeAreas();

  const lawyerList = Array.isArray(lawyers) ? lawyers : (lawyers as any)?.data ?? [];

  /* Filter cases for lawyer users */
  const filteredData = (() => {
    if (!data) return [];
    if (!viewOwnOnly || !myLinkedLawyerId) return data;
    return data.filter(c => {
      const primMatch  = c.lawyerId === myLinkedLawyerId;
      const coMatch    = (caseCounsels[c.id] ?? []).includes(myLinkedLawyerId);
      return primMatch || coMatch;
    });
  })();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: 0, lawyerId: null, practiceAreaId: null,
      titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "",
      status: CreateCaseInputStatus.open, priority: CreateCaseInputPriority.medium,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createCase.mutateAsync({ data: { ...values, description: values.descriptionEn || values.descriptionAr || "" } as any });
      toast.success(isRtl ? "تمت إضافة القضية" : "Case created");
      queryClient.invalidateQueries({ queryKey: getListAdminCasesQueryKey() });
      setOpen(false); form.reset();
    } catch { toast.error("Error"); }
  };

  /* Open assign dialog */
  const openAssign = (c: any) => {
    setAssignCase(c);
    setAssignLawyerId(c.lawyerId ? String(c.lawyerId) : "null");
    setCoCounselIds(caseCounsels[c.id] ?? []);
  };

  const saveAssignment = async () => {
    if (!assignCase) return;
    try {
      const lId = assignLawyerId === "null" ? null : Number(assignLawyerId);
      await updateCase.mutateAsync({ id: assignCase.id, data: { lawyerId: lId } as any });
      saveCaseCounsel(assignCase.id, coCounselIds);
      refreshCounsels();
      queryClient.invalidateQueries({ queryKey: getListAdminCasesQueryKey() });
      toast.success(isRtl ? "تم حفظ التعيين" : "Assignment saved");
      setAssignCase(null);
    } catch { toast.error("Error saving"); }
  };

  const toggleCoCounsel = (id: number) => {
    setCoCounselIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const CASE_STATUSES = [
    { value: "open",        label: ta("status.open") },
    { value: "in_progress", label: isRtl ? "قيد التنفيذ" : "In Progress" },
    { value: "closed",      label: ta("status.closed") },
    { value: "won",         label: isRtl ? "رُبحت" : "Won" },
    { value: "lost",        label: isRtl ? "خُسرت" : "Lost" },
  ];

  const PRIORITIES = [
    { value: "low",    label: isRtl ? "منخفضة" : "Low" },
    { value: "medium", label: isRtl ? "متوسطة" : "Medium" },
    { value: "high",   label: isRtl ? "عالية" : "High" },
    { value: "urgent", label: isRtl ? "عاجل" : "Urgent" },
  ];

  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        title={ta("cases.title")}
        subtitle={isRtl ? "إدارة القضايا النشطة والسابقة" : "Manage active & past cases"}
        icon={<Briefcase className="w-5 h-5" />}
        dir={dir}
        action={
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) form.reset(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-9 text-sm shadow-sm"><Plus className="w-4 h-4" />{ta("cases.add")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0" dir={dir}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="admin-form">
                  <AdminDialog
                    title={ta("cases.add")}
                    subtitle={isRtl ? "أدخل تفاصيل القضية الجديدة" : "Enter new case details"}
                    icon={<Briefcase className="w-4 h-4" />}
                    dir={dir}
                    footer={<>
                      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>{ta("act.cancel")}</Button>
                      <Button type="submit" size="sm" disabled={createCase.isPending}>
                        {createCase.isPending ? ta("act.saving") : ta("act.save")}
                      </Button>
                    </>}
                  >
                    <FormSection title={isRtl ? "التعيين" : "Assignment"} icon={<Users className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="clientId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ta("cases.client")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                              <FormControl><SelectTrigger><SelectValue placeholder={isRtl ? "اختر عميلاً" : "Select client"} /></SelectTrigger></FormControl>
                              <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="lawyerId" render={({ field }) => (
                          <FormItem>
                            <FormLabel><Scale className="inline w-3 h-3 mb-0.5 me-1" />{isRtl ? "المحامي" : "Lawyer"}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                              <FormControl><SelectTrigger><SelectValue placeholder={isRtl ? "غير معين" : "Unassigned"} /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="null">{isRtl ? "غير معين" : "Unassigned"}</SelectItem>
                                {lawyers?.map(l => <SelectItem key={l.id} value={String(l.id)}>{isRtl ? l.nameAr : l.nameEn}</SelectItem>)}
                              </SelectContent>
                            </Select>
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
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{ta("cases.status")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{CASE_STATUSES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="priority" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{isRtl ? "الأولوية" : "Priority"}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{PRIORITIES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>
                      </FieldGrid>
                    </FormSection>

                    <FormSection title={isRtl ? "عنوان القضية" : "Case Title"} icon={<AlignLeft className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="titleEn" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ta("cases.title_")} <span className="lang-tag">EN</span></FormLabel>
                            <FormControl><Input dir="ltr" placeholder="Case title in English" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="titleAr" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ta("cases.title_")} <span className="lang-tag">AR</span></FormLabel>
                            <FormControl><Input dir="rtl" placeholder="عنوان القضية بالعربية" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </FieldGrid>
                    </FormSection>

                    <FormSection title={isRtl ? "الوصف" : "Description"} icon={<AlignLeft className="w-3.5 h-3.5" />}>
                      <FieldGrid cols={2}>
                        <FormField control={form.control} name="descriptionEn" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ta("cases.description")} <span className="lang-tag">EN</span></FormLabel>
                            <FormControl><Textarea rows={3} dir="ltr" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="descriptionAr" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ta("cases.description")} <span className="lang-tag">AR</span></FormLabel>
                            <FormControl><Textarea rows={3} dir="rtl" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </FieldGrid>
                    </FormSection>

                  </AdminDialog>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard>
        <FilterBar>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
            <div className="relative flex-1 min-w-0">
              <Search className={`absolute ${isRtl ? "right-2.5" : "left-2.5"} top-2.5 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={ta("act.search")}
                className={isRtl ? "pr-9" : "pl-9"}
                value={q} onChange={e => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ta("act.all")}</SelectItem>
                  {CASE_STATUSES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FilterBar>

        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              <TableHead>{ta("cases.number")}</TableHead>
              <TableHead>{ta("cases.title_")}</TableHead>
              <TableHead>{ta("cases.client")}</TableHead>
              <TableHead>{isRtl ? "المحامي المكلّف" : "Assigned Lawyer"}</TableHead>
              <TableHead>{ta("cases.status")}</TableHead>
              <TableHead>{ta("cases.opened")}</TableHead>
              <TableHead className="text-end">{ta("act.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <SkeletonRows cols={7} /> :
             !filteredData.length ? <EmptyState cols={7} message={ta("act.noData")} icon={<Briefcase className="w-8 h-8" />} /> : (
              filteredData.map(c => {
                const co = caseCounsels[c.id] ?? [];
                const coLawyers = co.map(id => lawyerList.find((l: any) => l.id === id)).filter(Boolean);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.caseNumber}</TableCell>
                    <TableCell>
                      <NameCell primary={isRtl ? c.titleAr : c.titleEn} secondary={isRtl ? c.titleEn : c.titleAr} maxWidth="max-w-[200px]" />
                    </TableCell>
                    <TableCell className="text-sm">{c.clientName}</TableCell>
                    {/* Lawyer assignment cell */}
                    <TableCell>
                      {c.lawyerName ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                              <Scale className="w-2.5 h-2.5 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-foreground">{c.lawyerName}</span>
                          </div>
                          {coLawyers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {coLawyers.map((l: any) => (
                                <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                                  {isRtl ? l.nameAr : l.nameEn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">{isRtl ? "غير معيّن" : "Unassigned"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={c.status} label={CASE_STATUSES.find(s => s.value === c.status)?.label} />
                        <Badge className={`text-[10px] border-none w-fit ${PRIORITY_COLORS[c.priority] ?? "bg-gray-100 text-gray-600"}`}>
                          {PRIORITIES.find(p => p.value === c.priority)?.label ?? c.priority}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {format(new Date(c.openedAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="col-actions">
                      <TableActions>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setLocation(`/admin/cases/${c.id}`)}>
                          {ta("act.view")}
                        </Button>
                        {perms?.assignCases && (
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => openAssign(c)}>
                            <UserCheck className="w-3 h-3" />
                            {isRtl ? "تعيين" : "Assign"}
                          </Button>
                        )}
                      </TableActions>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* ══ Assign Lawyers Dialog ══ */}
      <Dialog open={!!assignCase} onOpenChange={v => { if (!v) setAssignCase(null); }}>
        <DialogContent className="overflow-hidden p-0 gap-0 max-w-md" dir={dir}>
          {assignCase && (
            <AdminDialog
              title={isRtl ? "تعيين المحامين" : "Assign Lawyers"}
              subtitle={isRtl ? `القضية: ${isRtl ? assignCase.titleAr : assignCase.titleEn}` : `Case: ${assignCase.titleEn ?? assignCase.titleAr}`}
              icon={<UserCheck className="w-4 h-4" />}
              footer={
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setAssignCase(null)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                  <Button onClick={saveAssignment} disabled={updateCase.isPending}>
                    {isRtl ? "حفظ التعيين" : "Save Assignment"}
                  </Button>
                </div>
              }
            >
              <div className="p-5 space-y-5">
                {/* Primary lawyer */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{isRtl ? "المحامي الرئيسي" : "Primary Lawyer"}</label>
                  <Select value={assignLawyerId} onValueChange={setAssignLawyerId}>
                    <SelectTrigger><SelectValue placeholder={isRtl ? "غير معيّن" : "Unassigned"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">{isRtl ? "غير معيّن" : "Unassigned"}</SelectItem>
                      {lawyerList.map((l: any) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {isRtl ? l.nameAr : l.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">{isRtl ? "المحامي المسؤول عن هذه القضية بشكل أساسي" : "The primary lawyer responsible for this case"}</p>
                </div>

                {/* Co-counsel */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{isRtl ? "المحامون المشاركون (اختياري)" : "Co-Counsel (optional)"}</label>
                  <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/30 max-h-52 overflow-y-auto">
                    {lawyerList.map((l: any) => {
                      const isPrimary = String(l.id) === assignLawyerId && assignLawyerId !== "null";
                      const checked = coCounselIds.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-start ${isPrimary ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => !isPrimary && toggleCoCounsel(l.id)}
                          disabled={isPrimary}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}>
                            {checked && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{isRtl ? l.nameAr : l.nameEn}</p>
                            {isPrimary && <p className="text-[10px] text-muted-foreground">{isRtl ? "المحامي الرئيسي" : "Primary"}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{isRtl ? "يمكن إضافة أكثر من محامٍ مشارك في نفس القضية" : "Multiple co-counsel lawyers can be added to the same case"}</p>
                </div>
              </div>
            </AdminDialog>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
