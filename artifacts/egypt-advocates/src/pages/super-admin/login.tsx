/**
 * Super Admin login — the dedicated entry point to the platform-level
 * Control Plane.
 *
 * This page is intentionally separate from the per-firm office admin
 * login (`/admin/login`). It uses the same secure backend session so we
 * don't fork the auth model, but the experience is unmistakably "platform
 * owner": dark slate chrome, gold crown branding, and an explicit
 * super-admin role check that rejects any non-elevated account immediately
 * after login.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminLogin, useAdminMe, useAdminLogout,
  getAdminMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Crown, Eye, EyeOff, Languages, Shield, ShieldAlert,
  Building2, Sparkles, ArrowLeft, Lock,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { isSuperAdmin } from "@/lib/permissions";

export default function SuperAdminLogin() {
  const [, navigate] = useLocation();
  const { lang, setLang, isRtl } = useAdminI18n();
  const qc = useQueryClient();

  const login  = useAdminLogin();
  const logout = useAdminLogout();
  const { data: user, refetch } = useAdminMe({
    query: { retry: false, queryKey: [] as const } as any,
  });

  const [showPassword, setShowPassword] = useState(false);
  /* If the user signed in but isn't a super admin we surface a strong
     in-page warning rather than redirecting back to the office admin —
     the platform owner needs to *know* their session is the wrong role. */
  const [wrongRole, setWrongRole] = useState(false);

  /* Already-logged-in super admin? Forward straight to the dashboard. */
  useEffect(() => {
    if (user && isSuperAdmin((user as { role?: string }).role)) {
      navigate("/super-admin");
    }
  }, [user, navigate]);

  const schema = z.object({
    email:    z.string().email(isRtl ? "بريد إلكتروني غير صالح" : "Invalid email"),
    password: z.string().min(1,  isRtl ? "كلمة المرور مطلوبة" : "Password is required"),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setWrongRole(false);
    try {
      const result = await login.mutateAsync({ data: values });
      const role = (result as { role?: string } | undefined)?.role
        ?? (await refetch()).data?.role;

      if (!isSuperAdmin(role)) {
        /* Logged in fine, but they're not a super admin. Burn the session
           so they can't use it for control-plane work. */
        try { await logout.mutateAsync(); } catch { /* best-effort */ }
        await qc.invalidateQueries({ queryKey: getAdminMeQueryKey() });
        setWrongRole(true);
        toast.error(
          isRtl ? "هذا الحساب ليس مالك المنصّة" : "This account is not a platform owner",
          {
            description: isRtl
              ? "لوحة التحكم العليا متاحة فقط للحسابات ذات صلاحية Super Admin."
              : "The Control Plane is reserved for Super Admin accounts.",
          },
        );
        return;
      }

      toast.success(
        isRtl ? "أهلاً بك في لوحة التحكم العليا" : "Welcome to the Control Plane",
      );
      navigate("/super-admin");
    } catch {
      toast.error(
        isRtl ? "فشل تسجيل الدخول" : "Login failed",
        {
          description: isRtl
            ? "تأكد من البريد الإلكتروني وكلمة المرور."
            : "Double-check your email and password.",
        },
      );
    }
  }

  const isRtlForm = isRtl;

  return (
    <div
      dir="ltr"
      className="min-h-dvh flex bg-slate-950 text-slate-100 overflow-hidden relative"
    >
      {/* ── Decorative left panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center overflow-hidden">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-black" />

        {/* Amber + indigo orbs */}
        <div className="absolute top-[-20%] left-[-15%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(251,191,36,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.4) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
          }}
        />

        {/* Inset frame */}
        <div className="absolute inset-12 rounded-3xl border border-amber-500/10" />

        {/* Content */}
        <div className="relative z-10 text-center px-12 max-w-xl">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-linear-to-br from-amber-500 via-amber-400 to-orange-500 mb-8 shadow-[0_0_60px_rgba(251,191,36,0.35)]">
            <Crown className="w-11 h-11 text-slate-900" strokeWidth={2.5} />
          </div>

          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-amber-300/90 font-bold">
              Super Admin
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>

          <h1 className="text-4xl xl:text-5xl font-serif font-bold text-white mb-4 leading-tight tracking-tight">
            Legal Hub
            <span className="block text-amber-300/90 text-2xl xl:text-3xl mt-2 font-light">
              Control Plane
            </span>
          </h1>
          <p className="text-base text-white/50 leading-relaxed mb-10 max-w-md mx-auto">
            {isRtlForm
              ? "بوابة مالك المنصّة — أدِر كل مكاتب المحاماة، فعّل الموديولات، وأنشئ نسخاً مخصّصة بضغطة زر."
              : "Platform owner gateway — orchestrate every law-firm tenant, toggle modules, and ship full white-label deployments in one click."}
          </p>

          {/* Capability pills */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {(isRtlForm
              ? [
                  { icon: Building2, label: "إدارة المكاتب" },
                  { icon: Sparkles,  label: "وايت ليبل" },
                  { icon: Shield,    label: "تحكم بالموديولات" },
                  { icon: Crown,     label: "صلاحيات كاملة" },
                ]
              : [
                  { icon: Building2, label: "Tenant ops" },
                  { icon: Sparkles,  label: "White-label" },
                  { icon: Shield,    label: "Module gating" },
                  { icon: Crown,     label: "Full authority" },
                ]
            ).map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-200 bg-amber-500/8 border border-amber-500/20 rounded-full px-3 py-1.5 backdrop-blur-sm"
              >
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom signature */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2 text-amber-300/30 text-[11px] font-mono uppercase tracking-widest">
          <Lock className="w-3 h-3" />
          <span>Privileged Access · Legal Hub © 2026</span>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-500/30 to-transparent" />

        {/* Top-right controls */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-amber-200 border border-white/10 hover:border-amber-500/30 rounded-full px-3 py-1.5 transition-all duration-200"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "ar" ? "English" : "العربية"}
          </button>
          <a
            href="/admin/login"
            className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/80 border border-white/10 hover:border-white/25 rounded-full px-3 py-1.5 transition-all duration-200"
            title="Office admin login"
          >
            <ArrowLeft className={`h-3.5 w-3.5 ${isRtlForm ? "rotate-180" : ""}`} />
            {isRtlForm ? "إدارة المكتب" : "Office login"}
          </a>
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile crown logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-white text-base">Legal Hub</p>
              <p className="text-[10px] text-amber-300/90 uppercase tracking-widest font-semibold">
                Control Plane
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7" dir={isRtlForm ? "rtl" : "ltr"}>
            <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Crown className="w-3 h-3 text-amber-300" />
              <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                {isRtlForm ? "وصول مالك المنصة" : "Platform owner access"}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-white mb-1.5">
              {isRtlForm ? "تسجيل دخول السوبر أدمن" : "Sign in to control plane"}
            </h2>
            <p className="text-sm text-white/40">
              {isRtlForm
                ? "هذه البوابة لمالك المنصّة فقط. بيانات اعتماد مكتبك لن تعمل هنا."
                : "Reserved for the platform owner. Your tenant office credentials won't work here."}
            </p>
          </div>

          {/* Wrong-role notice (after a non-super-admin attempt) */}
          {wrongRole && (
            <div
              role="alert"
              dir={isRtlForm ? "rtl" : "ltr"}
              className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
              <div className="text-[12px] text-rose-100 leading-relaxed">
                <p className="font-semibold mb-0.5">
                  {isRtlForm ? "حساب غير مؤهَّل" : "Account not eligible"}
                </p>
                <p className="text-rose-200/80">
                  {isRtlForm
                    ? "هذا الحساب ليس صاحب صلاحية Super Admin. تم تسجيل خروجك تلقائياً."
                    : "This account doesn't have Super Admin role. You've been signed out for safety."}
                </p>
                <a
                  href="/admin/login"
                  className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-amber-200 hover:text-amber-100"
                >
                  <ArrowLeft className={`w-3 h-3 ${isRtlForm ? "rotate-180" : ""}`} />
                  {isRtlForm ? "اذهب إلى تسجيل دخول المكتب" : "Go to office admin login"}
                </a>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            dir={isRtlForm ? "rtl" : "ltr"}
            noValidate
          >
            <div>
              <label className="block text-white/60 text-[10.5px] font-bold uppercase tracking-widest mb-2">
                {isRtlForm ? "البريد الإلكتروني" : "Email"}
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="owner@legalhub.app"
                {...form.register("email")}
                className="
                  w-full h-12 px-4
                  bg-white/3 border border-white/10 rounded-xl
                  text-white placeholder:text-white/20 text-sm
                  focus:outline-none focus:border-amber-500/50 focus:bg-white/5
                  transition-all duration-200
                "
              />
              {form.formState.errors.email && (
                <p className="text-rose-400 text-[11px] mt-1.5">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-white/60 text-[10.5px] font-bold uppercase tracking-widest mb-2">
                {isRtlForm ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...form.register("password")}
                  className="
                    w-full h-12 px-4 pe-12
                    bg-white/3 border border-white/10 rounded-xl
                    text-white placeholder:text-white/20 text-sm
                    focus:outline-none focus:border-amber-500/50 focus:bg-white/5
                    transition-all duration-200
                  "
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-amber-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-rose-400 text-[11px] mt-1.5">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="
                w-full h-12 mt-2 rounded-xl font-bold text-sm tracking-wide
                bg-linear-to-br from-amber-500 via-amber-400 to-orange-500
                hover:from-amber-400 hover:to-orange-400
                text-slate-900
                shadow-[0_4px_28px_rgba(251,191,36,0.35)]
                hover:shadow-[0_4px_36px_rgba(251,191,36,0.5)]
                transition-all duration-300
                disabled:opacity-60 disabled:cursor-wait
                flex items-center justify-center gap-2
              "
            >
              {login.isPending ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  {isRtlForm ? "جارٍ التحقق…" : "Verifying…"}
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" strokeWidth={2.5} />
                  {isRtlForm ? "ادخل لوحة التحكم" : "Enter control plane"}
                </>
              )}
            </button>
          </form>

          {/* Footer signature */}
          <div className="mt-8 text-center space-y-1.5">
            <p className="text-[10.5px] text-white/30 font-mono uppercase tracking-widest">
              Legal Hub Platform · Privileged Surface
            </p>
            <p className="text-[10px] text-white/20">
              {isRtlForm
                ? "كل عمليات الدخول تُسجَّل في سجلّ نشاط المنصة."
                : "All sign-ins are recorded in the platform activity log."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
