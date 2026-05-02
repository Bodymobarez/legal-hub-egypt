import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useListAdminLawyers, useAdminMe } from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  Users, UserPlus, Edit, Trash2, ShieldCheck, ShieldOff,
  Scale, Headphones, Crown, Shield,
  CheckCircle2, XCircle, Mail, ToggleLeft, ToggleRight,
  AlertTriangle, Eye, Lock, Unlock,
  Sparkles, History, Search, Filter,
  Layers, FileText, Key, RotateCcw, Activity, Save,
  Plus,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader, SkeletonRows, EmptyState, SectionCard, AdminDialog,
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UserRecord, PERMISSION_LIST, PERMISSION_GROUPS,
  getDefaultPermissions, resolvePermissions, loadUsers, upsertUser, deleteUser,
  PermissionKey, RoleId, isSuperAdmin,
  BUILTIN_TEMPLATES, loadCustomTemplates, saveCustomTemplates, applyTemplate,
  type PermissionTemplate,
  loadAuditLog, appendAudit, clearAuditLog, type AuditEntry,
  setViewAs, getViewAs,
  loadLockdown, saveLockdown, type LockdownState,
} from "@/lib/permissions";

/* ─── Role meta ─── */
const ROLE_META: Record<RoleId, { labelAr: string; labelEn: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  super_admin: { labelAr: "مشرف عام",   labelEn: "Super Admin", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Crown    },
  admin:       { labelAr: "مدير",        labelEn: "Admin",       color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: Shield   },
  lawyer:      { labelAr: "محامٍ",       labelEn: "Lawyer",      color: "text-primary",    bg: "bg-primary/8 border-primary/25", icon: Scale    },
  support:     { labelAr: "دعم فني",     labelEn: "Support",     color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   icon: Headphones },
};

