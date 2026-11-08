import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage, ForgotPasswordPage, ForceResetPasswordPage } from './pages/LoginPage';
import { DashboardPage, LeadsPage, ClientsPage, TeamPage, DrivePage, DueDatesPage, TeamDashboardPage, ClientWorkspacePage, FeesPage, ClientCommunicationsPage, ActivityLogsPage } from './pages/AdminPages';
import { SocialSettingsPage, SeoSettingsPage, SiteSettingsPage } from './pages/SettingsPages';
import { BrandIntroSettingsPage } from './pages/BrandIntroSettingsPage';
import { ContentEditorPage } from './pages/ContentEditorPage';
import { WelcomeCodesPage } from './pages/WelcomeCodesPage';
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
        <Route index element={<DashboardPage />} />
        <Route path="dashboard/team" element={<TeamDashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientWorkspacePage />} />
        <Route path="welcome-codes" element={<WelcomeCodesPage />} />
        <Route path="messages" element={<ClientCommunicationsPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="drive" element={<DrivePage />} />
        <Route path="due-dates" element={<DueDatesPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="privacy/requests" element={<PrivacyRequestsAdminPage />} />
        <Route path="privacy/governance" element={<PrivacyGovernanceAdminPage />} />
        <Route path="privacy/retention" element={<PrivacyRetentionAdminPage />} />
        <Route path="settings/brand-intro" element={<BrandIntroSettingsPage />} />
        <Route path="settings/content" element={<ContentEditorPage />} />
        <Route path="settings/site" element={<SiteSettingsPage />} />
        <Route path="settings/social" element={<SocialSettingsPage />} />
        <Route path="settings/seo" element={<SeoSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  );
}
