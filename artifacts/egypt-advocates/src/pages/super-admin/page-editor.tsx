/**
 * Super Admin → Page Editor
 *
 * Two-pane workspace:
 *
 *   ┌─────────────────────────────┬──────────────────────────────┐
 *   │  Sections list  + inspector │  Live preview <iframe src="/">│
 *   │  (tabs: Content / Style /   │   (auto-refreshes via the     │
 *   │   Layout)                   │    storage event whenever the │
 *   │                             │    config is saved here)      │
 *   └─────────────────────────────┴──────────────────────────────┘
 *
 * The left rail lists every home-page section. Each row shows the
 * section's current eyebrow + title (override or default) so the user
 * always sees what's actually rendering. Clicking a section opens an
 * inspector with three tabs:
 *   • Content — text, CTAs (with defaults pre-filled as placeholders)
 *   • Style   — colors (background / text / each button)
 *   • Layout  — alignment, container width, padding, extra classes
 *
 * Saving any control fires `storage` events, which the iframe listens
 * to via the existing `usePageEditorConfig` hook → instant preview.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wand2, Eye, EyeOff, ArrowUp, ArrowDown,
  RotateCcw, Code2, ExternalLink, ChevronDown, ChevronRight,
  X, Type, MousePointerClick, Palette, LayoutGrid,
  Smartphone, Monitor, Tablet, RefreshCw, Pencil,
  AlignLeft, AlignCenter, AlignRight, Check, FileText,
} from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  HOME_SECTIONS,
  PADDING_PRESETS,
  CONTAINER_WIDTHS,
  type HomeSectionId,
  type SectionDescriptor,
  type SectionOverride,
  type PageEditorConfig,
  type PaddingPreset,
  type ContainerWidth,
  type TextAlign,
  loadPageEditorConfig,
  savePageEditorConfig,
  resetPageEditorConfig,
} from "@/lib/page-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

type DeviceMode = "desktop" | "tablet" | "mobile";

export default function SuperAdminPageEditor() {
  const { isRtl } = useAdminI18n();
  const [cfg, setCfg] = useState<PageEditorConfig>(() => loadPageEditorConfig());
  const [editingId, setEditingId] = useState<HomeSectionId | null>(null);
  const [showCustomCss, setShowCustomCss] = useState(false);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
        pages: { ...c.pages, home: { ...c.pages.home, customCss: c.pages.home.customCss, overrides } },
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
    setPreviewKey((k) => k + 1);
  }

  const orderedSections = useMemo(() => {
    return cfg.pages.home.order
      .map((id) => HOME_SECTIONS.find((s) => s.id === id))
      .filter((s): s is SectionDescriptor => Boolean(s));
  }, [cfg.pages.home.order]);

  const enabledCount = orderedSections.filter(
    (s) => cfg.pages.home.overrides[s.id]?.enabled ?? true,
  ).length;

  /* iframe device-mode width matrix. */
  const previewWidths: Record<DeviceMode, string> = {
    desktop: "100%",
    tablet:  "820px",
    mobile:  "390px",
  };

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={isRtl ? "محرر الصفحات" : "Page Editor"}
        subtitle={
          isRtl
            ? "حرّر الموقع العام بصريًا — كل تعديل يظهر في المعاينة على الفور."
            : "Edit the public website visually — every change is reflected in the live preview instantly."
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
              {isRtl ? "فتح في تبويب جديد" : "Open in new tab"}
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
        title={isRtl ? "الصفحة" : "Page"}
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
      </SuperPanel>

      {/* MAIN WORKSPACE — sections list (left) + live preview (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,520px)_1fr] gap-4">
        {/* ─── LEFT: sections list + inspector ─── */}
        <div className="space-y-4 min-w-0">
          <SuperPanel
            title={isRtl ? "الأقسام" : "Sections"}
            subtitle={
              isRtl
                ? `${enabledCount} ظاهر من ${orderedSections.length}`
                : `${enabledCount} of ${orderedSections.length} visible`
            }
            icon={<LayoutGrid className="w-4 h-4" />}
          >
            <ol className="space-y-2">
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
                ? "تُطبَّق على الموقع كله. للمطوّرين فقط."
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
                rows={8}
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
        </div>

        {/* ─── RIGHT: live preview iframe ─── */}
        <SuperPanel
          title={isRtl ? "معاينة مباشرة" : "Live preview"}
          subtitle={
            isRtl
              ? "كل تعديل يحدّث المعاينة فورًا (نفس متصفحك)."
              : "Every change updates the preview instantly (same browser session)."
          }
          icon={<Eye className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-1">
              <DeviceBtn
                active={device === "desktop"}
                onClick={() => setDevice("desktop")}
                icon={<Monitor className="w-3.5 h-3.5" />}
                label="Desktop"
              />
              <DeviceBtn
                active={device === "tablet"}
                onClick={() => setDevice("tablet")}
                icon={<Tablet className="w-3.5 h-3.5" />}
                label="Tablet"
              />
              <DeviceBtn
                active={device === "mobile"}
                onClick={() => setDevice("mobile")}
                icon={<Smartphone className="w-3.5 h-3.5" />}
                label="Mobile"
              />
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="ms-1 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800/60"
                title={isRtl ? "إعادة تحميل" : "Reload preview"}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          }
        >
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 sm:p-4 flex justify-center overflow-auto">
            <div
              className="bg-white rounded-md shadow-2xl shadow-black/40 overflow-hidden transition-all duration-300"
              style={{
                width: previewWidths[device],
                maxWidth: "100%",
                height: "75vh",
                minHeight: "560px",
              }}
            >
              <iframe
                ref={iframeRef}
                key={previewKey}
                src="/?_pe=1"
                title="Live preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
            {isRtl
              ? "المعاينة هنا تستخدم نفس إعداداتك المحلية. شاشة اللودينج (السبلاش) لا تظهر داخل المعاينة."
              : "The preview pane shares your local config. The intro splash is hidden inside the preview."}
          </p>
        </SuperPanel>
      </div>
    </SuperAdminLayout>
  );
}

