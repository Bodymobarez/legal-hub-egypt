/**
 * AdminRouteGuard — verifies the current user has permission to view
 * the requested admin page. Renders a friendly access-denied screen when
 * the route is forbidden.
 *
 * Resolution rules live entirely in `lib/permissions.ts`:
 *   - super_admin (no view-as): always allowed
 *   - everyone else: check `canAccessPath` against their resolved perms
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ShieldOff, ArrowLeft, LayoutDashboard } from "lucide-react";
import { useAdminMe } from "@workspace/api-client-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  canAccessPath, isSuperAdmin, getViewAs, resolvePermissions,
  getRequiredPermForPath,
  PERMISSION_LIST,
  type PermissionKey,
  type ViewAsState,
} from "@/lib/permissions";

interface Props {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: Props) {
  const [location, setLocation] = useLocation();
  const { isRtl } = useAdminI18n();
  const { data: user } = useAdminMe({ query: { retry: false, queryKey: [] as const } as any });

  const [viewAs, setVA] = useState<ViewAsState | null>(() =>
    typeof window !== "undefined" ? getViewAs() : null,
  );
  useEffect(() => {
    const refresh = () => setVA(getViewAs());
    window.addEventListener("admin-view-as-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("admin-view-as-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  /* Skip the guard entirely while user is loading or for the super-admin
     control center / login pages. */
  if (!user) return <>{children}</>;
  if (location.startsWith("/admin/login")) return <>{children}</>;

  const superAdmin = isSuperAdmin(user.role) && !viewAs;
  if (superAdmin) return <>{children}</>;

  const perms = resolvePermissions(user.email, user.role);
  if (canAccessPath(perms, location)) return <>{children}</>;

  const required = getRequiredPermForPath(location);
  const meta = PERMISSION_LIST.find(p => p.key === (required as PermissionKey));

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <ShieldOff className="w-7 h-7 text-rose-600" />
        </div>
        <div>
          <h1 className="text-xl font-serif font-bold text-foreground mb-1">
            {isRtl ? "ليس لديك صلاحية الوصول" : "Access denied"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isRtl
              ? "هذه الصفحة غير متاحة لحسابك. تواصل مع المشرف العام إذا كنت تحتاج صلاحية إضافية."
              : "Your account doesn't have access to this page. Contact the super admin if you believe this is a mistake."}
          </p>
          {meta && (
            <p className="text-[11px] text-muted-foreground/70 mt-3">
              {isRtl ? "الصلاحية المطلوبة" : "Required permission"}:{" "}
              <span className="font-mono bg-muted/40 px-1.5 py-0.5 rounded">{isRtl ? meta.labelAr : meta.labelEn}</span>
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30 transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            {isRtl ? "رجوع" : "Go back"}
          </button>
          <button
            onClick={() => setLocation("/admin")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
          >
            <LayoutDashboard className="w-4 h-4" />
            {isRtl ? "اللوحة" : "Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
