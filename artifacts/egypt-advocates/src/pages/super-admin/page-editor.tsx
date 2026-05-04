/**
 * Super Admin → Page Editor
 *
 * Visual section manager for the public website. Today this controls the
 * Home page: each section can be enabled/disabled, reordered, and have
 * its key text + CTA fields overridden per language. Page-level custom
 * CSS can be injected too.
 *
 * Configuration is persisted in `localStorage` (see lib/page-editor.ts).
 * Promotion to a backend store is a drop-in change to the loader.
 */

import { useMemo, useState } from "react";
import {
  Wand2, Eye, EyeOff, ArrowUp, ArrowDown, Settings2,
  RotateCcw, Code2, ExternalLink, ChevronDown, ChevronRight,
  Save, X, Type, MousePointerClick, AlignVerticalSpaceAround,
  Sparkles, MoveVertical,
} from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  HOME_SECTIONS,
  PADDING_PRESETS,
  type HomeSectionId,
  type SectionDescriptor,
  type SectionOverride,
  type PageEditorConfig,
  type PaddingPreset,
  loadPageEditorConfig,
  savePageEditorConfig,
  resetPageEditorConfig,
} from "@/lib/page-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function SuperAdminPageEditor() {
  const { isRtl } = useAdminI18n();
  const [cfg, setCfg] = useState<PageEditorConfig>(() => loadPageEditorConfig());
  const [editingId, setEditingId] = useState<HomeSectionId | null>(null);
  const [showCustomCss, setShowCustomCss] = useState(false);

  /** Persist + update local state in one shot. */
  function update(updater: (current: PageEditorConfig) => PageEditorConfig) {
    setCfg((current) => {
      const next = updater(current);
      savePageEditorConfig(next);
      return next;
    });
  }

  function toggleSection(id: HomeSectionId) {
    update((c) => ({
      ...c,
      pages: {
        ...c.pages,
        home: {
          ...c.pages.home,
          overrides: {
            ...c.pages.home.overrides,
            [id]: {
              ...(c.pages.home.overrides[id] ?? { enabled: true }),
              enabled: !(c.pages.home.overrides[id]?.enabled ?? true),
            },
          },
        },
      },
    }));
  }

  function moveSection(id: HomeSectionId, dir: -1 | 1) {
    update((c) => {
      const order = [...c.pages.home.order];
      const idx = order.indexOf(id);
      const nextIdx = idx + dir;
      if (idx < 0 || nextIdx < 0 || nextIdx >= order.length) return c;
      [order[idx], order[nextIdx]] = [order[nextIdx], order[idx]];
      return {
        ...c,
        pages: {
          ...c.pages,
          home: { ...c.pages.home, order },
        },
      };
    });
  }

  function patchOverride(id: HomeSectionId, patch: Partial<SectionOverride>) {
    update((c) => ({
      ...c,
      pages: {
        ...c.pages,
        home: {
          ...c.pages.home,
          overrides: {
            ...c.pages.home.overrides,
            [id]: {
              ...(c.pages.home.overrides[id] ?? { enabled: true }),
              ...patch,
            },
          },
        },
      },
    }));
  }

  function resetSection(id: HomeSectionId) {
    update((c) => {
      const overrides = { ...c.pages.home.overrides };
      delete overrides[id];
      return {
        ...c,
        pages: { ...c.pages, home: { ...c.pages.home, overrides } },
      };
    });
  }

  function setCustomCss(css: string) {
    update((c) => ({
      ...c,
      pages: { ...c.pages, home: { ...c.pages.home, customCss: css } },
    }));
  }

  function resetEverything() {
    if (typeof window !== "undefined" && !window.confirm(
      isRtl
        ? "هل تريد فعلاً مسح كل التعديلات والعودة للإعدادات الافتراضية؟"
        : "Reset all customizations and go back to factory defaults?",
    )) return;
    resetPageEditorConfig();
    setCfg(loadPageEditorConfig());
  }

  const orderedSections = useMemo(() => {
    return cfg.pages.home.order
      .map((id) => HOME_SECTIONS.find((s) => s.id === id))
      .filter((s): s is SectionDescriptor => Boolean(s));
  }, [cfg.pages.home.order]);

  const enabledCount = orderedSections.filter(
    (s) => cfg.pages.home.overrides[s.id]?.enabled ?? true,
  ).length;

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={isRtl ? "محرر الصفحات" : "Page Editor"}
        subtitle={
          isRtl
            ? "تحكّم كامل في أقسام الموقع العام: تفعيل وترتيب وتخصيص النصوص والأزرار."
            : "Full control over the public website's sections: toggle, reorder, and override text + CTAs."
        }
        action={
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800/60 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {isRtl ? "معاينة الموقع" : "Preview site"}
            </a>
            <button
              type="button"
              onClick={resetEverything}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-rose-700/50 text-rose-300 hover:bg-rose-900/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isRtl ? "إعادة كل شيء" : "Reset all"}
            </button>
          </div>
        }
      />

      {/* Page picker — currently only Home, room to grow. */}
      <SuperPanel
        title={isRtl ? "الصفحة المختارة" : "Page being edited"}
        icon={<Wand2 className="w-4 h-4" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <PagePill active label={isRtl ? "الصفحة الرئيسية" : "Home"} sectionsTotal={orderedSections.length} sectionsEnabled={enabledCount} />
          <PagePill comingSoon label={isRtl ? "من نحن" : "About"} />
          <PagePill comingSoon label={isRtl ? "الخدمات" : "Services"} />
          <PagePill comingSoon label={isRtl ? "محامونا" : "Lawyers"} />
          <PagePill comingSoon label={isRtl ? "المدونة" : "Blog"} />
          <PagePill comingSoon label={isRtl ? "اتصل بنا" : "Contact"} />
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          {isRtl
            ? "في النسخة الحالية يدعم محرر الأقسام الصفحة الرئيسية. الصفحات الأخرى ستضاف لاحقًا بنفس الواجهة."
            : "Section editor currently supports the Home page. Additional pages will land in the same UI shortly."}
        </p>
      </SuperPanel>

      {/* Section list */}
      <SuperPanel
        title={isRtl ? "أقسام الصفحة الرئيسية" : "Home page sections"}
        subtitle={
          isRtl
            ? `${enabledCount} مفعّل من إجمالي ${orderedSections.length}`
            : `${enabledCount} of ${orderedSections.length} enabled`
        }
        icon={<MoveVertical className="w-4 h-4" />}
      >
        <ol className="space-y-2.5">
          {orderedSections.map((section, idx) => {
            const override = cfg.pages.home.overrides[section.id] ?? { enabled: true };
            const isEnabled = override.enabled ?? true;
            const isExpanded = editingId === section.id;
            return (
              <li key={section.id}>
                <SectionRow
                  index={idx + 1}
                  total={orderedSections.length}
                  section={section}
                  override={override}
                  enabled={isEnabled}
                  expanded={isExpanded}
                  isRtl={isRtl}
                  onToggle={() => toggleSection(section.id)}
                  onMoveUp={() => moveSection(section.id, -1)}
                  onMoveDown={() => moveSection(section.id, +1)}
                  onExpand={() =>
                    setEditingId((curr) => (curr === section.id ? null : section.id))
                  }
                  onPatch={(patch) => patchOverride(section.id, patch)}
                  onReset={() => resetSection(section.id)}
                />
              </li>
            );
          })}
        </ol>
      </SuperPanel>

      {/* Page-level custom CSS */}
      <SuperPanel
        title={isRtl ? "تنسيقات CSS مخصصة" : "Custom CSS"}
        subtitle={
          isRtl
            ? "تُطبَّق على الموقع العام مباشرة. للمطوّرين فقط."
            : "Injected globally on the public site. Developer-mode tool — use with care."
        }
        icon={<Code2 className="w-4 h-4" />}
        action={
          <button
            type="button"
            onClick={() => setShowCustomCss((s) => !s)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800/60"
          >
            {showCustomCss ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                {isRtl ? "إخفاء" : "Hide"}
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                {isRtl ? "عرض المحرر" : "Show editor"}
              </>
            )}
          </button>
        }
      >
        {showCustomCss ? (
          <Textarea
            value={cfg.pages.home.customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            placeholder={
              isRtl
                ? "/* مثال:  .hero-bar { background: gold } */"
                : "/* Example:  .hero-bar { background: gold } */"
            }
            rows={10}
            className="font-mono text-xs bg-slate-950/60 border-slate-700 text-slate-100"
          />
        ) : (
          <p className="text-[11px] text-slate-500">
            {cfg.pages.home.customCss
              ? `${cfg.pages.home.customCss.length} ${isRtl ? "حرف محفوظ" : "characters saved"}`
              : isRtl
                ? "لا توجد تنسيقات مخصصة حاليًا."
                : "No custom CSS saved yet."}
          </p>
        )}
      </SuperPanel>
    </SuperAdminLayout>
  );
}

