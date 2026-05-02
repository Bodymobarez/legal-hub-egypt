/**
 * Permissions System — Super-Admin Edition
 * ─────────────────────────────────────────────────────────────────
 * Only `super_admin` is treated as unconditionally privileged.
 * Every other role (including `admin`) is restricted by the
 * permission map the super-admin has assigned for them, stored
 * locally in the browser (the backend has no user-mgmt API yet).
 *
 *   super_admin → everything ON, immutable
 *   admin       → defaults: everything except `manageUsers` (super-admin can revoke any of them)
 *   lawyer      → dashboard + own cases + appointments + chat + inquiries
 *   support     → dashboard + appointments + chat + inquiries
 */

/* ──────────────────────────────────────────────
   Permission catalogue
   ────────────────────────────────────────────── */

export type PermissionKey =
  | "viewDashboard"
  | "viewClients"      | "editClients"     | "deleteClients"
  | "viewCases"        | "editCases"       | "assignCases"    | "viewAssignedCasesOnly"
  | "viewAppointments" | "manageAppointments"
  | "viewChat"         | "replyChat"
  | "viewInquiries"    | "handleInquiries"
  | "viewInvoices"     | "editInvoices"
  | "viewPayments"     | "confirmPayments"
  | "manageServices"   | "manageLawyers"   | "manageContent"
  | "manageSettings"   | "manageAppearance" | "manageUsers";

export interface PermissionMeta {
  key: PermissionKey;
  labelAr: string;
  labelEn: string;
  group: string;
}

export const PERMISSION_LIST: PermissionMeta[] = [
  // Dashboard
  { key: "viewDashboard",          group: "dashboard",     labelAr: "عرض لوحة التحكم",         labelEn: "View Dashboard" },
  // Clients
  { key: "viewClients",            group: "clients",       labelAr: "عرض العملاء والموكّلين",   labelEn: "View Clients" },
  { key: "editClients",            group: "clients",       labelAr: "تعديل وإضافة عملاء",       labelEn: "Edit Clients" },
  { key: "deleteClients",          group: "clients",       labelAr: "حذف العملاء",               labelEn: "Delete Clients" },
  // Cases
  { key: "viewCases",              group: "cases",         labelAr: "عرض القضايا",               labelEn: "View Cases" },
  { key: "viewAssignedCasesOnly",  group: "cases",         labelAr: "عرض قضاياه المُعيَّنة فقط", labelEn: "View Own Cases Only" },
  { key: "editCases",              group: "cases",         labelAr: "تعديل القضايا",             labelEn: "Edit Cases" },
  { key: "assignCases",            group: "cases",         labelAr: "تعيين المحامين على القضايا", labelEn: "Assign Cases to Lawyers" },
  // Appointments
  { key: "viewAppointments",       group: "appointments",  labelAr: "عرض المواعيد",              labelEn: "View Appointments" },
  { key: "manageAppointments",     group: "appointments",  labelAr: "إدارة وتأكيد المواعيد",    labelEn: "Manage Appointments" },
  // Chat
  { key: "viewChat",               group: "chat",          labelAr: "عرض المحادثات",             labelEn: "View Chat" },
  { key: "replyChat",              group: "chat",          labelAr: "الرد على المحادثات",         labelEn: "Reply to Chat" },
  // Inquiries
  { key: "viewInquiries",          group: "inquiries",     labelAr: "عرض الاستفسارات",           labelEn: "View Inquiries" },
  { key: "handleInquiries",        group: "inquiries",     labelAr: "معالجة الاستفسارات",        labelEn: "Handle Inquiries" },
  // Finance
  { key: "viewInvoices",           group: "finance",       labelAr: "عرض الفواتير",              labelEn: "View Invoices" },
  { key: "editInvoices",           group: "finance",       labelAr: "تعديل وإنشاء فواتير",       labelEn: "Edit Invoices" },
  { key: "viewPayments",           group: "finance",       labelAr: "عرض المدفوعات",             labelEn: "View Payments" },
  { key: "confirmPayments",        group: "finance",       labelAr: "تأكيد وتسوية المدفوعات",   labelEn: "Confirm Payments" },
  // Content
  { key: "manageServices",         group: "content",       labelAr: "إدارة الخدمات",             labelEn: "Manage Services" },
  { key: "manageLawyers",          group: "content",       labelAr: "إدارة ملفات المحامين",      labelEn: "Manage Lawyers" },
  { key: "manageContent",          group: "content",       labelAr: "إدارة المقالات والمدونة",   labelEn: "Manage Content" },
  // System
  { key: "manageSettings",         group: "system",        labelAr: "إدارة الإعدادات العامة",    labelEn: "Manage Settings" },
  { key: "manageAppearance",       group: "system",        labelAr: "تعديل المظهر والثيم",      labelEn: "Edit Appearance & Theme" },
  { key: "manageUsers",            group: "system",        labelAr: "إدارة المستخدمين والصلاحيات", labelEn: "Manage Users & Permissions" },
];

