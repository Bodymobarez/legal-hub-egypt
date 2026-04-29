import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminI18n } from "@/lib/admin-i18n";
import { Languages, Eye, EyeOff, Shield, Scale } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { ta, lang, setLang } = useAdminI18n();
  const login = useAdminLogin();
  const [showPassword, setShowPassword] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(ta("login.emailError")),
    password: z.string().min(1, ta("login.passwordError")),
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      await login.mutateAsync({ data: values });
      toast.success(ta("login.successTitle"), { description: ta("login.successDesc") });
      setLocation("/admin");
    } catch {
      toast.error(ta("login.errorTitle"), { description: ta("login.errorDesc") });
    }
  };

  const isRtlForm = lang === "ar";

  return (
    <div className="min-h-screen flex bg-[hsl(220,40%,6%)] overflow-hidden relative" dir="ltr">

      {/* ── Left decorative panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center overflow-hidden">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-linear-to-br from-[hsl(220,50%,10%)] via-[hsl(220,40%,8%)] to-[hsl(220,30%,5%)]" />

        {/* Gold accent orbs */}
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(40,80%,50%)]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[hsl(220,70%,50%)]/10 blur-[100px]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(hsl(40,80%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(40,80%,60%) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[hsl(40,80%,50%)]/15 border border-[hsl(40,80%,50%)]/30 mb-8 shadow-[0_0_40px_hsl(40,80%,50%,0.15)]">
            <Scale className="w-9 h-9 text-[hsl(40,80%,60%)]" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-white mb-4 leading-tight">
            Egypt Advocates
          </h1>
          <p className="text-lg text-white/50 leading-relaxed mb-10">
            {isRtlForm
              ? "منصة إدارة المكتب القانوني — قضاياك، عملاؤك، وإيراداتك في مكان واحد"
              : "Legal practice management — cases, clients & revenue in one place"}
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {(isRtlForm
              ? ["إدارة العملاء", "تتبع القضايا", "الجدولة", "الفواتير"]
              : ["Client Management", "Case Tracking", "Scheduling", "Invoicing"]
            ).map((item) => (
              <span
                key={item}
                className="text-xs font-medium text-[hsl(40,80%,65%)] bg-[hsl(40,80%,50%)]/10 border border-[hsl(40,80%,50%)]/20 rounded-full px-4 py-1.5"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2 text-white/20 text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Secure Admin Access · Egypt Advocates © 2026</span>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-linear-to-br from-[hsl(220,40%,7%)] to-[hsl(220,30%,5%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[hsl(40,80%,50%)]/30 to-transparent" />

        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="absolute top-5 right-5 flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/80 border border-white/10 hover:border-white/25 rounded-full px-3 py-1.5 transition-all duration-200"
        >
          <Languages className="h-3.5 w-3.5" />
          {lang === "ar" ? "English" : "العربية"}
        </button>

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo (shown when left panel is hidden) */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[hsl(40,80%,50%)]/15 border border-[hsl(40,80%,50%)]/30 flex items-center justify-center">
              <Scale className="w-5 h-5 text-[hsl(40,80%,60%)]" />
            </div>
            <span className="font-serif font-bold text-white text-lg">Egypt Advocates</span>
          </div>

          {/* Heading */}
          <div className="mb-8" dir={isRtlForm ? "rtl" : "ltr"}>
            <h2 className="text-2xl font-serif font-bold text-white mb-1">
              {isRtlForm ? "مرحباً بعودتك" : "Welcome back"}
            </h2>
            <p className="text-sm text-white/40">{ta("login.subtitle")}</p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
              dir={isRtlForm ? "rtl" : "ltr"}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60 text-xs font-medium uppercase tracking-wider">
                      {ta("login.email")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@egyptadvocates.com"
                        autoComplete="email"
                        className="
                          h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20
                          focus:border-[hsl(40,80%,50%)]/60 focus:bg-white/8 focus:ring-0
                          rounded-xl transition-all duration-200
                        "
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-rose-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60 text-xs font-medium uppercase tracking-wider">
                      {ta("login.password")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="
                            h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20
                            focus:border-[hsl(40,80%,50%)]/60 focus:bg-white/8 focus:ring-0
                            rounded-xl transition-all duration-200 pr-12
                          "
                          {...field}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-rose-400 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={login.isPending}
                className="
                  w-full h-12 mt-2 rounded-xl font-semibold tracking-wide text-sm
                  bg-[hsl(40,80%,50%)] hover:bg-[hsl(40,80%,45%)]
                  text-[hsl(220,40%,8%)]
                  shadow-[0_4px_24px_hsl(40,80%,50%,0.35)]
                  hover:shadow-[0_4px_32px_hsl(40,80%,50%,0.5)]
                  transition-all duration-300
                  disabled:opacity-60
                "
              >
                {login.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    {ta("login.submitting")}
                  </span>
                ) : ta("login.submit")}
              </Button>
            </form>
          </Form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-white/20" dir="ltr">
            Egypt Advocates Admin Portal · Secure Access
          </p>
        </div>
      </div>
    </div>
  );
}
