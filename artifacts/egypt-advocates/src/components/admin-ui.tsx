/**
 * Shared admin UI primitives.
 * Import these in every admin page for consistent look & feel.
 */

import { type ReactNode, type ElementType } from "react";
import { useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   PageHeader
   Renders the consistent top bar for every admin page.
   ───────────────────────────────────────────────────────────── */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  dir?: "ltr" | "rtl";
}

export function PageHeader({ title, subtitle, action, icon, dir = "ltr" }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6" dir={dir}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SkeletonRows
   Placeholder rows while data is loading.
   ───────────────────────────────────────────────────────────── */
interface SkeletonRowsProps {
  cols?: number;
  rows?: number;
}
export function SkeletonRows({ cols = 5, rows = 5 }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 rounded-md" style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   EmptyState
   Centered empty-state with optional icon + message.
   ───────────────────────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  cols?: number;
}
export function EmptyState({ icon, message, cols = 5 }: EmptyStateProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={cols} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          {icon && <div className="opacity-20 scale-150">{icon}</div>}
          <p className="text-sm">{message}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ─────────────────────────────────────────────────────────────
   StatusBadge
   Consistent colored badge for any status value.
   ───────────────────────────────────────────────────────────── */
type StatusVariant =
  | "active" | "inactive" | "archived"
  | "open" | "closed"
  | "pending" | "approved" | "rejected" | "completed" | "cancelled"
  | "paid" | "unpaid" | "overdue"
  | "new" | "handled"
  | "published" | "draft"
  | "lead" | "prospect"
  | "confirmed" | "failed" | "refunded"
  | string;

const VARIANT_MAP: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  approved:  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  paid:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  handled:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",

  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  new:       "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  open:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  lead:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sent:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",

  rejected:  "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  failed:    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  overdue:   "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",

  inactive:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  draft:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  closed:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  archived:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  refunded:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function StatusBadge({ status, label }: { status: StatusVariant; label?: string }) {
  const cls = VARIANT_MAP[status] ?? "bg-gray-100 text-gray-600";
  return (
    <Badge className={`${cls} border-none font-medium text-xs px-2.5 py-0.5 rounded-full`}>
      {label ?? status}
    </Badge>
  );
}

/* ─────────────────────────────────────────────────────────────
   AddButton  — consistent primary "add" action button
   ───────────────────────────────────────────────────────────── */
export function AddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="gap-2 h-9 px-4 text-sm font-medium shadow-sm"
    >
      <Plus className="w-4 h-4" />
      {label}
    </Button>
  );
}

/* ─────────────────────────────────────────────────────────────
   SectionCard  — table / content wrapper card
   ───────────────────────────────────────────────────────────── */
export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FilterBar  — horizontal bar for search + filters
   ───────────────────────────────────────────────────────────── */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 border-b border-border/50 bg-muted/20">
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORM PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   FormSection  — titled group of fields with a top label line
   ───────────────────────────────────────────────────────────── */
interface FormSectionProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function FormSection({ title, icon, children, className = "" }: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary/60">{icon}</span>}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
          <div className="flex-1 h-px bg-border/60 ms-1" />
        </div>
      )}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FieldGrid  — responsive grid wrapper for form fields
   ───────────────────────────────────────────────────────────── */
export function FieldGrid({ cols = 2, children }: { cols?: 1 | 2 | 3; children: ReactNode }) {
  const gridClass = cols === 1 ? "grid-cols-1" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2";
  return <div className={`grid ${gridClass} gap-4`}>{children}</div>;
}

/* ─────────────────────────────────────────────────────────────
   FormFooter  — sticky bottom action bar for dialogs
   ───────────────────────────────────────────────────────────── */