export const PERMISSION_GROUPS: Record<string, { labelAr: string; labelEn: string }> = {
  dashboard:    { labelAr: "لوحة التحكم",   labelEn: "Dashboard" },
  clients:      { labelAr: "العملاء",        labelEn: "Clients" },
  cases:        { labelAr: "القضايا",        labelEn: "Cases" },
  appointments: { labelAr: "المواعيد",       labelEn: "Appointments" },
  chat:         { labelAr: "المحادثات",      labelEn: "Chat" },
  inquiries:    { labelAr: "الاستفسارات",   labelEn: "Inquiries" },
  finance:      { labelAr: "المالية",        labelEn: "Finance" },
  content:      { labelAr: "المحتوى",        labelEn: "Content" },
  system:       { labelAr: "النظام",         labelEn: "System" },
};

/* ──────────────────────────────────────────────
   Role defaults
   ────────────────────────────────────────────── */

export type RoleId = "super_admin" | "admin" | "lawyer" | "support";

const ROLE_DEFAULTS: Record<RoleId, Partial<Record<PermissionKey, boolean>>> = {
  super_admin: Object.fromEntries(PERMISSION_LIST.map(p => [p.key, true])) as Record<PermissionKey, boolean>,
  admin: Object.fromEntries(
    PERMISSION_LIST.map(p => [p.key, p.key !== "manageUsers"])
  ) as Record<PermissionKey, boolean>,
  lawyer: {
    viewDashboard: true,
    viewCases: true,
    viewAssignedCasesOnly: true,
    editCases: true,
    viewAppointments: true,
    viewChat: true,
    replyChat: true,
    viewInquiries: true,
    handleInquiries: true,
  },
  support: {
    viewDashboard: true,
    viewAppointments: true,
    viewChat: true,
    replyChat: true,
    viewInquiries: true,
    handleInquiries: true,
  },
};

export function getDefaultPermissions(role: string): Record<PermissionKey, boolean> {
  const defaults = ROLE_DEFAULTS[role as RoleId] ?? ROLE_DEFAULTS.super_admin;
  return Object.fromEntries(
    PERMISSION_LIST.map(p => [p.key, defaults[p.key] ?? false])
  ) as Record<PermissionKey, boolean>;
}

/* ──────────────────────────────────────────────
   Stored user records
   ────────────────────────────────────────────── */

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: RoleId;
  linkedLawyerId?: number | null;
  permissions: Record<PermissionKey, boolean>;
  isActive: boolean;
  createdAt: string;
  notes?: string;
}

const USERS_KEY = "admin_team_users";

export function loadUsers(): UserRecord[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}

