import { useEffect, useRef, useState } from "react";
import {
  Settings as SettingsIcon, Download, Upload, RotateCw,
  Database, Shield, AlertTriangle, Info,
} from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import {
  clearActiveTenant, listTenants, type Tenant,
} from "@/lib/tenants";
import { useAdminI18n } from "@/lib/admin-i18n";
import { toast } from "sonner";

const TENANTS_KEY = "super_admin_tenants";

export default function SuperAdminSettings() {
  const { isRtl } = useAdminI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tenants, setTenants] = useState<Tenant[]>(() => listTenants());
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { setTenants(listTenants()); }, []);

  function exportConfig() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      tenants,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `legal-hub-tenants-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRtl ? "تم تصدير الإعدادات" : "Tenants exported");
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.tenants)) throw new Error("invalid file");
        localStorage.setItem(TENANTS_KEY, JSON.stringify(data.tenants));
        setTenants(data.tenants);
        toast.success(isRtl ? `تم استيراد ${data.tenants.length} مكتب` : `Imported ${data.tenants.length} firms`);
        window.dispatchEvent(new Event("super-admin-tenants-updated"));
      } catch {
        toast.error(isRtl ? "ملف غير صالح" : "Invalid file format");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function resetEverything() {
    localStorage.removeItem(TENANTS_KEY);
    clearActiveTenant();
    setTenants([]);
    setConfirmReset(false);
    toast.success(isRtl ? "تم إعادة تهيئة المنصّة" : "Platform reset");
    setTimeout(() => window.location.reload(), 400);
  }

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={isRtl ? "إعدادات المنصّة" : "Platform settings"}
        subtitle={
          isRtl
            ? "النسخ الاحتياطي والاستعادة وإعادة التهيئة الكاملة لمنصّة Legal Hub."
            : "Backup, restore, and full-reset operations for the Legal Hub control plane."
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SuperPanel
          title={isRtl ? "نسخة احتياطية" : "Backup & restore"}
          subtitle={isRtl ? "صدّر إعدادات كل المكاتب أو استورد ملف نسخة احتياطية." : "Export all tenant configs as JSON, or import a previous backup."}
          icon={<Database className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <button
              onClick={exportConfig}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-200 hover:text-white text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              {isRtl ? "تصدير كل المكاتب" : "Export all tenants"}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-semibold transition-colors"
            >
              <Upload className="w-4 h-4" />
              {isRtl ? "استيراد ملف نسخة احتياطية" : "Import backup file"}
            </button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            {isRtl
              ? "💡 الاستيراد يستبدل البيانات الحالية. خذ نسخة احتياطية أولاً."
              : "💡 Importing overwrites your current tenant list. Take a backup first."}
          </p>
        </SuperPanel>

        <SuperPanel
          title={isRtl ? "معلومات المنصّة" : "Platform info"}
          icon={<Info className="w-4 h-4" />}
        >
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">{isRtl ? "الإصدار" : "Version"}</dt>
              <dd className="text-slate-200 font-mono">Control Plane v1.0</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">{isRtl ? "عدد المكاتب" : "Total tenants"}</dt>
              <dd className="text-slate-200 font-mono">{tenants.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">{isRtl ? "وضع التخزين" : "Storage backend"}</dt>
              <dd className="text-slate-200 font-mono">localStorage</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] text-sky-200/90 leading-relaxed">
            <Shield className="w-3.5 h-3.5 inline-block me-1.5 -mt-0.5" />
            {isRtl
              ? "البيانات حاليًّا مخزّنة في متصفّحك (localStorage). للنشر إلى عدّة أجهزة، يمكن لاحقًا تحويل التخزين إلى قاعدة بيانات بدون تغيير الواجهة."
              : "Data currently lives in your browser's localStorage. The same UI can later be backed by a server-side database without code changes."}
          </div>
        </SuperPanel>

        <SuperPanel
          title={<span className="text-rose-300">{isRtl ? "إعادة تهيئة كاملة" : "Factory reset"}</span>}
          subtitle={isRtl ? "احذف كل المكاتب والإعدادات. لا يمكن التراجع." : "Delete every tenant and platform setting. Irreversible."}
          icon={<AlertTriangle className="w-4 h-4" />}
        >
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-300 hover:text-rose-200 text-sm font-semibold transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              {isRtl ? "إعادة تهيئة المنصّة" : "Reset platform"}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-rose-200">
                {isRtl
                  ? "سيتم حذف كل المكاتب والإعدادات نهائيّاً. هل أنت متأكد؟"
                  : "Every tenant and platform setting will be deleted. Are you sure?"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 text-sm text-slate-300 hover:text-white px-3 py-2 rounded-md border border-slate-700 hover:border-slate-500 transition-colors"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={resetEverything}
                  className="flex-1 text-sm bg-rose-500 hover:bg-rose-400 text-white font-semibold px-3 py-2 rounded-md transition-colors"
                >
                  {isRtl ? "نعم، احذف كل شيء" : "Yes, wipe everything"}
                </button>
              </div>
            </div>
          )}
        </SuperPanel>

        <SuperPanel
          title={isRtl ? "روابط مفيدة" : "Useful links"}
          icon={<SettingsIcon className="w-4 h-4" />}
        >
          <div className="space-y-1.5">
            <a
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-700 hover:border-amber-500/40 hover:bg-amber-500/5 text-slate-300 hover:text-white text-xs transition-colors"
            >
              {isRtl ? "إدارة المكتب الافتراضي" : "Default firm's admin"}
            </a>
            <a
              href="/"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-700 hover:border-amber-500/40 hover:bg-amber-500/5 text-slate-300 hover:text-white text-xs transition-colors"
            >
              {isRtl ? "موقع المكتب الافتراضي" : "Default firm's public site"}
            </a>
            <a
              href="/admin/users"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-700 hover:border-amber-500/40 hover:bg-amber-500/5 text-slate-300 hover:text-white text-xs transition-colors"
            >
              {isRtl ? "إدارة مستخدمي مكتب واحد" : "Single-firm user permissions"}
            </a>
          </div>
        </SuperPanel>
      </div>
    </SuperAdminLayout>
  );
}