/* ──────────────────────────────────────────────
   Page picker pill
   ────────────────────────────────────────────── */

function PagePill({
  label,
  active,
  comingSoon,
  sectionsTotal,
  sectionsEnabled,
}: {
  label: string;
  active?: boolean;
  comingSoon?: boolean;
  sectionsTotal?: number;
  sectionsEnabled?: number;
}) {
  return (
    <button
      type="button"
      disabled={comingSoon}
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
        active
          ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
          : comingSoon
            ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700",
      ].join(" ")}
    >
      {label}
      {sectionsTotal != null && (
        <span className="text-[10px] opacity-70">
          {sectionsEnabled}/{sectionsTotal}
        </span>
      )}
      {comingSoon && (
        <span className="text-[9px] uppercase tracking-wider opacity-70">soon</span>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────────
   Single section row + expanded editor
   ────────────────────────────────────────────── */

function SectionRow({
  index, total, section, override, enabled, expanded, isRtl,
  onToggle, onMoveUp, onMoveDown, onExpand, onPatch, onReset,
}: {
  index: number;
  total: number;
  section: SectionDescriptor;
  override: SectionOverride;
  enabled: boolean;
  expanded: boolean;
  isRtl: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onExpand: () => void;
  onPatch: (patch: Partial<SectionOverride>) => void;
  onReset: () => void;
}) {
  const overridesActive = Object.keys(override).filter((k) => k !== "enabled").length;
  return (
    <div
      className={[
        "rounded-xl border bg-slate-900/40 transition-colors",
        enabled ? "border-slate-800" : "border-slate-800/60 opacity-60",
        expanded ? "ring-1 ring-amber-500/40" : "",
      ].join(" ")}
    >
      {/* Compact row */}
      <div className="flex items-center gap-3 p-3">
        <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 text-[11px] font-medium grid place-items-center shrink-0">
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm text-slate-100 truncate">
              {isRtl ? section.labelAr : section.labelEn}
            </h3>
            {overridesActive > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {overridesActive} {isRtl ? "تخصيص" : "overrides"}
              </span>
            )}
            {!enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                {isRtl ? "مخفي" : "hidden"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
            {isRtl ? section.descriptionAr : section.descriptionEn}
          </p>
        </div>

        {/* Reorder */}
        <div className="flex items-center gap-1">
          <IconBtn
            ariaLabel={isRtl ? "نقل لأعلى" : "Move up"}
            disabled={index === 1}
            onClick={onMoveUp}
            icon={<ArrowUp className="w-3.5 h-3.5" />}
          />
          <IconBtn
            ariaLabel={isRtl ? "نقل لأسفل" : "Move down"}
            disabled={index === total}
            onClick={onMoveDown}
            icon={<ArrowDown className="w-3.5 h-3.5" />}
          />
        </div>

        {/* Visibility */}
        <button
          type="button"
          onClick={onToggle}
          className={[
            "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border transition-colors",
            enabled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700/60",
          ].join(" ")}
        >
          {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {enabled ? (isRtl ? "ظاهر" : "Visible") : (isRtl ? "مخفي" : "Hidden")}
        </button>

        {/* Expand */}
        <IconBtn
          ariaLabel={isRtl ? "تخصيص" : "Customize"}
          onClick={onExpand}
          icon={
            expanded ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Settings2 className="w-3.5 h-3.5" />
            )
          }
          highlight={expanded}
        />
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-5 bg-slate-950/40">
          {/* Padding & extra classes */}
          <PaddingAndClassEditor
            override={override}
            onPatch={onPatch}
            isRtl={isRtl}
          />

          {/* Text overrides */}
          {section.hasTextOverrides && (
            <TextOverridesEditor override={override} onPatch={onPatch} isRtl={isRtl} />
          )}

          {/* CTA overrides */}
          {section.hasCtaOverrides && (
            <CtaOverridesEditor override={override} onPatch={onPatch} isRtl={isRtl} />
          )}

          {/* Reset */}
          {overridesActive > 0 && (
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border border-rose-700/40 text-rose-300 hover:bg-rose-900/20"
              >
                <RotateCcw className="w-3 h-3" />
                {isRtl ? "إعادة هذا القسم للافتراضي" : "Reset this section to defaults"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-editors
   ────────────────────────────────────────────── */

function PaddingAndClassEditor({
  override, onPatch, isRtl,
}: {
  override: SectionOverride;
  onPatch: (patch: Partial<SectionOverride>) => void;
  isRtl: boolean;
}) {
  return (
    <div>
      <FieldLabel
        icon={<AlignVerticalSpaceAround className="w-3.5 h-3.5" />}
        text={isRtl ? "التباعد العمودي وفئات إضافية" : "Vertical padding & extra classes"}
      />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
        <select
          value={override.paddingY ?? ""}
          onChange={(e) =>
            onPatch({
              paddingY: (e.target.value || undefined) as PaddingPreset | undefined,
            })
          }
          className="bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        >
          <option value="">{isRtl ? "افتراضي" : "Default"}</option>
          {PADDING_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Input
          value={override.extraClassName ?? ""}
          onChange={(e) => onPatch({ extraClassName: e.target.value || undefined })}
          placeholder={
            isRtl
              ? "مثال: my-custom-section bg-emerald-500/5"
              : "e.g. my-custom-section bg-emerald-500/5"
          }
          className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}

function TextOverridesEditor({
  override, onPatch, isRtl,
}: {
  override: SectionOverride;
  onPatch: (patch: Partial<SectionOverride>) => void;
  isRtl: boolean;
}) {
  return (
    <div>
      <FieldLabel
        icon={<Type className="w-3.5 h-3.5" />}
        text={isRtl ? "النصوص (يترك فارغًا يعني الافتراضي)" : "Text overrides (leave blank for default)"}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FieldGroup labelEn="Eyebrow (EN)" labelAr="الكلمة التمهيدية (EN)" isRtl={isRtl}>
          <Input
            value={override.eyebrowEn ?? ""}
            onChange={(e) => onPatch({ eyebrowEn: e.target.value || undefined })}
            className="bg-slate-900 border-slate-700 text-slate-100"
          />
        </FieldGroup>
        <FieldGroup labelEn="Eyebrow (AR)" labelAr="الكلمة التمهيدية (AR)" isRtl={isRtl}>
          <Input
            value={override.eyebrowAr ?? ""}
            onChange={(e) => onPatch({ eyebrowAr: e.target.value || undefined })}
            dir="rtl"
            className="bg-slate-900 border-slate-700 text-slate-100"
          />
        </FieldGroup>
        <FieldGroup labelEn="Title (EN)" labelAr="العنوان (EN)" isRtl={isRtl}>
          <Input
            value={override.titleEn ?? ""}
            onChange={(e) => onPatch({ titleEn: e.target.value || undefined })}
            className="bg-slate-900 border-slate-700 text-slate-100"
          />
        </FieldGroup>
        <FieldGroup labelEn="Title (AR)" labelAr="العنوان (AR)" isRtl={isRtl}>
          <Input
            value={override.titleAr ?? ""}
            onChange={(e) => onPatch({ titleAr: e.target.value || undefined })}
            dir="rtl"
            className="bg-slate-900 border-slate-700 text-slate-100"
          />
        </FieldGroup>
        <FieldGroup labelEn="Subtitle (EN)" labelAr="الوصف (EN)" isRtl={isRtl}>
          <Textarea
            rows={2}
            value={override.subtitleEn ?? ""}
            onChange={(e) => onPatch({ subtitleEn: e.target.value || undefined })}
            className="bg-slate-900 border-slate-700 text-slate-100"
          />
        </FieldGroup>
        <FieldGroup labelEn="Subtitle (AR)" labelAr="الوصف (AR)" isRtl={isRtl}>
          <Textarea
            rows={2}
            value={override.subtitleAr ?? ""}
            onChange={(e) => onPatch({ subtitleAr: e.target.value || undefined })}
            dir="rtl"
            className="bg-slate-900 border-slate-700 text-slate-100"
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function CtaOverridesEditor({
  override, onPatch, isRtl,
}: {
  override: SectionOverride;
  onPatch: (patch: Partial<SectionOverride>) => void;
  isRtl: boolean;
}) {
  return (
    <div>
      <FieldLabel
        icon={<MousePointerClick className="w-3.5 h-3.5" />}
        text={isRtl ? "أزرار الدعوة (CTA)" : "Call-to-action buttons"}
      />
      <div className="space-y-3">
        <CtaPair
          n={1}
          isRtl={isRtl}
          labelEn={override.ctaLabelEn ?? ""}
          labelAr={override.ctaLabelAr ?? ""}
          href={override.ctaHref ?? ""}
          onLabelEn={(v) => onPatch({ ctaLabelEn: v || undefined })}
          onLabelAr={(v) => onPatch({ ctaLabelAr: v || undefined })}
          onHref={(v) => onPatch({ ctaHref: v || undefined })}
        />
        <CtaPair
          n={2}
          isRtl={isRtl}
          labelEn={override.cta2LabelEn ?? ""}
          labelAr={override.cta2LabelAr ?? ""}
          href={override.cta2Href ?? ""}
          onLabelEn={(v) => onPatch({ cta2LabelEn: v || undefined })}
          onLabelAr={(v) => onPatch({ cta2LabelAr: v || undefined })}
          onHref={(v) => onPatch({ cta2Href: v || undefined })}
        />
      </div>
    </div>
  );
}

function CtaPair({
  n, isRtl, labelEn, labelAr, href, onLabelEn, onLabelAr, onHref,
}: {
  n: 1 | 2;
  isRtl: boolean;
  labelEn: string;
  labelAr: string;
  href: string;
  onLabelEn: (v: string) => void;
  onLabelAr: (v: string) => void;
  onHref: (v: string) => void;
}) {
  return (
    <div className="rounded-md bg-slate-900/60 border border-slate-800 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
        {isRtl ? `الزر ${n}` : `Button ${n}`}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input
          value={labelEn}
          onChange={(e) => onLabelEn(e.target.value)}
          placeholder={isRtl ? "النص (إنجليزي)" : "Label (English)"}
          className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
        />
        <Input
          value={labelAr}
          onChange={(e) => onLabelAr(e.target.value)}
          placeholder={isRtl ? "النص (عربي)" : "Label (Arabic)"}
          dir="rtl"
          className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
        />
        <Input
          value={href}
          onChange={(e) => onHref(e.target.value)}
          placeholder={isRtl ? "الرابط (مثال: /book)" : "Link (e.g. /book)"}
          dir="ltr"
          className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Tiny presentational helpers
   ────────────────────────────────────────────── */

function FieldLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
      {icon}
      {text}
    </p>
  );
}

function FieldGroup({
  labelEn, labelAr, isRtl, children,
}: {
  labelEn: string;
  labelAr: string;
  isRtl: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[10.5px] text-slate-500 mb-1 block">
        {isRtl ? labelAr : labelEn}
      </Label>
      {children}
    </div>
  );
}

function IconBtn({
  ariaLabel, onClick, icon, disabled, highlight,
}: {
  ariaLabel: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-7 h-7 rounded-md grid place-items-center transition-colors border",
        disabled
          ? "border-slate-800 text-slate-700 cursor-not-allowed"
          : highlight
            ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            : "border-slate-700 text-slate-300 hover:bg-slate-800/60",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}
