import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage, ForgotPasswordPage, ForceResetPasswordPage } from './pages/LoginPage';
import { DashboardPage, LeadsPage, ClientsPage, TeamPage, DrivePage, DueDatesPage, TeamDashboardPage, ClientWorkspacePage, FeesPage, ClientCommunicationsPage, ActivityLogsPage } from './pages/AdminPages';
import { SocialSettingsPage, SeoSettingsPage, SiteSettingsPage } from './pages/SettingsPages';
import { BrandIntroSettingsPage } from './pages/BrandIntroSettingsPage';
import { ContentEditorPage } from './pages/ContentEditorPage';
import { WelcomeCodesPage } from './pages/WelcomeCodesPage';
import { SuperAdminPlatformPage } from './pages/SuperAdminPlatformPage';
import { FirmDriveRoutingPage } from './pages/FirmDriveRoutingPage';
import {
  PrivacyRequestsAdminPage,
  PrivacyGovernanceAdminPage,
  PrivacyRetentionAdminPage,
} from './pages/PrivacyAdminPages';

export function App() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to="/login" replace />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="force-reset" element={<ForceResetPasswordPage />} />
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="super-admin" replace />} />
        <Route path="super-admin" element={<SuperAdminPlatformPage />} />
        <Route path="welcome-codes" element={<WelcomeCodesPage />} />
        <Route path="privacy/requests" element={<PrivacyRequestsAdminPage />} />
        <Route path="privacy/governance" element={<PrivacyGovernanceAdminPage />} />
        <Route path="privacy/retention" element={<PrivacyRetentionAdminPage />} />
        <Route path="settings/brand-intro" element={<BrandIntroSettingsPage />} />
        <Route path="settings/content" element={<ContentEditorPage />} />
        <Route path="settings/site" element={<SiteSettingsPage />} />
        <Route path="settings/social" element={<SocialSettingsPage />} />
        <Route path="settings/seo" element={<SeoSettingsPage />} />
        {/* Redirect removed single-tenant operations back to super-admin */}
        <Route path="clients" element={<Navigate to="/super-admin" replace />} />
        <Route path="clients/*" element={<Navigate to="/super-admin" replace />} />
        <Route path="team" element={<Navigate to="/super-admin" replace />} />
        <Route path="messages" element={<Navigate to="/super-admin" replace />} />
        <Route path="drive" element={<Navigate to="/super-admin" replace />} />
        <Route path="due-dates" element={<Navigate to="/super-admin" replace />} />
        <Route path="fees" element={<Navigate to="/super-admin" replace />} />
        <Route path="leads" element={<Navigate to="/super-admin" replace />} />
        <Route path="activity-logs" element={<Navigate to="/super-admin" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  );
}
