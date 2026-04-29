import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useListAdminLawyers, useAdminMe } from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  Users, UserPlus, Edit, Trash2, ShieldCheck, ShieldOff,
  Scale, User, Headphones, Crown, Shield,
  CheckCircle2, XCircle, Mail, ToggleLeft, ToggleRight,
  AlertTriangle, Eye, Lock,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  PageHeader, SkeletonRows, EmptyState, SectionCard, AdminDialog,
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  PermissionKey,
} from "@/lib/permissions";

/* ─── Role meta ─── */
type RoleId = "super_admin" | "admin" | "lawyer" | "support";
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
});
type FormValues = z.infer<typeof schema>;

/* ═══════════════════════════════════════════════ */

export default function AdminUsers() {
  const { ta, isRtl } = useAdminI18n();
  const dir = isRtl ? "rtl" : "ltr";
  const { data: currentUser } = useAdminMe({ query: { queryKey: [] as const } as any });

  /* Lawyers for linking */
  const { data: lawyersRaw } = useListAdminLawyers();
  const lawyers = Array.isArray(lawyersRaw) ? lawyersRaw
    : (lawyersRaw as any)?.data ?? (lawyersRaw as any)?.items ?? [];

  /* Local state */
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [permTarget, setPermTarget] = useState<UserRecord | null>(null);
  const [permEdit,   setPermEdit]   = useState<Record<PermissionKey, boolean> | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => { setUsers(loadUsers()); }, []);

  /* Check current user is super_admin or admin with manageUsers */
  const myPerms = currentUser
    ? resolvePermissions(currentUser.email, currentUser.role)
    : null;
  const canManage = currentUser?.role === "super_admin" || myPerms?.manageUsers;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role: "lawyer", linkedLawyerId: null, isActive: true },
  });

  const resetAndOpen = (user?: UserRecord) => {
    if (user) {
      setEditTarget(user);
      form.reset({ name: user.name, email: user.email, role: user.role, linkedLawyerId: user.linkedLawyerId ?? null, isActive: user.isActive });
    } else {
      setEditTarget(null);
      form.reset({ name: "", email: "", role: "lawyer", linkedLawyerId: null, isActive: true });
      setOpenCreate(true);
    }
  };

  const onSubmit = (values: FormValues) => {
    const now = new Date().toISOString();
    const record: UserRecord = {
      id: editTarget?.id ?? crypto.randomUUID(),
      email:          values.email,
      name:           values.name,
      role:           values.role,
      linkedLawyerId: values.linkedLawyerId ?? null,
      permissions:    editTarget?.permissions ?? getDefaultPermissions(values.role),
      isActive:       values.isActive,
      createdAt:      editTarget?.createdAt ?? now,
    };
    upsertUser(record);
    setUsers(loadUsers());
    toast.success(isRtl ? "تم حفظ المستخدم" : "User saved");
    setOpenCreate(false);
    setEditTarget(null);
    form.reset();
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
    setUsers(loadUsers());
    toast.success(isRtl ? "تم حذف المستخدم" : "User deleted");
  };

  const toggleActive = (user: UserRecord) => {
    upsertUser({ ...user, isActive: !user.isActive });
    setUsers(loadUsers());
  };

  /* Open permissions editor */
  const openPerms = (user: UserRecord) => {
    setPermTarget(user);
    setPermEdit({ ...getDefaultPermissions(user.role), ...user.permissions });
  };

  const savePerms = () => {
    if (!permTarget || !permEdit) return;
    upsertUser({ ...permTarget, permissions: permEdit });
    setUsers(loadUsers());
    toast.success(isRtl ? "تم حفظ الصلاحيات" : "Permissions saved");
    setPermTarget(null);
    setPermEdit(null);
  };

  const resetPermsToDefault = () => {
    if (!permTarget) return;
    setPermEdit(getDefaultPermissions(permTarget.role));
  };

  /* Group permissions */
  const permGroups = Object.keys(PERMISSION_GROUPS).map(g => ({
    group: g,
    meta: PERMISSION_GROUPS[g],
    perms: PERMISSION_LIST.filter(p => p.group === g),
  }));

  const isCurrentUser = (u: UserRecord) => u.email.toLowerCase() === currentUser?.email?.toLowerCase();

  return (
    <div dir={dir} className="space-y-5">
      <PageHeader
        title={isRtl ? "إدارة المستخدمين والصلاحيات" : "Users & Permissions"}
        subtitle={isRtl ? "إدارة فريق العمل وتحديد الصلاحيات لكل عضو" : "Manage team members and control access permissions"}
        icon={<Users className="w-5 h-5" />}
        dir={dir}
        action={
          canManage ? (
            <Button size="sm" className="gap-2" onClick={() => { setEditTarget(null); setOpenCreate(true); resetAndOpen(); }}>
              <UserPlus className="w-4 h-4" />
              {isRtl ? "إضافة مستخدم" : "Add User"}
            </Button>
          ) : undefined
        }
      />

      {!canManage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {isRtl ? "ليس لديك صلاحية إدارة المستخدمين." : "You don't have permission to manage users."}
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["super_admin", "admin", "lawyer", "support"] as RoleId[]).map(role => {
          const m = ROLE_META[role];
          const Icon = m.icon;
          const count = users.filter(u => u.role === role && u.isActive).length;
          return (
            <div key={role} className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{count}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-none">{isRtl ? m.labelAr : m.labelEn}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Users Table ── */}
      <SectionCard>
        <div className="overflow-auto">
          <Table className="admin-table">
            <TableHeader>
              <TableRow>
                <TableHead>{isRtl ? "المستخدم" : "User"}</TableHead>
                <TableHead>{isRtl ? "الدور" : "Role"}</TableHead>
                <TableHead className="hidden md:table-cell">{isRtl ? "المحامي المرتبط" : "Linked Lawyer"}</TableHead>
                <TableHead className="hidden lg:table-cell">{isRtl ? "تاريخ الإضافة" : "Added"}</TableHead>
                <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <EmptyState
                  cols={6}
                  icon={<Users className="w-7 h-7" />}
                  message={isRtl ? "لم تتم إضافة أي مستخدمين بعد. اضغط «إضافة مستخدم» للبدء." : "No users added yet. Click 'Add User' to get started."}
                />
              )}
              {users.map(u => {
                const linked = lawyers.find((l: any) => l.id === u.linkedLawyerId);
                const isSelf = isCurrentUser(u);
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
                    <TableCell><RoleBadge role={u.role as RoleId} isRtl={isRtl} /></TableCell>

                    {/* Linked Lawyer */}
                    <TableCell className="hidden md:table-cell">
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
                      {u.createdAt ? format(new Date(u.createdAt), "d MMM yyyy") : "—"}
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
                        {canManage && (
                          <>
                            <Button
                              variant="ghost" size="sm" className="h-8 gap-1.5 text-xs"
                              onClick={() => openPerms(u)}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {isRtl ? "الصلاحيات" : "Permissions"}
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { resetAndOpen(u); setOpenCreate(true); }}
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
                                      {isRtl ? `هل أنت متأكد من حذف ${u.name}؟` : `Are you sure you want to delete ${u.name}?`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(u.id)} className="bg-destructive hover:bg-destructive/90">
                                      {isRtl ? "حذف" : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </>
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

      {/* ══ Add / Edit User Dialog ══ */}
      <Dialog open={openCreate} onOpenChange={v => { if (!v) { setOpenCreate(false); setEditTarget(null); } }}>
        <DialogContent className="overflow-hidden p-0 gap-0 max-w-lg" dir={dir}>
          <AdminDialog
            title={editTarget ? (isRtl ? "تعديل المستخدم" : "Edit User") : (isRtl ? "إضافة مستخدم جديد" : "Add New User")}
            subtitle={isRtl ? "حدد الدور ثم اضبط الصلاحيات من قائمة المستخدمين" : "Set role then fine-tune permissions from the users list"}
            icon={<UserPlus className="w-4 h-4" />}
            footer={
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setOpenCreate(false); setEditTarget(null); }}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={form.handleSubmit(onSubmit)}>{isRtl ? "حفظ" : "Save"}</Button>
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

                {/* Default permissions note */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  {isRtl
                    ? "ستُطبَّق الصلاحيات الافتراضية حسب الدور المحدد. يمكنك تخصيصها لاحقاً من زر «الصلاحيات» في القائمة."
                    : "Default permissions will be applied based on the selected role. You can customize them later using the 'Permissions' button."
                  }
                </div>
              </form>
            </Form>
          </AdminDialog>
        </DialogContent>
      </Dialog>

      {/* ══ Permissions Editor Dialog ══ */}
      <Dialog open={!!permTarget} onOpenChange={v => { if (!v) { setPermTarget(null); setPermEdit(null); } }}>
        <DialogContent className="overflow-hidden p-0 gap-0 max-w-2xl" dir={dir}>
          {permTarget && permEdit && (
            <AdminDialog
              title={isRtl ? `صلاحيات ${permTarget.name}` : `Permissions for ${permTarget.name}`}
              subtitle={isRtl ? "حدد ما يستطيع هذا المستخدم رؤيته والوصول إليه في النظام" : "Define what this user can see and access in the system"}
              icon={<ShieldCheck className="w-4 h-4" />}
              footer={
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" size="sm" onClick={resetPermsToDefault}>
                    {isRtl ? "استعادة الافتراضي" : "Reset to defaults"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setPermTarget(null); setPermEdit(null); }}>
                    {isRtl ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button size="sm" onClick={savePerms}>
                    {isRtl ? "حفظ الصلاحيات" : "Save Permissions"}
                  </Button>
                </div>
              }
            >
              <div className="p-5">
                {/* User info */}
                <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">{permTarget.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{permTarget.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={permTarget.role as RoleId} isRtl={isRtl} />
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

                {/* Permissions by group */}
                <div className="space-y-4">
                  {permGroups.map(({ group, meta, perms }) => (
                    <div key={group} className="rounded-xl border border-border/60 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40">
                        <h4 className="font-semibold text-sm">{isRtl ? meta.labelAr : meta.labelEn}</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const updated = { ...permEdit };
                              perms.forEach(p => { updated[p.key] = true; });
                              setPermEdit(updated as Record<PermissionKey, boolean>);
                            }}
                            className="text-[10px] text-primary hover:underline"
                            disabled={permTarget.role === "super_admin"}
                          >
                            {isRtl ? "تفعيل الكل" : "All on"}
                          </button>
                          <button
                            onClick={() => {
                              const updated = { ...permEdit };
                              perms.forEach(p => { updated[p.key] = false; });
                              setPermEdit(updated as Record<PermissionKey, boolean>);
                            }}
                            className="text-[10px] text-muted-foreground hover:text-destructive hover:underline"
                            disabled={permTarget.role === "super_admin"}
                          >
                            {isRtl ? "إيقاف الكل" : "All off"}
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-border/30">
                        {perms.map(p => (
                          <div key={p.key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
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
                  ))}
                </div>
              </div>
            </AdminDialog>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
