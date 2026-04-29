/**
 * Permissions System
 * ─────────────────────────────────────────────────────────────────
 * All user records are stored in localStorage (keyed by email)
 * because the backend doesn't expose a user management API.
 * The current user's email comes from `useAdminMe()`.
 *
 * Role defaults:
 *   super_admin → everything ON (immutable)
 *   admin       → everything ON except manageUsers
 *   lawyer      → dashboard, own cases, appointments, chat, inquiries
 *   support     → dashboard, chat, inquiries
 */

export type PermissionKey =
  | "viewDashboard"
  | "viewClients"      | "editClients"     | "deleteClients"
  | "viewCases"        | "editCases"       | "assignCases"    | "viewAssignedCasesOnly"
  | "viewAppointments" | "manageAppointments"
  | "viewChat"         | "replyChat"
  | "viewInquiries"    | "handleInquiries"
  | "viewInvoices"     | "editInvoices"
  | "viewPayments"
  | "manageServices"   | "manageLawyers"   | "manageContent"
  | "manageSettings"   | "manageUsers";

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
  // Content
  { key: "manageServices",         group: "content",       labelAr: "إدارة الخدمات",             labelEn: "Manage Services" },
  { key: "manageLawyers",          group: "content",       labelAr: "إدارة ملفات المحامين",      labelEn: "Manage Lawyers" },
  { key: "manageContent",          group: "content",       labelAr: "إدارة المقالات والمدونة",   labelEn: "Manage Content" },
  // System
  { key: "manageSettings",         group: "system",        labelAr: "إدارة الإعدادات",           labelEn: "Manage Settings" },
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

/** Default permissions per role */
const ROLE_DEFAULTS: Record<string, Partial<Record<PermissionKey, boolean>>> = {
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
  const defaults = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.super_admin;
  return Object.fromEntries(
    PERMISSION_LIST.map(p => [p.key, defaults[p.key] ?? false])
  ) as Record<PermissionKey, boolean>;
}

/* ─── LocalStorage UserRecord ─── */
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "lawyer" | "support";
  linkedLawyerId?: number | null;
  permissions: Record<PermissionKey, boolean>;
  isActive: boolean;
  createdAt: string;
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

/** Get resolved permissions for a given email + api role */
export function resolvePermissions(
  email: string,
  apiRole: string,
): Record<PermissionKey, boolean> {
  // Privileged roles always get full access — never restrict via localStorage
  if (!apiRole || apiRole === "super_admin" || apiRole === "admin") {
    return getDefaultPermissions("super_admin");
  }
  // For lawyer / support: check for a custom localStorage record first
  const record = loadUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (record) return { ...getDefaultPermissions(record.role), ...record.permissions };
  // Fallback to role defaults
  return getDefaultPermissions(apiRole);
}

/* ─── Case co-counsel storage ─── */
const COUNSELS_KEY = "case_co_counsels";
type CaseCounsels = Record<number, number[]>; // caseId → lawyerIds[]

export function loadCaseCounsels(): CaseCounsels {
  try { return JSON.parse(localStorage.getItem(COUNSELS_KEY) || "{}"); }
  catch { return {}; }
}
export function saveCaseCounsel(caseId: number, lawyerIds: number[]) {
  const all = loadCaseCounsels();
  all[caseId] = lawyerIds;
  localStorage.setItem(COUNSELS_KEY, JSON.stringify(all));
}