/* ──────────────────────────────────────────────
   Helpers — pills, buttons
   ────────────────────────────────────────────── */

function PagePill({
  label, active, comingSoon, sectionsTotal, sectionsEnabled,
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

function DeviceBtn({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={[
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border transition-colors",
        active
          ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
          : "border-slate-700 text-slate-300 hover:bg-slate-800/60",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

/* ──────────────────────────────────────────────
   Section row
   ────────────────────────────────────────────── */

type InspectorTab = "content" | "style" | "layout";

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
  const [tab, setTab] = useState<InspectorTab>("content");
  const overridesActive = Object.keys(override).filter((k) => k !== "enabled" && (override as Record<string, unknown>)[k] != null && (override as Record<string, unknown>)[k] !== "").length;

  /** Currently-rendered headline (override → default) — shown in the row. */
  const liveTitle =
    (isRtl ? override.titleAr : override.titleEn) ||
    (isRtl ? section.defaults.titleAr : section.defaults.titleEn) ||
    (isRtl ? section.labelAr : section.labelEn);
  const liveEyebrow =
    (isRtl ? override.eyebrowAr : override.eyebrowEn) ||
    (isRtl ? section.defaults.eyebrowAr : section.defaults.eyebrowEn);

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

        <button
          type="button"
          onClick={onExpand}
          className="min-w-0 flex-1 text-start"
        >
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm text-slate-100 truncate">
              {isRtl ? section.labelAr : section.labelEn}
            </h3>
            {overridesActive > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                {overridesActive} {isRtl ? "تخصيص" : "edits"}
              </span>
            )}
            {!enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 shrink-0">
                {isRtl ? "مخفي" : "hidden"}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 min-w-0">
            {liveEyebrow && (
              <span className="text-[10px] font-medium text-amber-300/80 uppercase tracking-wider truncate">
                {liveEyebrow}
              </span>
            )}
            <p className="text-[12px] text-slate-300 truncate">
              {liveTitle}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
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
          <button
            type="button"
            onClick={onToggle}
            className={[
              "inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors",
              enabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700/60",
            ].join(" ")}
            title={enabled ? (isRtl ? "إخفاء" : "Hide") : (isRtl ? "إظهار" : "Show")}
          >
            {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <IconBtn
            ariaLabel={isRtl ? "تخصيص" : "Customize"}
            onClick={onExpand}
            icon={
              expanded ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )
            }
            highlight={expanded}
          />
        </div>
      </div>

      {/* Expanded inspector */}
      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950/40">
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-slate-800 px-2 pt-2">
            <InspectorTabBtn
              active={tab === "content"}
              onClick={() => setTab("content")}
              icon={<FileText className="w-3.5 h-3.5" />}
              label={isRtl ? "المحتوى" : "Content"}
              disabled={!section.hasTextOverrides && !section.hasCtaOverrides}
            />
            <InspectorTabBtn
              active={tab === "style"}
              onClick={() => setTab("style")}
              icon={<Palette className="w-3.5 h-3.5" />}
              label={isRtl ? "الألوان" : "Style"}
            />
            <InspectorTabBtn
              active={tab === "layout"}
              onClick={() => setTab("layout")}
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              label={isRtl ? "التخطيط" : "Layout"}
            />
            {overridesActive > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="ms-auto mb-1 inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2 py-1 rounded-md border border-rose-700/40 text-rose-300 hover:bg-rose-900/20"
              >
                <RotateCcw className="w-3 h-3" />
                {isRtl ? "إعادة هذا القسم" : "Reset section"}
              </button>
            )}
          </div>

          <div className="p-4">
            {tab === "content" && (
              <ContentTab section={section} override={override} onPatch={onPatch} isRtl={isRtl} />
            )}
            {tab === "style" && (
              <StyleTab section={section} override={override} onPatch={onPatch} isRtl={isRtl} />
            )}
            {tab === "layout" && (
              <LayoutTab override={override} onPatch={onPatch} isRtl={isRtl} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InspectorTabBtn({
  active, onClick, icon, label, disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 -mb-px border-b-2 transition-colors",
        disabled
          ? "border-transparent text-slate-700 cursor-not-allowed"
          : active
            ? "border-amber-400 text-amber-200"
            : "border-transparent text-slate-400 hover:text-slate-200",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

/* ──────────────────────────────────────────────
   Tab: Content
   ────────────────────────────────────────────── */

function ContentTab({
  section, override, onPatch, isRtl,
}: {
  section: SectionDescriptor;
  override: SectionOverride;
  onPatch: (patch: Partial<SectionOverride>) => void;
  isRtl: boolean;
}) {
  if (!section.hasTextOverrides && !section.hasCtaOverrides) {
    return (
      <p className="text-xs text-slate-500 italic">
        {isRtl
          ? "هذا القسم يستخدم بيانات تلقائية من الموقع (مثل عداد القضايا والعملاء) ولا يحتوي على نصوص قابلة للتعديل."
          : "This section auto-pulls live data (like case counters & client stats) and has no editable text."}
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {section.hasTextOverrides && (
        <>
          <PairField
            labelAr="النص التمهيدي (ع)" labelEn="Eyebrow (AR)"
            placeholder={section.defaults.eyebrowAr}
            value={override.eyebrowAr ?? ""}
            onChange={(v) => onPatch({ eyebrowAr: v || undefined })}
            dir="rtl"
            isRtl={isRtl}
          />
          <PairField
            labelAr="النص التمهيدي (إنج)" labelEn="Eyebrow (EN)"
            placeholder={section.defaults.eyebrowEn}
            value={override.eyebrowEn ?? ""}
            onChange={(v) => onPatch({ eyebrowEn: v || undefined })}
            isRtl={isRtl}
          />
          <PairField
            labelAr="العنوان (ع)" labelEn="Title (AR)"
            placeholder={section.defaults.titleAr}
            value={override.titleAr ?? ""}
            onChange={(v) => onPatch({ titleAr: v || undefined })}
            dir="rtl"
            isRtl={isRtl}
          />
          <PairField
            labelAr="العنوان (إنج)" labelEn="Title (EN)"
            placeholder={section.defaults.titleEn}
            value={override.titleEn ?? ""}
            onChange={(v) => onPatch({ titleEn: v || undefined })}
            isRtl={isRtl}
          />
          <PairField
            multiline
            labelAr="الوصف (ع)" labelEn="Subtitle (AR)"
            placeholder={section.defaults.subtitleAr}
            value={override.subtitleAr ?? ""}
            onChange={(v) => onPatch({ subtitleAr: v || undefined })}
            dir="rtl"
            isRtl={isRtl}
          />
          <PairField
            multiline
            labelAr="الوصف (إنج)" labelEn="Subtitle (EN)"
            placeholder={section.defaults.subtitleEn}
            value={override.subtitleEn ?? ""}
            onChange={(v) => onPatch({ subtitleEn: v || undefined })}
            isRtl={isRtl}
          />
        </>
      )}

      {section.hasCtaOverrides && (
        <div className="pt-3 border-t border-slate-800">
          <FieldHeading
            icon={<MousePointerClick className="w-3.5 h-3.5" />}
            text={isRtl ? "الزر الأول" : "Primary button"}
          />
          <CtaThree
            isRtl={isRtl}
            labelEnPlaceholder={section.defaults.ctaLabelEn}
            labelArPlaceholder={section.defaults.ctaLabelAr}
            hrefPlaceholder={section.defaults.ctaHref}
            labelEn={override.ctaLabelEn ?? ""}
            labelAr={override.ctaLabelAr ?? ""}
            href={override.ctaHref ?? ""}
            onLabelEn={(v) => onPatch({ ctaLabelEn: v || undefined })}
            onLabelAr={(v) => onPatch({ ctaLabelAr: v || undefined })}
            onHref={(v) => onPatch({ ctaHref: v || undefined })}
          />

          {section.hasSecondCta && (
            <>
              <div className="mt-5">
                <FieldHeading
                  icon={<MousePointerClick className="w-3.5 h-3.5" />}
                  text={isRtl ? "الزر الثاني" : "Secondary button"}
                />
                <CtaThree
                  isRtl={isRtl}
                  labelEnPlaceholder={section.defaults.cta2LabelEn}
                  labelArPlaceholder={section.defaults.cta2LabelAr}
                  hrefPlaceholder={section.defaults.cta2Href}
                  labelEn={override.cta2LabelEn ?? ""}
                  labelAr={override.cta2LabelAr ?? ""}
                  href={override.cta2Href ?? ""}
                  onLabelEn={(v) => onPatch({ cta2LabelEn: v || undefined })}
                  onLabelAr={(v) => onPatch({ cta2LabelAr: v || undefined })}
                  onHref={(v) => onPatch({ cta2Href: v || undefined })}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CtaThree({
  isRtl, labelEn, labelAr, href, labelEnPlaceholder, labelArPlaceholder, hrefPlaceholder,
  onLabelEn, onLabelAr, onHref,
}: {
  isRtl: boolean;
  labelEn: string;
  labelAr: string;
  href: string;
  labelEnPlaceholder?: string;
  labelArPlaceholder?: string;
  hrefPlaceholder?: string;
  onLabelEn: (v: string) => void;
  onLabelAr: (v: string) => void;
  onHref: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Input
        value={labelAr}
        onChange={(e) => onLabelAr(e.target.value)}
        placeholder={labelArPlaceholder ?? (isRtl ? "النص (ع)" : "Label (AR)")}
        dir="rtl"
        className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
      />
      <Input
        value={labelEn}
        onChange={(e) => onLabelEn(e.target.value)}
        placeholder={labelEnPlaceholder ?? "Label (EN)"}
        className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
      />
      <Input
        value={href}
        onChange={(e) => onHref(e.target.value)}
        placeholder={hrefPlaceholder ?? (isRtl ? "/الرابط" : "/link")}
        dir="ltr"
        className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm font-mono"
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Tab: Style (colors)
   ────────────────────────────────────────────── */

function StyleTab({
  section, override, onPatch, isRtl,
}: {
  section: SectionDescriptor;
  override: SectionOverride;
  onPatch: (patch: Partial<SectionOverride>) => void;
  isRtl: boolean;
}) {
  const toneHint = section.tone === "dark"
    ? (isRtl ? "خلفية داكنة افتراضيًا — استخدم نصوصًا فاتحة." : "Dark background by default — use light text.")
    : (isRtl ? "خلفية فاتحة افتراضيًا — استخدم نصوصًا داكنة." : "Light background by default — use dark text.");

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-slate-900/40 border border-slate-800 px-3 py-2 text-[11px] text-slate-400">
        {toneHint}
      </div>

      <FieldHeading
        icon={<Palette className="w-3.5 h-3.5" />}
        text={isRtl ? "ألوان الخلفية والنص" : "Background & text"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ColorField
          label={isRtl ? "الخلفية" : "Background"}
          value={override.bgColor}
          onChange={(v) => onPatch({ bgColor: v || undefined })}
        />
        <ColorField
          label={isRtl ? "نص أساسي" : "Body text"}
          value={override.textColor}
          onChange={(v) => onPatch({ textColor: v || undefined })}
        />
        <ColorField
          label={isRtl ? "نص تمهيدي" : "Eyebrow"}
          value={override.eyebrowColor}
          onChange={(v) => onPatch({ eyebrowColor: v || undefined })}
        />
      </div>

      {section.hasCtaOverrides && (
        <>
          <FieldHeading
            icon={<MousePointerClick className="w-3.5 h-3.5" />}
            text={isRtl ? "ألوان الزر الأول" : "Primary button colors"}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorField
              label={isRtl ? "خلفية الزر" : "Button background"}
              value={override.ctaBgColor}
              onChange={(v) => onPatch({ ctaBgColor: v || undefined })}
            />
            <ColorField
              label={isRtl ? "نص الزر" : "Button text"}
              value={override.ctaTextColor}
              onChange={(v) => onPatch({ ctaTextColor: v || undefined })}
            />
          </div>

          {section.hasSecondCta && (
            <>
              <FieldHeading
                icon={<MousePointerClick className="w-3.5 h-3.5" />}
                text={isRtl ? "ألوان الزر الثاني" : "Secondary button colors"}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColorField
                  label={isRtl ? "خلفية الزر" : "Button background"}
                  value={override.cta2BgColor}
                  onChange={(v) => onPatch({ cta2BgColor: v || undefined })}
                />
                <ColorField
                  label={isRtl ? "نص الزر" : "Button text"}
                  value={override.cta2TextColor}
                  onChange={(v) => onPatch({ cta2TextColor: v || undefined })}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Tab: Layout
   ────────────────────────────────────────────── */

function LayoutTab({
  override, onPatch, isRtl,
}: {
  override: SectionOverride;
  onPatch: (patch: Partial<SectionOverride>) => void;
  isRtl: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Text alignment */}
      <div>
        <FieldHeading text={isRtl ? "محاذاة النص" : "Text alignment"} icon={<Type className="w-3.5 h-3.5" />} />
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1">
          <SegBtn
            active={!override.textAlign}
            onClick={() => onPatch({ textAlign: undefined })}
            label={isRtl ? "افتراضي" : "Default"}
          />
          <SegBtn
            active={override.textAlign === "start"}
            onClick={() => onPatch({ textAlign: "start" })}
            icon={<AlignLeft className="w-3.5 h-3.5" />}
            label="Start"
          />
          <SegBtn
            active={override.textAlign === "center"}
            onClick={() => onPatch({ textAlign: "center" })}
            icon={<AlignCenter className="w-3.5 h-3.5" />}
            label="Center"
          />
          <SegBtn
            active={override.textAlign === "end"}
            onClick={() => onPatch({ textAlign: "end" })}
            icon={<AlignRight className="w-3.5 h-3.5" />}
            label="End"
          />
        </div>
      </div>

      {/* Container width */}
      <div>
        <FieldHeading text={isRtl ? "عرض المحتوى" : "Container width"} icon={<LayoutGrid className="w-3.5 h-3.5" />} />
        <select
          value={override.containerWidth ?? ""}
          onChange={(e) => onPatch({ containerWidth: (e.target.value || undefined) as ContainerWidth | undefined })}
          className="w-full bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        >
          <option value="">{isRtl ? "افتراضي" : "Default"}</option>
          {CONTAINER_WIDTHS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Vertical padding */}
      <div>
        <FieldHeading text={isRtl ? "التباعد العمودي" : "Vertical padding"} icon={<LayoutGrid className="w-3.5 h-3.5" />} />
        <select
          value={override.paddingY ?? ""}
          onChange={(e) => onPatch({ paddingY: (e.target.value || undefined) as PaddingPreset | undefined })}
          className="w-full bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        >
          <option value="">{isRtl ? "افتراضي" : "Default"}</option>
          {PADDING_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Extra classes */}
      <div>
        <FieldHeading text={isRtl ? "فئات Tailwind إضافية" : "Extra Tailwind classes"} icon={<Code2 className="w-3.5 h-3.5" />} />
        <Input
          value={override.extraClassName ?? ""}
          onChange={(e) => onPatch({ extraClassName: e.target.value || undefined })}
          placeholder={isRtl ? "مثال: shadow-2xl bg-emerald-500/5" : "e.g. shadow-2xl bg-emerald-500/5"}
          className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono text-xs"
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Tiny field helpers
   ────────────────────────────────────────────── */

function FieldHeading({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
      {icon}
      {text}
    </p>
  );
}

function PairField({
  labelEn, labelAr, value, placeholder, onChange, dir, multiline, isRtl,
}: {
  labelEn: string;
  labelAr: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  dir?: "rtl" | "ltr";
  multiline?: boolean;
  isRtl: boolean;
}) {
  const Component = multiline ? Textarea : Input;
  return (
    <div>
      <label className="block text-[10.5px] text-slate-400 mb-1">
        {isRtl ? labelAr : labelEn}
      </label>
      <Component
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        rows={multiline ? 2 : undefined}
        className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
      />
    </div>
  );
}

function ColorField({
  label, value, onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);
  const isValidHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(draft);
  const swatchValue = isValidHex ? draft : (value ?? "#ffffff");

  function commit(v: string) {
    if (v === "" || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      onChange(v);
    }
  }

  return (
    <div>
      <label className="block text-[10.5px] text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5">
        <label className="relative w-7 h-7 rounded shrink-0 cursor-pointer overflow-hidden border border-slate-700">
          <input
            type="color"
            value={swatchValue}
            onChange={(e) => {
              setDraft(e.target.value);
              commit(e.target.value);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <span className="absolute inset-0" style={{ background: value || "transparent" }} />
          {!value && (
            <span className="absolute inset-0 grid place-items-center text-slate-600 text-[9px]">∅</span>
          )}
        </label>
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (v === "") onChange("");
          }}
          onBlur={(e) => commit(e.target.value)}
          placeholder="#000000"
          className="flex-1 bg-transparent text-xs text-slate-100 font-mono focus:outline-none placeholder:text-slate-600 min-w-0"
        />
        {value && (
          <button
            type="button"
            onClick={() => { setDraft(""); onChange(""); }}
            className="text-slate-500 hover:text-slate-300 shrink-0"
            title="Clear"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function SegBtn({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={[
        "inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors",
        active ? "bg-amber-500/15 text-amber-200" : "text-slate-300 hover:bg-slate-800/60",
      ].join(" ")}
    >
      {icon}
      {!icon && label}
    </button>
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

/* Suppress unused-import warnings — these icons are reserved for upcoming
   features (Check = "saved" pulse, Wand2 already used in the page). */
void Check;