function RoleBadge({ role, isRtl }: { role: RoleId; isRtl: boolean }) {
  const m = ROLE_META[role] ?? ROLE_META.support;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.color} ${m.bg}`}>
      <Icon className="w-3 h-3" />
      {isRtl ? m.labelAr : m.labelEn}
    </span>
  );
}

/* ─── Form schema ─── */
const schema = z.object({
  name:           z.string().min(1, "Required"),
  email:          z.string().email("Valid email required"),
  role:           z.enum(["super_admin", "admin", "lawyer", "support"]),
  linkedLawyerId: z.number().nullable().optional(),
  isActive:       z.boolean(),
  notes:          z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/* ═══════════════════════════════════════════════ */

export default function AdminUsers() {
  const { isRtl } = useAdminI18n();
  const dir = isRtl ? "rtl" : "ltr";
  const dfLocale = isRtl ? arLocale : enUS;

  const { data: currentUser } = useAdminMe({ query: { queryKey: [] as const } as any });
  const isCurrentSuperAdmin = isSuperAdmin(currentUser?.role);

  /* Lawyers for linking */
  const { data: lawyersRaw } = useListAdminLawyers();
  const lawyers = Array.isArray(lawyersRaw) ? lawyersRaw
    : (lawyersRaw as any)?.data ?? (lawyersRaw as any)?.items ?? [];

  /* ── State ── */
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [permTarget, setPermTarget] = useState<UserRecord | null>(null);
  const [permEdit, setPermEdit] = useState<Record<PermissionKey, boolean> | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [customTemplates, setCustomTemplates] = useState<PermissionTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleId | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [lockdown, setLockdownState] = useState<LockdownState>({ enabled: false });

  useEffect(() => {
    setUsers(loadUsers());
    setAudit(loadAuditLog());
    setCustomTemplates(loadCustomTemplates());
    setLockdownState(loadLockdown());
  }, []);

  const refreshAll = () => {
    setUsers(loadUsers());
    setAudit(loadAuditLog());
    setCustomTemplates(loadCustomTemplates());
    setLockdownState(loadLockdown());
  };

  /* ── Audit shortcut ── */
  const log = (entry: Pick<AuditEntry, "kind"> & Partial<Pick<AuditEntry, "target" | "details">>) => {
    appendAudit({
      ...entry,
      actor: currentUser?.email ?? "system",
      actorRole: currentUser?.role ?? "system",
    });
    setAudit(loadAuditLog());
  };

  /* ── Form ── */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role: "lawyer", linkedLawyerId: null, isActive: true, notes: "" },
  });

  const resetAndOpen = (user?: UserRecord) => {
    if (user) {
      setEditTarget(user);
      form.reset({
        name: user.name, email: user.email, role: user.role,
        linkedLawyerId: user.linkedLawyerId ?? null, isActive: user.isActive, notes: user.notes ?? "",
      });
      setOpenCreate(true);
    } else {
      setEditTarget(null);
      form.reset({ name: "", email: "", role: "lawyer", linkedLawyerId: null, isActive: true, notes: "" });
      setOpenCreate(true);
    }
  };

  const onSubmit = (values: FormValues) => {
    const now = new Date().toISOString();
    const isEdit = !!editTarget;
    const record: UserRecord = {
      id: editTarget?.id ?? crypto.randomUUID(),
      email:          values.email,
      name:           values.name,
      role:           values.role,
      linkedLawyerId: values.linkedLawyerId ?? null,
      permissions:    editTarget?.permissions ?? getDefaultPermissions(values.role),
      isActive:       values.isActive,
      createdAt:      editTarget?.createdAt ?? now,
      notes:          values.notes,
    };
    upsertUser(record);
    setUsers(loadUsers());
    log({
      kind: isEdit ? "user.update" : "user.create",
      target: record.email,
      details: `${record.name} (${record.role})`,
    });
    toast.success(isRtl ? (isEdit ? "تم تحديث المستخدم" : "تم إنشاء المستخدم") : (isEdit ? "User updated" : "User created"));
    setOpenCreate(false);
    setEditTarget(null);
    form.reset();
  };

  const handleDelete = (u: UserRecord) => {
    deleteUser(u.id);
    setUsers(loadUsers());
    log({ kind: "user.delete", target: u.email, details: u.name });
    toast.success(isRtl ? "تم حذف المستخدم" : "User deleted");
  };

  const toggleActive = (user: UserRecord) => {
    upsertUser({ ...user, isActive: !user.isActive });
    setUsers(loadUsers());
    log({ kind: "user.toggle", target: user.email, details: !user.isActive ? "activated" : "deactivated" });
  };

  const openPerms = (user: UserRecord) => {
    setPermTarget(user);
    setPermEdit({ ...getDefaultPermissions(user.role), ...user.permissions });
  };

  const savePerms = () => {
    if (!permTarget || !permEdit) return;
    upsertUser({ ...permTarget, permissions: permEdit });
    setUsers(loadUsers());
    log({
      kind: "perm.update",
      target: permTarget.email,
      details: `permissions updated for ${permTarget.name}`,
    });
    toast.success(isRtl ? "تم حفظ الصلاحيات" : "Permissions saved");
    setPermTarget(null);
    setPermEdit(null);
  };

  const resetPermsToDefault = () => {
    if (!permTarget) return;
    setPermEdit(getDefaultPermissions(permTarget.role));
  };

  const applyTpl = (tpl: PermissionTemplate) => {
    if (!permTarget || !permEdit) return;
    const next = applyTemplate(permEdit, tpl);
    setPermEdit(next);
    log({ kind: "perm.template", target: permTarget.email, details: `applied template: ${tpl.nameEn}` });
    toast.success(isRtl ? `تم تطبيق "${tpl.nameAr}"` : `Applied "${tpl.nameEn}"`);
  };

  const handleViewAs = (u: UserRecord) => {
    setViewAs({ role: u.role, email: u.email, name: u.name });
    log({ kind: "view.as.start", target: u.email, details: `previewing as ${u.name}` });
    toast.success(isRtl ? `تشاهد الآن كـ ${u.name}` : `Now viewing as ${u.name}`);
  };
  const exitViewAs = () => {
    const va = getViewAs();
    setViewAs(null);
    if (va) log({ kind: "view.as.stop", target: va.email, details: "exited preview" });
  };

  const toggleLockdown = (next: boolean) => {
    const nextState: LockdownState = { enabled: next, setAt: new Date().toISOString() };
    saveLockdown(nextState);
    setLockdownState(nextState);
    log({ kind: "lockdown", details: next ? "enabled" : "disabled" });
    toast.success(isRtl ? (next ? "تم تفعيل وضع القفل" : "تم إلغاء وضع القفل") : (next ? "Lockdown enabled" : "Lockdown disabled"));
  };

  const updateLockdownReason = (patch: Partial<LockdownState>) => {
    const nextState: LockdownState = { ...lockdown, ...patch };
    saveLockdown(nextState);
    setLockdownState(nextState);
  };

  /* ── Filtering ── */
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (activeFilter === "active" && !u.isActive) return false;
      if (activeFilter === "inactive" && u.isActive) return false;
      if (search) {
        const s = search.toLowerCase();
        return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
      }
      return true;
    });
  }, [users, roleFilter, activeFilter, search]);

  const allTemplates = useMemo(() => [...BUILTIN_TEMPLATES, ...customTemplates], [customTemplates]);

  /* Permissions grouped for the editor */
  const permGroups = useMemo(() => Object.keys(PERMISSION_GROUPS).map(g => ({
    group: g,
    meta: PERMISSION_GROUPS[g],
    perms: PERMISSION_LIST.filter(p => p.group === g),
  })), []);

  const isCurrentUser = (u: UserRecord) => u.email.toLowerCase() === currentUser?.email?.toLowerCase();

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const restricted = users.filter(u => Object.values(u.permissions || {}).some(v => v === false)).length;
    return { total, active, restricted, byRole: (Object.keys(ROLE_META) as RoleId[]).map(r => ({ r, count: users.filter(u => u.role === r).length })) };
  }, [users]);

  /* ── Block non-super-admins from this whole page (defense in depth) ── */
  if (currentUser && !isCurrentSuperAdmin) {
    return (
      <div dir={dir} className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
            <Crown className="w-7 h-7 text-purple-600" />
          </div>
          <h1 className="text-xl font-serif font-bold">{isRtl ? "للمشرف العام فقط" : "Super Admin only"}</h1>
          <p className="text-sm text-muted-foreground">
            {isRtl ? "هذه الصفحة متاحة فقط للحساب صاحب صلاحية «مشرف عام»." : "This page is only available to super-admin accounts."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-5">
      <PageHeader
        title={isRtl ? "مركز تحكم المشرف العام" : "Super Admin Control Center"}
        subtitle={isRtl ? "تحكم بالكامل: من يستطيع الدخول، ما يراه، ومتى" : "Full control: who can sign in, what they see, when"}
        icon={<Crown className="w-5 h-5" />}
        dir={dir}
        action={
          <div className="flex items-center gap-2">
            {getViewAs() && (
              <Button size="sm" variant="outline" onClick={exitViewAs} className="gap-2">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                {isRtl ? "إنهاء المعاينة" : "Exit preview"}
              </Button>
            )}
            <Button size="sm" className="gap-2" onClick={() => resetAndOpen()}>
              <UserPlus className="w-4 h-4" />
              {isRtl ? "إضافة مستخدم" : "Add User"}
            </Button>
          </div>
        }
      />

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} value={stats.total}      label={isRtl ? "إجمالي المستخدمين" : "Total users"} tone="primary" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} value={stats.active} label={isRtl ? "نشط" : "Active"} tone="emerald" />
        <StatCard icon={<ShieldCheck className="w-4 h-4" />} value={stats.restricted} label={isRtl ? "مقيّد بصلاحيات" : "With restrictions"} tone="amber" />
        <StatCard icon={<Crown className="w-4 h-4" />} value={stats.byRole.find(r => r.r === "super_admin")?.count ?? 0} label={isRtl ? "مشرفون عامّون" : "Super admins"} tone="purple" />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-muted/30 border border-border/50 p-1 gap-1 flex-wrap h-auto">
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            {isRtl ? "المستخدمون" : "Users"}
            <span className="ms-1 text-[9px] bg-muted-foreground/20 px-1.5 py-0.5 rounded">{users.length}</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            {isRtl ? "القوالب الجاهزة" : "Templates"}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <History className="w-3.5 h-3.5" />
            {isRtl ? "سجل العمليات" : "Audit Log"}
            <span className="ms-1 text-[9px] bg-muted-foreground/20 px-1.5 py-0.5 rounded">{audit.length}</span>
          </TabsTrigger>
          <TabsTrigger value="lockdown" className="gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5" />
            {isRtl ? "وضع القفل" : "Lockdown"}
          </TabsTrigger>
        </TabsList>

        {/* ════════════ TAB: USERS ════════════ */}
        <TabsContent value="users" className="mt-5 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/60 bg-card">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isRtl ? "بحث بالاسم أو البريد…" : "Search by name or email…"}
                className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-0"
              />
            </div>
            <Select value={roleFilter} onValueChange={v => setRoleFilter(v as any)}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{isRtl ? "كل الأدوار" : "All roles"}</SelectItem>
                {(Object.keys(ROLE_META) as RoleId[]).map(r => (
                  <SelectItem key={r} value={r} className="text-xs">{isRtl ? ROLE_META[r].labelAr : ROLE_META[r].labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={v => setActiveFilter(v as any)}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"       className="text-xs">{isRtl ? "الكل" : "All"}</SelectItem>
                <SelectItem value="active"    className="text-xs">{isRtl ? "نشط" : "Active"}</SelectItem>
                <SelectItem value="inactive"  className="text-xs">{isRtl ? "معطّل" : "Inactive"}</SelectItem>
              </SelectContent>
            </Select>
            {(search || roleFilter !== "all" || activeFilter !== "all") && (
              <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setRoleFilter("all"); setActiveFilter("all"); }} className="h-8 text-xs gap-1">
                <RotateCcw className="w-3 h-3" />
                {isRtl ? "إعادة" : "Reset"}
              </Button>
            )}
          </div>

          {/* Users table */}
          <SectionCard>
            <div className="overflow-auto">
              <Table className="admin-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRtl ? "المستخدم" : "User"}</TableHead>
                    <TableHead>{isRtl ? "الدور" : "Role"}</TableHead>
                    <TableHead className="hidden md:table-cell">{isRtl ? "الصلاحيات" : "Access"}</TableHead>
                    <TableHead className="hidden lg:table-cell">{isRtl ? "المحامي المرتبط" : "Linked Lawyer"}</TableHead>
                    <TableHead className="hidden lg:table-cell">{isRtl ? "تاريخ الإضافة" : "Added"}</TableHead>
                    <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 && (
                    <EmptyState
                      cols={7}
                      icon={<Users className="w-7 h-7" />}
                      message={
                        users.length === 0
                          ? (isRtl ? "لم تتم إضافة أي مستخدمين بعد. اضغط «إضافة مستخدم» للبدء." : "No users yet. Click 'Add User' to get started.")
                          : (isRtl ? "لا نتائج مطابقة." : "No matching users.")
                      }
                    />
                  )}
                  {filteredUsers.map(u => {
                    const linked = lawyers.find((l: any) => l.id === u.linkedLawyerId);
                    const isSelf = isCurrentUser(u);
                    const eff = resolvePermissions(u.email, u.role);
                    const total = PERMISSION_LIST.length;
                    const granted = PERMISSION_LIST.filter(p => eff[p.key]).length;
                    return (
                      <TableRow key={u.id} className={`${!u.isActive ? "opacity-50" : ""}`}>
                        {/* User */}
                        <TableCell className="text-start!">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border border-border shrink-0">
                              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                                {u.name[0]?.toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{u.name}</p>
                                {isSelf && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">{isRtl ? "أنت" : "You"}</span>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell><RoleBadge role={u.role} isRtl={isRtl} /></TableCell>

                        {/* Access count */}
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${granted === total ? "bg-emerald-500" : granted === 0 ? "bg-rose-500" : "bg-amber-500"}`}
                                style={{ width: `${(granted / total) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">{granted}/{total}</span>
                          </div>
                        </TableCell>

                        {/* Linked Lawyer */}
                        <TableCell className="hidden lg:table-cell">
                          {linked ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Scale className="w-3 h-3 text-primary shrink-0" />
                              <span>{isRtl ? (linked as any).nameAr : (linked as any).nameEn}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Added */}
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {u.createdAt ? format(new Date(u.createdAt), "d MMM yyyy", { locale: dfLocale }) : "—"}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {u.isActive
                              ? <><CheckCircle2 className="w-3 h-3" />{isRtl ? "نشط" : "Active"}</>
                              : <><XCircle className="w-3 h-3" />{isRtl ? "معطّل" : "Inactive"}</>
                            }
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-end!">
                          <div className="flex items-center justify-end gap-1">
                            {!isSelf && (
                              <Button
                                variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                                onClick={() => handleViewAs(u)}
                                title={isRtl ? "معاينة كـ هذا المستخدم" : "View as this user"}
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-600" />
                                <span className="hidden xl:inline">{isRtl ? "معاينة" : "View as"}</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                              onClick={() => openPerms(u)}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">{isRtl ? "الصلاحيات" : "Perms"}</span>
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => resetAndOpen(u)}
                              title={isRtl ? "تعديل" : "Edit"}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => toggleActive(u)}
                              title={u.isActive ? (isRtl ? "تعطيل" : "Disable") : (isRtl ? "تفعيل" : "Enable")}
                            >
                              {u.isActive
                                ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                                : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                              }
                            </Button>
                            {!isSelf && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir={dir}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{isRtl ? "حذف المستخدم" : "Delete User"}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {isRtl ? `سيُحذف ${u.name} نهائياً من قائمة المستخدمين.` : `${u.name} will be permanently removed from the team.`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(u)} className="bg-destructive hover:bg-destructive/90">
                                      {isRtl ? "حذف" : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ════════════ TAB: TEMPLATES ════════════ */}
        <TabsContent value="templates" className="mt-5 space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              {isRtl
                ? "قوالب صلاحيات جاهزة لتطبيقها بنقرة واحدة على أي مستخدم من شاشة تحرير الصلاحيات. استخدم القوالب الجاهزة أو أنشئ قوالبك المخصصة من الصلاحيات الحالية لمستخدم."
                : "Reusable permission presets you can apply to any user from the permission editor with one click. Use the built-ins or save a custom one from a user's current permissions."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allTemplates.map(t => {
              const isCustom = !BUILTIN_TEMPLATES.some(b => b.id === t.id);
              const enabledCount = Object.values(t.permissions).filter(v => v).length;
              const disabledCount = Object.values(t.permissions).filter(v => v === false).length;
              return (
                <div key={t.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{isRtl ? t.nameAr : t.nameEn}</h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isCustom ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                          {isCustom ? (isRtl ? "مخصص" : "Custom") : (isRtl ? "افتراضي" : "Built-in")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{isRtl ? t.descriptionAr : t.descriptionEn}</p>
                    </div>
                    {isCustom && (
                      <button
                        onClick={() => {
                          const next = customTemplates.filter(c => c.id !== t.id);
                          saveCustomTemplates(next);
                          setCustomTemplates(next);
                          toast.success(isRtl ? "تم حذف القالب" : "Template deleted");
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title={isRtl ? "حذف" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {enabledCount} {isRtl ? "مفتوح" : "on"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                      <XCircle className="w-3 h-3" /> {disabledCount} {isRtl ? "مقفول" : "off"}
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground italic">
                    {isRtl ? "افتح صلاحيات أي مستخدم وطبّق القالب." : "Open a user's permissions to apply this template."}
                  </p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ════════════ TAB: AUDIT LOG ════════════ */}
        <TabsContent value="audit" className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isRtl ? `آخر ${audit.length} عملية` : `${audit.length} most recent actions`}
            </p>
            {audit.length > 0 && (
              <Button
                size="sm" variant="outline" className="gap-2 text-xs"
                onClick={() => { clearAuditLog(); setAudit([]); toast.success(isRtl ? "تم مسح السجل" : "Audit log cleared"); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isRtl ? "مسح السجل" : "Clear log"}
              </Button>
            )}
          </div>

          <SectionCard>
            {audit.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{isRtl ? "لا توجد عمليات بعد" : "No actions logged yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {audit.map(a => {
                  const meta = AUDIT_KIND_META[a.kind] ?? AUDIT_KIND_META["user.update"];
                  const Icon = meta.icon;
                  return (
                    <div key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{isRtl ? meta.labelAr : meta.labelEn}</span>
                          {a.target && <> — <span className="text-muted-foreground">{a.target}</span></>}
                        </p>
                        {a.details && <p className="text-[11px] text-muted-foreground mt-0.5">{a.details}</p>}
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(a.ts), { addSuffix: true, locale: dfLocale })}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">{a.actor}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ════════════ TAB: LOCKDOWN ════════════ */}
        <TabsContent value="lockdown" className="mt-5 space-y-4">
          <div className={`rounded-2xl border-2 p-5 ${lockdown.enabled ? "border-amber-500 bg-amber-50" : "border-border/60 bg-card"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${lockdown.enabled ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  {lockdown.enabled ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-base">{isRtl ? "وضع القفل" : "Lockdown mode"}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-prose">
                    {isRtl
                      ? "عند التفعيل، لن يستطيع أي حساب تسجيل الدخول للوحة التحكم باستثناء المشرف العام. تستخدم هذه الميزة أثناء الصيانة أو في حالات الطوارئ."
                      : "When enabled, only super admins can use the panel. Useful during maintenance or emergencies."}
                  </p>
                  {lockdown.enabled && lockdown.setAt && (
                    <p className="text-[10px] text-amber-700 mt-2 font-medium">
                      {isRtl ? "مفعّل منذ" : "Enabled"} {formatDistanceToNow(new Date(lockdown.setAt), { addSuffix: true, locale: dfLocale })}
                    </p>
                  )}
                </div>
              </div>
              <Switch checked={lockdown.enabled} onCheckedChange={toggleLockdown} />
            </div>

            {lockdown.enabled && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{isRtl ? "رسالة العرض (عربي)" : "Display message (Arabic)"}</label>
                  <Input
                    dir="rtl"
                    value={lockdown.reasonAr ?? ""}
                    onChange={e => updateLockdownReason({ reasonAr: e.target.value })}
                    placeholder={isRtl ? "النظام في صيانة دورية…" : ""}
                    className="h-9 text-sm bg-card"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Display message (English)</label>
                  <Input
                    dir="ltr"
                    value={lockdown.reasonEn ?? ""}
                    onChange={e => updateLockdownReason({ reasonEn: e.target.value })}
                    placeholder="System under scheduled maintenance…"
                    className="h-9 text-sm bg-card"
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ══ Add / Edit User Dialog ══ */}
      <Dialog open={openCreate} onOpenChange={v => { if (!v) { setOpenCreate(false); setEditTarget(null); } }}>
        <DialogContent className="overflow-hidden p-0 gap-0 max-w-lg" dir={dir}>
          <AdminDialog
            title={editTarget ? (isRtl ? "تعديل المستخدم" : "Edit User") : (isRtl ? "إضافة مستخدم جديد" : "Add New User")}
            subtitle={isRtl ? "حدد الدور ثم اضبط الصلاحيات لاحقاً من زر «الصلاحيات»" : "Pick a role, fine-tune permissions later from the 'Perms' button"}
            icon={<UserPlus className="w-4 h-4" />}
            footer={
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setOpenCreate(false); setEditTarget(null); }}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={form.handleSubmit(onSubmit)}>
                  <Save className="w-3.5 h-3.5 me-2" />
                  {isRtl ? "حفظ" : "Save"}
                </Button>
              </div>
            }
          >
            <Form {...form}>
              <form className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
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
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "الدور" : "Role"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(Object.keys(ROLE_META) as RoleId[]).map(r => {
                            const m = ROLE_META[r];
                            const Icon = m.icon;
                            return (
                              <SelectItem key={r} value={r}>
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                                  {isRtl ? m.labelAr : m.labelEn}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="linkedLawyerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRtl ? "المحامي المرتبط (اختياري)" : "Linked Lawyer (optional)"}</FormLabel>
                      <Select
                        onValueChange={v => field.onChange(v === "__none__" ? null : Number(v))}
                        value={field.value != null ? String(field.value) : "__none__"}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder={isRtl ? "اختر…" : "Select…"} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{isRtl ? "غير مرتبط" : "None"}</SelectItem>
                          {lawyers.map((l: any) => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              {isRtl ? l.nameAr : l.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRtl ? "ملاحظات داخلية (اختياري)" : "Internal notes (optional)"}</FormLabel>
                    <FormControl>
                      <Input dir={dir} {...field} placeholder={isRtl ? "مثل: محاسب من الفرع الرئيسي" : "e.g. Accountant — main branch"} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <p className="text-sm font-medium">{isRtl ? "الحساب نشط" : "Account Active"}</p>
                        <p className="text-xs text-muted-foreground">{isRtl ? "المستخدمون غير النشطين لا يستطيعون تسجيل الدخول" : "Inactive users cannot log in"}</p>
                      </div>
                    </div>
                  </FormItem>
                )} />

                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  {isRtl
                    ? "ستُطبَّق الصلاحيات الافتراضية حسب الدور المحدد. اضبطها لاحقاً من «الصلاحيات» أو طبّق قالباً جاهزاً."
                    : "Default permissions for the selected role apply. Fine-tune later from the 'Perms' button or apply a template."
                  }
                </div>
              </form>
            </Form>
          </AdminDialog>
        </DialogContent>
      </Dialog>

      {/* ══ Permissions Editor Dialog ══ */}
      <Dialog open={!!permTarget} onOpenChange={v => { if (!v) { setPermTarget(null); setPermEdit(null); } }}>
        <DialogContent className="overflow-hidden p-0 gap-0 max-w-3xl max-h-[90vh] flex flex-col" dir={dir}>
          {permTarget && permEdit && (
            <AdminDialog
              title={isRtl ? `صلاحيات ${permTarget.name}` : `Permissions for ${permTarget.name}`}
              subtitle={isRtl ? "حدد بدقة ما يستطيع هذا المستخدم رؤيته أو فعله" : "Precisely define what this user can see and do"}
              icon={<ShieldCheck className="w-4 h-4" />}
              footer={
                <div className="flex flex-wrap gap-2 justify-between items-center w-full">
                  <Button variant="ghost" size="sm" onClick={resetPermsToDefault} className="gap-1.5 text-xs">
                    <RotateCcw className="w-3 h-3" />
                    {isRtl ? "افتراضي الدور" : "Reset to role default"}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setPermTarget(null); setPermEdit(null); }}>
                      {isRtl ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const tplName = window.prompt(isRtl ? "اسم القالب" : "Template name");
                        if (!tplName) return;
                        const newTpl: PermissionTemplate = {
                          id: `custom_${Date.now()}`,
                          nameAr: tplName, nameEn: tplName,
                          descriptionAr: `مأخوذ من ${permTarget.name}`,
                          descriptionEn: `Captured from ${permTarget.name}`,
                          permissions: { ...permEdit },
                        };
                        const next = [...customTemplates, newTpl];
                        saveCustomTemplates(next);
                        setCustomTemplates(next);
                        toast.success(isRtl ? "تم حفظ القالب" : "Template saved");
                      }}
                      variant="outline"
                      className="gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isRtl ? "حفظ كقالب" : "Save as template"}
                    </Button>
                    <Button size="sm" onClick={savePerms} className="gap-1.5">
                      <Save className="w-3.5 h-3.5" />
                      {isRtl ? "حفظ الصلاحيات" : "Save Permissions"}
                    </Button>
                  </div>
                </div>
              }
            >
              <div className="p-5 overflow-auto" style={{ maxHeight: "calc(90vh - 240px)" }}>
                {/* User info */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">{permTarget.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{permTarget.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={permTarget.role} isRtl={isRtl} />
                      <span className="text-xs text-muted-foreground">{permTarget.email}</span>
                    </div>
                  </div>
                </div>

                {/* super_admin warning */}
                {permTarget.role === "super_admin" && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs mb-4">
                    <Crown className="w-3.5 h-3.5 shrink-0" />
                    {isRtl ? "المشرف العام يملك جميع الصلاحيات ولا يمكن تقييدها." : "Super Admin has all permissions and cannot be restricted."}
                  </div>
                )}

                {/* Templates row */}
                {permTarget.role !== "super_admin" && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {isRtl ? "قوالب جاهزة" : "Quick templates"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => applyTpl(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all"
                          title={isRtl ? t.descriptionAr : t.descriptionEn}
                        >
                          <Layers className="w-2.5 h-2.5 text-primary" />
                          {isRtl ? t.nameAr : t.nameEn}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions by group */}
                <div className="space-y-3">
                  {permGroups.map(({ group, meta, perms }) => {
                    const allOn = perms.every(p => permEdit[p.key]);
                    const noneOn = perms.every(p => !permEdit[p.key]);
                    return (
                      <div key={group} className="rounded-xl border border-border/60 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
                          <h4 className="font-semibold text-sm">{isRtl ? meta.labelAr : meta.labelEn}</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const updated = { ...permEdit };
                                perms.forEach(p => { updated[p.key] = true; });
                                setPermEdit(updated);
                              }}
                              disabled={permTarget.role === "super_admin" || allOn}
                              className="text-[10px] text-emerald-600 hover:underline disabled:opacity-30 disabled:no-underline"
                            >
                              {isRtl ? "تفعيل الكل" : "All on"}
                            </button>
                            <button
                              onClick={() => {
                                const updated = { ...permEdit };
                                perms.forEach(p => { updated[p.key] = false; });
                                setPermEdit(updated);
                              }}
                              disabled={permTarget.role === "super_admin" || noneOn}
                              className="text-[10px] text-rose-600 hover:underline disabled:opacity-30 disabled:no-underline"
                            >
                              {isRtl ? "إيقاف الكل" : "All off"}
                            </button>
                          </div>
                        </div>
                        <div className="divide-y divide-border/30">
                          {perms.map(p => (
                            <div key={p.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${permEdit[p.key] ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                                <div>
                                  <p className="text-sm font-medium">{isRtl ? p.labelAr : p.labelEn}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{p.key}</p>
                                </div>
                              </div>
                              <Switch
                                checked={permEdit[p.key]}
                                onCheckedChange={v => setPermEdit(prev => prev ? { ...prev, [p.key]: v } : prev)}
                                disabled={permTarget.role === "super_admin"}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AdminDialog>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const AUDIT_KIND_META: Record<AuditEntry["kind"], { labelAr: string; labelEn: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  "user.create":    { labelAr: "إضافة مستخدم",      labelEn: "User created",       icon: UserPlus,      color: "text-emerald-600", bg: "bg-emerald-50" },
  "user.update":    { labelAr: "تحديث مستخدم",      labelEn: "User updated",       icon: Edit,          color: "text-blue-600",     bg: "bg-blue-50" },
  "user.delete":    { labelAr: "حذف مستخدم",         labelEn: "User deleted",       icon: Trash2,        color: "text-rose-600",     bg: "bg-rose-50" },
  "user.toggle":    { labelAr: "تغيير الحالة",        labelEn: "Status toggled",     icon: ToggleRight,   color: "text-amber-600",    bg: "bg-amber-50" },
  "perm.update":    { labelAr: "تعديل صلاحيات",      labelEn: "Permissions changed", icon: ShieldCheck,   color: "text-primary",      bg: "bg-primary/10" },
  "perm.template":  { labelAr: "تطبيق قالب",          labelEn: "Template applied",   icon: Sparkles,      color: "text-violet-600",   bg: "bg-violet-50" },
  "view.as.start":  { labelAr: "بدء معاينة كـ",       labelEn: "Started view-as",    icon: Eye,           color: "text-purple-600",   bg: "bg-purple-50" },
  "view.as.stop":   { labelAr: "إنهاء معاينة",        labelEn: "Ended view-as",      icon: Eye,           color: "text-muted-foreground", bg: "bg-muted/30" },
  "lockdown":       { labelAr: "تغيير وضع القفل",     labelEn: "Lockdown changed",   icon: Lock,          color: "text-amber-600",    bg: "bg-amber-50" },
};

function StatCard({
  icon, value, label, tone,
}: { icon: React.ReactNode; value: number; label: string; tone: "primary" | "emerald" | "amber" | "purple" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50 text-amber-700",
    purple:  "bg-purple-50 text-purple-700",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-none">{label}</p>
      </div>
    </div>
  );
}
