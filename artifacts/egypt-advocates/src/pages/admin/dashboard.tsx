import { useGetAdminDashboard, useGetAdminRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, CalendarDays, MessageSquare, FileText, FileQuestion } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: dashboard, isLoading: isLoadingDash } = useGetAdminDashboard();
  const { data: activity, isLoading: isLoadingActivity } = useGetAdminRecentActivity();

  if (isLoadingDash || isLoadingActivity) {
    return <div className="flex items-center justify-center h-[50vh]">Loading dashboard...</div>;
  }

  if (!dashboard) return null;

  const kpis = [
    { label: "Total Clients", value: dashboard.totals.clients, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Open Cases", value: dashboard.totals.openCases, icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-100" },
    { label: "Pending Appointments", value: dashboard.totals.pendingAppointments, icon: CalendarDays, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Open Chats", value: dashboard.totals.openChats, icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Unpaid Invoices", value: dashboard.totals.unpaidInvoices, icon: FileText, color: "text-rose-600", bg: "bg-rose-100" },
    { label: "New Inquiries", value: dashboard.totals.newInquiries, icon: FileQuestion, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  const revenueData = [
    { name: "Last Month", revenue: dashboard.revenue.lastMonthEgp },
    { name: "This Month", revenue: dashboard.revenue.thisMonthEgp },
  ];

  const appointmentColors = ['#1e3a8a', '#c2410c', '#047857', '#be123c', '#6b7280'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of firm activity and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="hover-elevate transition-all border-border/50">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.bg}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <h3 className="text-2xl font-bold text-foreground">{kpi.value}</h3>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Revenue Comparison</CardTitle>
            <CardDescription>This month vs last month (EGP)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toLocaleString()}`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Appointments by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.appointments.byStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {dashboard.appointments.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={appointmentColors[index % appointmentColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {dashboard.appointments.byStatus.map((status, i) => (
                <div key={status.status} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: appointmentColors[i % appointmentColors.length] }} />
                  <span className="capitalize">{status.status.replace('_', ' ')}: {status.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activity?.slice(0, 5).map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-accent shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{format(new Date(item.occurredAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
              {((activity?.length ?? 0) === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Revenue by Method</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.revenue.byMethod} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="method" type="category" width={100} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v.replace('_', ' ').toUpperCase()} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="totalEgp" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
