import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import HomePage from './pages/public/HomePage';
import {
  ServicesHubPage,
  ServiceDetailPage,
  RegistrationServicePage,
  ReturnsServicePage,
  CancellationServicePage,
  ComplianceServicePage,
  RefundServicePage,
  AuditServicePage,
  AdvisoryServicePage,
  TdsTcsServicePage,
  BusinessLicensesPage,
  ShopEstablishmentPage,
  TradeLicensePage,
  FssaiLicensePage,
  UdyamRegistrationPage,
  IecPage,
  ProfessionalTaxPage,
  DscPage,
  StartupIndiaPage,
} from './pages/public/ServicePages';
import { ContactPage, PricingPage, ResourcesPage, HowItWorksPage, PrivacyPage, TermsPage, AboutPage, RefundPolicyPage } from './pages/public/OtherPages';
import { PortalLoadingSkeleton } from './components/PortalLoadingSkeleton';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ContentProvider } from './context/ContentContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BrandIntroOverlay } from './components/brand-intro/BrandIntroOverlay';
import { initializeAnalytics, trackPageView } from './lib/analytics';
import '../../admin/src/index.css';

// Code-split heavy private dashboards and tool suites to keep initial public bundles ultra-lean
const ClientPortalEntry = lazy(() => import('./pages/app/ClientPortalEntry').then((m) => ({ default: m.ClientPortalEntry })));
const ClientMessagesPage = lazy(() => import('./pages/app/ClientMessagesPage').then((m) => ({ default: m.ClientMessagesPage })));
const TeamPortal = lazy(() => import('./pages/app/TeamPortal').then((m) => ({ default: m.TeamPortal })));
const InvoiceDashboard = lazy(() => import('./pages/app/invoice/InvoiceDashboard').then((m) => ({ default: m.InvoiceDashboard })));
const PrivacyRequestsPage = lazy(() => import('./pages/app/PrivacyRequestsPage').then((m) => ({ default: m.PrivacyRequestsPage })));
const PrivacySettingsPage = lazy(() => import('./pages/app/PrivacySettingsPage').then((m) => ({ default: m.PrivacySettingsPage })));
const AdminApp = lazy(() => import('../../admin/src/App').then((m) => ({ default: m.App })));

// Code-split auth flows
const LoginPage = lazy(() => import('./pages/auth/AuthPages').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/AuthPages').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })));

function AppShell() {
  const settings = useSettings();
  const [introActive, setIntroActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const ua = navigator.userAgent.toLowerCase();
      const isBot = /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|lighthouse|headlesschrome|bytespider/i.test(ua);
      if (isBot) return false;
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return false;
      return !sessionStorage.getItem('gstbro_intro_seen');
    } catch {
      return false;
    }
  });

  const deferLoading = settings?.brandIntro?.deferLoading ?? false;
  const isPendingIntro = introActive && deferLoading;

  return (
    <>
      <BrandIntroOverlay onIntroActiveChange={setIntroActive} />
      <div
        id="main-app-container"
        className={
          isPendingIntro
            ? 'opacity-0 pointer-events-none select-none max-h-screen overflow-hidden'
            : 'transition-opacity duration-500 ease-out opacity-100'
        }
        aria-hidden={isPendingIntro}
      >
        <Suspense fallback={<PortalLoadingSkeleton />}>
          <Routes>
            {/* Core Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesHubPage />} />
            <Route path="/services/gst-registration" element={<RegistrationServicePage />} />
            <Route path="/services/gst-returns" element={<ReturnsServicePage />} />
            <Route path="/services/gst-compliance" element={<ComplianceServicePage />} />
            <Route path="/services/gst-refund" element={<RefundServicePage />} />
            <Route path="/services/gst-audit" element={<AuditServicePage />} />
            <Route path="/services/gst-advisory" element={<AdvisoryServicePage />} />
            <Route path="/services/gst-tds-tcs" element={<TdsTcsServicePage />} />
            <Route path="/services/gst-cancellation" element={<CancellationServicePage />} />

            {/* Business Licenses Hub & Sub-services */}
            <Route path="/services/business-licenses" element={<BusinessLicensesPage />} />
            <Route path="/services/business-licenses/shop-establishment" element={<ShopEstablishmentPage />} />
            <Route path="/services/business-licenses/trade-license" element={<TradeLicensePage />} />
            <Route path="/services/business-licenses/fssai" element={<FssaiLicensePage />} />
            <Route path="/services/business-licenses/udyam" element={<UdyamRegistrationPage />} />
            <Route path="/services/business-licenses/iec" element={<IecPage />} />
            <Route path="/services/business-licenses/professional-tax" element={<ProfessionalTaxPage />} />
            <Route path="/services/business-licenses/dsc" element={<DscPage />} />
            <Route path="/services/business-licenses/startup-india" element={<StartupIndiaPage />} />

            {/* Informational & Support Pages */}
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Client & Team Protected Dashboards */}
            <Route
              path="/privacy/requests"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'TEAM', 'ADMIN']}>
                  <PrivacyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/privacy"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN']}>
                  <PrivacyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/privacy-settings"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN']}>
                  <PrivacySettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN']}>
                  <ClientPortalEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN']}>
                  <ClientPortalEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/messages"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN']}>
                  <ClientMessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/invoices"
              element={
                <ProtectedRoute allowedRoles={['CLIENT', 'TEAM', 'ADMIN']}>
                  <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                      <InvoiceDashboard />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute allowedRoles={['TEAM', 'ADMIN']}>
                  <TeamPortal />
                </ProtectedRoute>
              }
            />

            {/* Admin Portal Routes */}
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}

export function App() {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA4, GTM, and UTM attribution tracking
    initializeAnalytics();
  }, []);

  useEffect(() => {
    // Scroll to top and fire SPA page_view event on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <AuthProvider>
      <SettingsProvider>
        <ContentProvider>
          <ThemeProvider>
            <AppShell />
          </ThemeProvider>
        </ContentProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