export function FormFooter({ children, dir }: { children: ReactNode; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-3" dir={dir}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ToggleField  — styled toggle (switch) form field
   ───────────────────────────────────────────────────────────── */
interface ToggleFieldProps {
  name: string;
  label: string;
  description?: string;
}
export function ToggleField({ name, label, description }: ToggleFieldProps) {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <div className="space-y-0.5 flex-1">
            <FormLabel className="text-sm font-medium cursor-pointer">{label}</FormLabel>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   BilingualRow  — side-by-side AR/EN input pair
   Pass the two fields as children or use the render prop:
     <BilingualRow labelEn="Name (EN)" labelAr="الاسم (ع)">
       <FormField name="nameEn" .../>
       <FormField name="nameAr" .../>
     </BilingualRow>
   ───────────────────────────────────────────────────────────── */
export function BilingualRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

/* ─────────────────────────────────────────────────────────────
   AdminDialog  — complete dialog: sticky header + scroll body + footer
   DialogContent must use p-0 gap-0.

   Usage:
     <DialogContent className="max-w-2xl p-0 gap-0" dir={dir}>
       <AdminDialog title="…" icon={…} dir={dir}
         footer={<><Button …/><Button …/></>}
       >
         <FormSection …>…</FormSection>
       </AdminDialog>
     </DialogContent>
   ───────────────────────────────────────────────────────────── */
interface AdminDialogProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  footerDir?: "ltr" | "rtl";
  children: ReactNode;
  dir?: "ltr" | "rtl";
}
export function AdminDialog({
  title, subtitle, icon, footer, footerDir, children, dir = "ltr",
}: AdminDialogProps) {
  return (
    <div dir={dir} className="flex flex-col" style={{ maxHeight: "min(90vh, 760px)" }}>
      {/* Accent line */}
      <div className="h-[2px] shrink-0 bg-linear-to-r from-transparent via-primary/60 to-transparent" />

      {/* Header — always visible */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-[14px] border-b border-border/50 bg-muted/10">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold font-serif leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        <div className="px-6 pt-5 pb-3 space-y-5">{children}</div>
      </div>

      {/* Footer — always visible */}
      {footer && (
        <div
          className="shrink-0 flex items-center justify-end gap-3 px-6 py-3 border-t border-border/60 bg-card"
          dir={footerDir ?? dir}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * Legacy alias — body only, no built-in footer.
 * Use AdminDialog for new pages.
 */
export function DialogShell({ title, subtitle, icon, children, dir = "ltr" }: Omit<AdminDialogProps, "footer" | "footerDir">) {
  return <AdminDialog title={title} subtitle={subtitle} icon={icon} dir={dir}>{children}</AdminDialog>;
}

/* ─────────────────────────────────────────────────────────────
   NameCell  — dual-language name display (primary + secondary)
   Guarantees the two lines never merge into one blob.
   ───────────────────────────────────────────────────────────── */
interface NameCellProps {
  primary: string;
  secondary?: string;
  caption?: string;
  maxWidth?: string;
}
export function NameCell({ primary, secondary, caption, maxWidth = "max-w-[220px]" }: NameCellProps) {
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${maxWidth}`}>
      <span className="font-medium text-sm leading-snug line-clamp-2 wrap-break-word">{primary}</span>
      {secondary && (
        <span className="text-[11px] text-muted-foreground leading-snug line-clamp-1 wrap-break-word opacity-70">
          {secondary}
        </span>
      )}
      {caption && (
        <span className="text-[10px] text-muted-foreground/50 leading-snug truncate">{caption}</span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TwoLineCell  — generic two-line cell (e.g. email + phone)
   ───────────────────────────────────────────────────────────── */
export function TwoLineCell({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-sm leading-snug truncate">{primary}</span>
      {secondary && <span className="text-xs text-muted-foreground leading-snug truncate">{secondary}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TableActions  — RTL-aware action cell wrapper
   ───────────────────────────────────────────────────────────── */
export function TableActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ActionsHead  — RTL-aware actions table header
   ───────────────────────────────────────────────────────────── */
export function ActionsHead({ label = "" }: { label?: string }) {
  return <th className="h-10 px-4 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">{label}</th>;
}
