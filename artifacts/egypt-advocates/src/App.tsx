import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { AdminI18nProvider } from "@/lib/admin-i18n";
import { useState } from "react";
import SplashScreen from "@/components/splash-screen";
import NotFound from "@/pages/not-found";

import PublicLayout from "@/components/public-layout";
import AdminLayout from "@/components/admin-layout";

// Public Pages
import Home from "@/pages/home";
import About from "@/pages/about";
import PracticeAreas from "@/pages/practice-areas";
import PracticeAreaDetail from "@/pages/practice-area-detail";
import Lawyers from "@/pages/lawyers";
import LawyerDetail from "@/pages/lawyer-detail";
import Services from "@/pages/services";
import ServiceDetail from "@/pages/service-detail";
import Book from "@/pages/book";
import LegalLibrary from "@/pages/legal-library";
import LegalArticleDetail from "@/pages/legal-article-detail";
import Blog from "@/pages/blog";
import BlogPostDetail from "@/pages/blog-post-detail";
import FAQs from "@/pages/faqs";
import Contact from "@/pages/contact";

// Admin Pages
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClients from "@/pages/admin/clients";
import AdminClientDetail from "@/pages/admin/client-detail";
import AdminCases from "@/pages/admin/cases";
import AdminCaseDetail from "@/pages/admin/case-detail";
import AdminAppointments from "@/pages/admin/appointments";
import AdminInvoices from "@/pages/admin/invoices";
import AdminInvoiceDetail from "@/pages/admin/invoice-detail";
import AdminPayments from "@/pages/admin/payments";
import AdminChat from "@/pages/admin/chat";
import AdminInquiries from "@/pages/admin/inquiries";
import AdminLegalArticles from "@/pages/admin/legal-articles";
import AdminBlogPosts from "@/pages/admin/blog-posts";
import AdminServices from "@/pages/admin/services";
import AdminLawyers from "@/pages/admin/lawyers";
import AdminSettings from "@/pages/admin/settings";
import AdminMeetingRoom from "@/pages/admin/meeting-room";
import JoinMeeting from "@/pages/join-meeting";
import AdminUsers from "@/pages/admin/users";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Admin Auth Route */}
      <Route path="/admin/login">
        <AdminLogin />
      </Route>

      {/* Admin Dashboard Routes wrapped in AdminLayout */}
      <Route path="/admin">
        <AdminLayout><AdminDashboard /></AdminLayout>
      </Route>
      <Route path="/admin/clients">
        <AdminLayout><AdminClients /></AdminLayout>
      </Route>
      <Route path="/admin/clients/:id">
        <AdminLayout><AdminClientDetail /></AdminLayout>
      </Route>
      <Route path="/admin/cases">
        <AdminLayout><AdminCases /></AdminLayout>
      </Route>
      <Route path="/admin/cases/:id">
        <AdminLayout><AdminCaseDetail /></AdminLayout>
      </Route>
      <Route path="/admin/appointments">
        <AdminLayout><AdminAppointments /></AdminLayout>
      </Route>
      <Route path="/admin/invoices">
        <AdminLayout><AdminInvoices /></AdminLayout>
      </Route>
      <Route path="/admin/invoices/:id">
        <AdminLayout><AdminInvoiceDetail /></AdminLayout>
      </Route>
      <Route path="/admin/payments">
        <AdminLayout><AdminPayments /></AdminLayout>
      </Route>
      <Route path="/admin/chat">
        <AdminLayout><AdminChat /></AdminLayout>
      </Route>
      <Route path="/admin/inquiries">
        <AdminLayout><AdminInquiries /></AdminLayout>
      </Route>
      <Route path="/admin/legal-articles">
        <AdminLayout><AdminLegalArticles /></AdminLayout>
      </Route>
      <Route path="/admin/blog-posts">
        <AdminLayout><AdminBlogPosts /></AdminLayout>
      </Route>
      <Route path="/admin/services">
        <AdminLayout><AdminServices /></AdminLayout>
      </Route>
      <Route path="/admin/lawyers">
        <AdminLayout><AdminLawyers /></AdminLayout>
      </Route>
      <Route path="/admin/settings">
        <AdminLayout><AdminSettings /></AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout><AdminUsers /></AdminLayout>
      </Route>
      {/* Meeting room — fullscreen, no AdminLayout wrapper */}
      <Route path="/admin/appointments/:id/meeting">
        <AdminMeetingRoom />
      </Route>

      {/* Public join page */}
      <Route path="/join/:roomName">
        <JoinMeeting />
      </Route>

      {/* Public Routes with Layout */}
      <Route path="/about">
        <PublicLayout><About /></PublicLayout>
      </Route>
      <Route path="/practice-areas">
        <PublicLayout><PracticeAreas /></PublicLayout>
      </Route>
      <Route path="/practice-areas/:slug">
        <PublicLayout><PracticeAreaDetail /></PublicLayout>
      </Route>
      <Route path="/lawyers">
        <PublicLayout><Lawyers /></PublicLayout>
      </Route>
      <Route path="/lawyers/:id">
        <PublicLayout><LawyerDetail /></PublicLayout>
      </Route>
      <Route path="/services">
        <PublicLayout><Services /></PublicLayout>
      </Route>
      <Route path="/services/:id">
        <PublicLayout><ServiceDetail /></PublicLayout>
      </Route>
      <Route path="/book">
        <PublicLayout><Book /></PublicLayout>
      </Route>
      <Route path="/legal-library">
        <PublicLayout><LegalLibrary /></PublicLayout>
      </Route>
      <Route path="/legal-library/:slug">
        <PublicLayout><LegalArticleDetail /></PublicLayout>
      </Route>
      <Route path="/blog">
        <PublicLayout><Blog /></PublicLayout>
      </Route>
      <Route path="/blog/:slug">
        <PublicLayout><BlogPostDetail /></PublicLayout>
      </Route>
      <Route path="/faqs">
        <PublicLayout><FAQs /></PublicLayout>
      </Route>
      <Route path="/contact">
        <PublicLayout><Contact /></PublicLayout>
      </Route>
      <Route path="/">
        <PublicLayout><Home /></PublicLayout>
      </Route>
      
      {/* Fallback */}
      <Route>
        <PublicLayout><NotFound /></PublicLayout>
      </Route>
    </Switch>
  );
}

// Show splash on every hard page load, but not on in-app navigation
// (module-level flag resets on refresh, persists across route changes)
let _splashShownThisLoad = false;

function App() {
  const [splashDone, setSplashDone] = useState(_splashShownThisLoad);

  function handleSplashDone() {
    _splashShownThisLoad = true;
    setSplashDone(true);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AdminI18nProvider>
          <TooltipProvider>
            {!splashDone && <SplashScreen onDone={handleSplashDone} />}
            <div style={splashDone ? undefined : { visibility: "hidden", pointerEvents: "none" }}>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster position="top-center" />
            </div>
          </TooltipProvider>
        </AdminI18nProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