export function saveUsers(users: UserRecord[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function upsertUser(u: UserRecord) {
  const all = loadUsers();
  const idx = all.findIndex(x => x.id === u.id);
  if (idx >= 0) all[idx] = u;
  else all.push(u);
  saveUsers(all);
}

export function deleteUser(id: string) {
  saveUsers(loadUsers().filter(u => u.id !== id));
}

/* ──────────────────────────────────────────────
   "View As" / impersonation
   Stored in sessionStorage so it never leaks past a browser restart.
   ────────────────────────────────────────────── */

const VIEW_AS_KEY = "admin_view_as";

export interface ViewAsState {
  role: RoleId;
  email?: string;
  name?: string;
}

export function getViewAs(): ViewAsState | null {
  try {
    const raw = sessionStorage.getItem(VIEW_AS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setViewAs(state: ViewAsState | null) {
  if (state) sessionStorage.setItem(VIEW_AS_KEY, JSON.stringify(state));
  else sessionStorage.removeItem(VIEW_AS_KEY);
  /* Notify listeners — sessionStorage events don't fire in the same tab. */
  window.dispatchEvent(new Event("admin-view-as-updated"));
}

/* ──────────────────────────────────────────────
   Resolution — the single source of truth.
   ────────────────────────────────────────────── */

export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === "super_admin";
}

/**
 * Decide what the *effective* user can do.
 *
 *   - Only super_admin is unrestricted.
 *   - Everyone else (admin / lawyer / support) is restricted by:
 *       1. Their stored localStorage record (if any), then
 *       2. Defaults for their role.
 *   - When the super-admin is in "View As" mode, the resolved permissions
 *     reflect the impersonated identity so the UI behaves as that role.
 */
export function resolvePermissions(
  email: string,
  apiRole: string,
): Record<PermissionKey, boolean> {
  /* View-as override has the highest priority. */
  const viewAs = typeof window !== "undefined" ? getViewAs() : null;
  if (viewAs) {
    if (viewAs.role === "super_admin") return getDefaultPermissions("super_admin");
    /* Look up impersonated user record to honour any custom perms. */
    if (viewAs.email) {
      const rec = loadUsers().find(u => u.email.toLowerCase() === viewAs.email!.toLowerCase());
      if (rec) return { ...getDefaultPermissions(rec.role), ...rec.permissions };
    }
    return getDefaultPermissions(viewAs.role);
  }

  /* Super-admin always sees everything. */
  if (isSuperAdmin(apiRole)) return getDefaultPermissions("super_admin");

  /* Look up custom record for this email; merge with role defaults. */
  if (email) {
    const record = loadUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (record) return { ...getDefaultPermissions(record.role), ...record.permissions };
  }

  /* Fallback: built-in role defaults. */
  return getDefaultPermissions(apiRole);
}

/* ──────────────────────────────────────────────
   Route → required permission map
   Used by the route-guard to block forbidden URLs.
   ────────────────────────────────────────────── */

export interface RouteRule {
  match: (path: string) => boolean;
  perm: PermissionKey;
}

const ROUTE_RULES: RouteRule[] = [
  { match: p => p === "/admin",                                   perm: "viewDashboard" },
  { match: p => p.startsWith("/admin/clients"),                   perm: "viewClients" },
  { match: p => p.startsWith("/admin/cases"),                     perm: "viewCases" },
  { match: p => p.startsWith("/admin/appointments"),              perm: "viewAppointments" },
  { match: p => p.startsWith("/admin/chat"),                      perm: "viewChat" },
  { match: p => p.startsWith("/admin/inquiries"),                 perm: "viewInquiries" },
  { match: p => p.startsWith("/admin/invoices"),                  perm: "viewInvoices" },
  { match: p => p.startsWith("/admin/statements"),                perm: "viewInvoices" },
  { match: p => p.startsWith("/admin/payments"),                  perm: "viewPayments" },
  { match: p => p.startsWith("/admin/services"),                  perm: "manageServices" },
  { match: p => p.startsWith("/admin/lawyers"),                   perm: "manageLawyers" },
  { match: p => p.startsWith("/admin/legal-articles"),            perm: "manageContent" },
  { match: p => p.startsWith("/admin/blog-posts"),                perm: "manageContent" },
  { match: p => p.startsWith("/admin/settings"),                  perm: "manageSettings" },
  { match: p => p.startsWith("/admin/users"),                     perm: "manageUsers" },
  /* Aliases for the Super Admin Control Center page */
  { match: p => p.startsWith("/admin/super-admin"),                perm: "manageUsers" },
  { match: p => p.startsWith("/admin/permissions"),                perm: "manageUsers" },
];

export function getRequiredPermForPath(path: string): PermissionKey | null {
  const rule = ROUTE_RULES.find(r => r.match(path));
  return rule?.perm ?? null;
}

export function canAccessPath(
  perms: Record<PermissionKey, boolean> | null,
  path: string,
): boolean {
  if (!perms) return true; /* unrestricted */
  const required = getRequiredPermForPath(path);
  if (!required) return true;
  return perms[required] === true;
}

/* ──────────────────────────────────────────────
   Quick permission templates
   ────────────────────────────────────────────── */

export interface PermissionTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  permissions: Partial<Record<PermissionKey, boolean>>;
}

export const BUILTIN_TEMPLATES: PermissionTemplate[] = [
  {
    id: "view_only",
    nameAr: "عرض فقط",
    nameEn: "View only",
    descriptionAr: "يستطيع رؤية كل شيء لكن لا يستطيع تعديل أي شيء",
    descriptionEn: "Can see everything, can edit nothing",
    permissions: {
      viewDashboard: true, viewClients: true, viewCases: true,
      viewAppointments: true, viewChat: true, viewInquiries: true,
      viewInvoices: true, viewPayments: true,
      editClients: false, deleteClients: false,
      editCases: false, assignCases: false,
      manageAppointments: false, replyChat: false, handleInquiries: false,
      editInvoices: false, confirmPayments: false,
      manageServices: false, manageLawyers: false, manageContent: false,
      manageSettings: false, manageAppearance: false, manageUsers: false,
    },
  },
  {
    id: "operations",
    nameAr: "عمليات يومية",
    nameEn: "Daily operations",
    descriptionAr: "إدارة المواعيد، الشات، الاستفسارات بدون لمس المالية أو النظام",
    descriptionEn: "Handle appointments, chat & inquiries — no finance/system access",
    permissions: {
      viewDashboard: true, viewClients: true, editClients: true,
      viewAppointments: true, manageAppointments: true,
      viewChat: true, replyChat: true,
      viewInquiries: true, handleInquiries: true,
      viewInvoices: false, viewPayments: false,
      manageSettings: false, manageAppearance: false, manageUsers: false,
    },
  },
  {
    id: "finance",
    nameAr: "المحاسب",
    nameEn: "Accountant",
    descriptionAr: "المالية فقط: فواتير، مدفوعات، تأكيدات",
    descriptionEn: "Finance only: invoices, payments, confirmations",
    permissions: {
      viewDashboard: true, viewClients: true,
      viewInvoices: true, editInvoices: true,
      viewPayments: true, confirmPayments: true,
      viewAppointments: true,
      viewChat: false, viewInquiries: false,
      manageServices: false, manageLawyers: false, manageContent: false,
      manageSettings: false, manageAppearance: false, manageUsers: false,
    },
  },
  {
    id: "content",
    nameAr: "محرر المحتوى",
    nameEn: "Content editor",
    descriptionAr: "مقالات، مدونة، خدمات، محامون — لا يصل للعملاء أو القضايا",
    descriptionEn: "Articles, blog, services, lawyers — no clients/cases access",
    permissions: {
      viewDashboard: true,
      manageContent: true, manageServices: true, manageLawyers: true,
      manageAppearance: true,
      viewClients: false, viewCases: false, viewInvoices: false, viewPayments: false,
      manageUsers: false, manageSettings: false,
    },
  },
];

const CUSTOM_TEMPLATES_KEY = "admin_perm_templates";

export function loadCustomTemplates(): PermissionTemplate[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || "[]"); }
  catch { return []; }
}

export function saveCustomTemplates(t: PermissionTemplate[]): void {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(t));
}

