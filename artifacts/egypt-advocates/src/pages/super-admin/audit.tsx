import { useEffect, useState } from "react";
import { Activity, Clock, User as UserIcon } from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import { loadAuditLog, type AuditEntry } from "@/lib/permissions";
import { useAdminI18n } from "@/lib/admin-i18n";

export default function SuperAdminAudit() {
  const { isRtl } = useAdminI18n();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setEntries(loadAuditLog());
    /* Refresh every few seconds in case other tabs append entries. */
    const id = setInterval(() => setEntries(loadAuditLog()), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={isRtl ? "نشاط المنصّة" : "Platform activity"}
        subtitle={
          isRtl
            ? "سجل بكل الإجراءات المهمّة التي يقوم بها مسؤولو المنصّة على أيّ مكتب."
            : "Append-only log of every consequential action super admins take across firms."
        }
      />

      <SuperPanel
        title={isRtl ? "آخر الأحداث" : "Latest events"}
        subtitle={`${entries.length} ${isRtl ? "حدث محفوظ" : "events on record"}`}
        icon={<Activity className="w-4 h-4" />}
      >
        {entries.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">
            <Clock className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            {isRtl ? "لا توجد أحداث بعد." : "No events yet."}
          </div>
        ) : (
          <ol className="space-y-1">
            {entries.map(e => (
              <li
                key={e.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/40 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-200 font-medium">{e.kind}</span>
                    {e.target && (
                      <span className="text-[11px] text-slate-500 font-mono">→ {e.target}</span>
                    )}
                  </div>
                  {e.details && (
                    <p className="text-[11.5px] text-slate-400 mt-0.5">{e.details}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {e.actor}{e.actorRole ? ` · ${e.actorRole}` : ""}
                    </span>
                    <span>{new Date(e.ts).toLocaleString(isRtl ? "ar-EG" : "en-GB")}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SuperPanel>
    </SuperAdminLayout>
  );
}
