import { useGetAdminDashboard, useGetAdminRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, CalendarDays, MessageSquare, FileText, FileQuestion, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { useAdminI18n } from "@/lib/admin-i18n";

const KPI_CONFIGS = [
  { key: "clients",             icon: Users,         gradient: "from-blue-500/15 to-blue-600/5",   accent: "text-blue-500",   ring: "ring-blue-500/20" },
  { key: "openCases",           icon: Briefcase,     gradient: "from-indigo-500/15 to-indigo-600/5", accent: "text-indigo-500", ring: "ring-indigo-500/20" },
  { key: "pendingAppointments", icon: CalendarDays,  gradient: "from-amber-500/15 to-amber-600/5",  accent: "text-amber-500",  ring: "ring-amber-500/20" },
  { key: "openChats",           icon: MessageSquare, gradient: "from-emerald-500/15 to-emerald-600/5", accent: "text-emerald-500", ring: "ring-emerald-500/20" },
  { key: "unpaidInvoices",      icon: FileText,      gradient: "from-rose-500/15 to-rose-600/5",    accent: "text-rose-500",   ring: "ring-rose-500/20" },
  { key: "newInquiries",        icon: FileQuestion,  gradient: "from-violet-500/15 to-violet-600/5", accent: "text-violet-500", ring: "ring-violet-500/20" },
];

const PIE_COLORS = ["#1e40af", "#c2410c", "#047857", "#be123c", "#6b7280"];

function DashSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { ta, isRtl } = useAdminI18n();
  const { data: dashboard, isLoading: loadDash } = useGetAdminDashboard();
  const { data: activity, isLoading: loadActivity } = useGetAdminRecentActivity();

  if (loadDash || loadActivity) return <DashSkeleton />;
  if (!dashboard) return null;

  const kpis = [
    { labelKey: "dash.totalClients",   value: dashboard.totals.clients,             cfgKey: "clients" },
    { labelKey: "dash.openCases",      value: dashboard.totals.openCases,           cfgKey: "openCases" },
    { labelKey: "dash.pendingAppts",   value: dashboard.totals.pendingAppointments, cfgKey: "pendingAppointments" },
    { labelKey: "dash.openChats",      value: dashboard.totals.openChats,           cfgKey: "openChats" },
    { labelKey: "dash.unpaidInvoices", value: dashboard.totals.unpaidInvoices,      cfgKey: "unpaidInvoices" },
    { labelKey: "dash.newInquiries",   value: dashboard.totals.newInquiries,        cfgKey: "newInquiries" },
  ];

  const revenueData = [
    { name: ta("dash.lastMonth"), revenue: dashboard.revenue.lastMonthEgp },
    { name: ta("dash.thisMonth"), revenue: dashboard.revenue.thisMonthEgp },
  ];

  return (
    <div className="space-y-8" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">{ta("dash.title")}</h1>
          <p className="text-sm text-muted-foreground">{ta("dash.subtitle")}</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => {
          const cfg = KPI_CONFIGS.find(c => c.key === kpi.cfgKey) ?? KPI_CONFIGS[0];
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className={`relative rounded-2xl border border-border/50 bg-card p-5 overflow-hidden group hover:shadow-md transition-shadow`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-linear-to-br ${cfg.gradient} opacity-50`} />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{ta(kpi.labelKey)}</p>
                  <p className="text-3xl font-bold text-foreground tabular-nums">{kpi.value}</p>
                </div>
                <div className={`shrink-0 w-10 h-10 rounded-xl ring-1 ${cfg.ring} flex items-center justify-center bg-card`}>
                  <Icon className={`w-5 h-5 ${cfg.accent}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue bar */}
        <Card className="lg:col-span-2 rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="font-serif text-base">{ta("dash.revenueChart")}</CardTitle>
            </div>
            <CardDescription className="text-xs">{ta("dash.revenueDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barCategoryGap="40%">
                <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--primary)/0.05)", radius: 6 }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString()} EGP`, ""]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={72} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base">{ta("dash.apptByStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] flex flex-col">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.appointments.byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="count" nameKey="status">
                    {dashboard.appointments.byStatus.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
              {dashboard.appointments.byStatus.map((s, i) => (
                <div key={s.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="capitalize">{s.status.replace("_", " ")}: <b className="text-foreground">{s.count}</b></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Activity */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base">{ta("dash.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {activity?.slice(0, 5).map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{format(new Date(item.occurredAt), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))}
              {((activity?.length ?? 0) === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">{ta("dash.noActivity")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by method */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base">{ta("dash.revenueByMethod")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.revenue.byMethod} layout="vertical" barCategoryGap="35%">
                <XAxis type="number" hide />
                <YAxis dataKey="method" type="category" width={110} stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v.replace("_", " ").toUpperCase()} />
                <Tooltip contentStyle={{ borderRadius: "10px", fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="totalEgp" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
