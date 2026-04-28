import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Users, Briefcase, FileText, 
  CalendarDays, MessageSquare, Receipt, 
  FileQuestion, Scale, BookOpen, Settings, LogOut, Menu, X
} from "lucide-react";
import { useAdminLogout, useAdminMe } from "@workspace/api-client-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: user, isLoading, isError } = useAdminMe({
    query: {
      retry: false,
      queryKey: [] as const,
    } as any,
  });
  const logout = useAdminLogout();

  // Redirect to login if not authenticated
  if (isError) {
    setLocation("/admin/login");
    return null;
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      setLocation("/admin/login");
    } catch (e) {
      console.error(e);
      // Force redirect anyway
      setLocation("/admin/login");
    }
  };

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/clients", label: "Clients", icon: Users },
    { href: "/admin/cases", label: "Cases", icon: Briefcase },
    { href: "/admin/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/admin/invoices", label: "Invoices", icon: FileText },
    { href: "/admin/payments", label: "Payments", icon: Receipt },
    { href: "/admin/chat", label: "Chat Support", icon: MessageSquare },
    { href: "/admin/inquiries", label: "Contact Inquiries", icon: FileQuestion },
    { href: "/admin/services", label: "Services", icon: Settings },
    { href: "/admin/lawyers", label: "Lawyers", icon: Scale },
    { href: "/admin/legal-articles", label: "Legal Library", icon: BookOpen },
    { href: "/admin/blog-posts", label: "Blog Posts", icon: FileText },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-muted/20" dir="ltr"> {/* Admin is typically English/LTR */}
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar shrink-0">
          <Link href="/admin" className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Logo" className="h-8 w-8 rounded-sm object-cover" />
            <span className="font-serif font-bold text-sidebar-foreground truncate">Egypt Advocates</span>
          </Link>
          <button className="ml-auto lg:hidden text-sidebar-foreground" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold shrink-0">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center px-4 shrink-0 lg:hidden">
          <button 
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-serif font-semibold ml-2">Admin Portal</span>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