export function applyTemplate(
  base: Record<PermissionKey, boolean>,
  template: PermissionTemplate,
): Record<PermissionKey, boolean> {
  return { ...base, ...template.permissions } as Record<PermissionKey, boolean>;
}

/* ──────────────────────────────────────────────
   Audit log — simple append-only ring buffer
   ────────────────────────────────────────────── */

export interface AuditEntry {
  id: string;
  ts: string;          // ISO date
  actor: string;       // who performed the action (email)
  actorRole: string;
  kind: "user.create" | "user.update" | "user.delete" | "user.toggle" | "perm.update" | "perm.template" | "view.as.start" | "view.as.stop" | "lockdown";
  target?: string;     // affected user email or label
  details?: string;    // human-friendly note
}

const AUDIT_KEY = "admin_perm_audit";
const AUDIT_MAX = 200;

export function loadAuditLog(): AuditEntry[] {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]"); }
  catch { return []; }
}

export function clearAuditLog(): void {
  localStorage.removeItem(AUDIT_KEY);
}

export function appendAudit(entry: Omit<AuditEntry, "id" | "ts">): void {
  const log = loadAuditLog();
  log.unshift({
    ...entry,
    id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2),
    ts: new Date().toISOString(),
  });
  if (log.length > AUDIT_MAX) log.length = AUDIT_MAX;
  localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
}

/* ──────────────────────────────────────────────
   Lockdown mode
   When enabled, only super-admins can use the panel.
   Other users see a friendly "maintenance" screen on every page.
   ────────────────────────────────────────────── */

const LOCKDOWN_KEY = "admin_lockdown";

export interface LockdownState {
  enabled: boolean;
  reasonAr?: string;
  reasonEn?: string;
  setAt?: string;
}

export function loadLockdown(): LockdownState {
  try { return JSON.parse(localStorage.getItem(LOCKDOWN_KEY) || "null") || { enabled: false }; }
  catch { return { enabled: false }; }
}

export function saveLockdown(state: LockdownState): void {
  localStorage.setItem(LOCKDOWN_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("admin-lockdown-updated"));
}

/* ──────────────────────────────────────────────
   Case co-counsel storage (legacy — kept for compatibility)
   ────────────────────────────────────────────── */

const COUNSELS_KEY = "case_co_counsels";
type CaseCounsels = Record<number, number[]>;

export function loadCaseCounsels(): CaseCounsels {
  try { return JSON.parse(localStorage.getItem(COUNSELS_KEY) || "{}"); }
  catch { return {}; }
}
export function saveCaseCounsel(caseId: number, lawyerIds: number[]) {
  const all = loadCaseCounsels();
  all[caseId] = lawyerIds;
  localStorage.setItem(COUNSELS_KEY, JSON.stringify(all));
}
