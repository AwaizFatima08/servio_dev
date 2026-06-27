// ────────────────────────────────────────────────────────
// App.jsx — Router & Auth Gate
// HomiLabs | Servio | Web
// Updated: /settings → AppSettingsPage, /contact → shared ContactUsPage
// ────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Auth pages ──
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// ── Layout ──
import AppShell    from './components/layout/AppShell';
import BottomStrip from './components/common/BottomStrip';

// ── Employee pages ──
import EmployeeDashboard  from './pages/employee/EmployeeDashboard';
import BookMealPage       from './pages/employee/BookMealPage';
import MyBookingsPage     from './pages/employee/MyBookingsPage';
import MyBillPage         from './pages/employee/MyBillPage';
import FeedbackPage       from './pages/employee/FeedbackPage';
import NotificationsPage  from './pages/employee/NotificationsPage';
import MyProfilePage      from './pages/employee/MyProfilePage';
import MyFamilyPage       from './pages/employee/MyFamilyPage';
import CafePage           from './pages/employee/CafePage';
import MyCafeOrdersPage  from './pages/employee/MyCafeOrdersPage';

// ── Supervisor pages ──
import IssuanceDashboardPage  from './pages/admin/IssuanceDashboardPage';
import KitchenDashboardPage   from './pages/admin/KitchenDashboardPage';
import CafeKitchenPage        from './pages/admin/CafeKitchenPage';
import CafeProxyOrderPage     from './pages/admin/CafeProxyOrderPage';
import CafeHistoryPage        from './pages/admin/CafeHistoryPage';
import ProxyBookingPage       from './pages/admin/ProxyBookingPage';
import WalkInPage             from './pages/admin/WalkInPage';

// ── Accounts pages ──
import RateEntryPage       from './pages/accounts/RateEntryPage';
import BillingDashboardPage from './pages/accounts/BillingDashboardPage';
import AccountsDashboard   from './pages/accounts/AccountsDashboard';

// ── Admin / Manager pages ──
import EmployeeMasterPage     from './pages/admin/EmployeeMasterPage';
import UserManagementPage     from './pages/admin/UserManagementPage';
import MenuManagementPage     from './pages/admin/MenuManagementPage';
import TemplatesCyclesPage    from './pages/admin/TemplatesCyclesPage';
import EventManagementPage    from './pages/admin/EventManagementPage';
import ReportingDashboardPage from './pages/admin/ReportingDashboardPage';
import NotificationCentrePage from './pages/admin/NotificationCentrePage';
import AppSettingsPage        from './pages/admin/AppSettingsPage';
import FeedbackDashboardPage        from './pages/admin/FeedbackDashboardPage';
import OfficialGuestApprovalsPage   from './pages/admin/OfficialGuestApprovalsPage';

// ── Shared pages (all roles) ──
import ContactUsPage from './pages/shared/ContactUsPage';

// ── Spinner ──
function FullPageSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#F2F8F5',
    }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #C6F0E5', borderTopColor: '#0F6E56',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}

// ── Placeholder for screens not yet built (V1.1+) ──
function ComingSoon({ title }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 320, gap: 12,
      fontFamily: 'DM Sans, sans-serif', color: '#888',
    }}>
      <i className="ti ti-tools" style={{ fontSize: 36, color: '#C6F0E5' }} />
      <h2 style={{
        fontFamily: 'Playfair Display, serif', color: '#042C1E',
        margin: 0, fontSize: 20,
      }}>
        {title}
      </h2>
      <p style={{ margin: 0, fontSize: 13 }}>This screen is coming in the next phase.</p>
    </div>
  );
}

// ── Role dashboard — waits for profile before deciding ──
function RoleDashboard() {
  const { userProfile, profileLoading } = useAuth();

  if (profileLoading) return <FullPageSpinner />;

  const role = userProfile?.user?.role || 'employee';

  switch (role) {
    case 'employee':
      return <EmployeeDashboard />;
    case 'accounts_supervisor':
      return <AccountsDashboard />;
    default:
      return <ComingSoon title={`${role.replace(/_/g, ' ')} Dashboard`} />;
  }
}

// ── Protected route — waits for auth + profile ──
function ProtectedRoute({ children }) {
  const { user, loading, profileLoading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (profileLoading) return <FullPageSpinner />;
  return children;
}

// ── Public route ──
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// ── Public shell ──
function PublicShell({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1 }}>{children}</div>
      <BottomStrip />
    </div>
  );
}

// ── Token helper — reads token from AuthContext ──
function WithToken({ Page, extraProps = {} }) {
  const { token } = useAuth();
  return <Page token={token} {...extraProps} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Public pages ── */}
          <Route path="/login" element={
            <PublicRoute>
              <PublicShell><LoginPage /></PublicShell>
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <PublicShell><RegisterPage /></PublicShell>
            </PublicRoute>
          } />

          {/* ── Authenticated pages ── */}
          <Route element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>

            {/* ── Home / role dashboard ── */}
            <Route path="/dashboard" element={<RoleDashboard />} />

            {/* ── Employee screens ── */}
            <Route path="/book-meal"    element={<WithToken Page={BookMealPage} />} />
            <Route path="/my-bookings"  element={<WithToken Page={MyBookingsPage} />} />
            <Route path="/my-bill"      element={<WithToken Page={MyBillPage} />} />
            <Route path="/feedback"     element={<WithToken Page={FeedbackPage} />} />
            <Route path="/notifications" element={<WithToken Page={NotificationsPage} />} />
            <Route path="/profile"      element={<WithToken Page={MyProfilePage} />} />
            <Route path="/my-family"    element={<WithToken Page={MyFamilyPage} />} />
            <Route path="/cafe"         element={<WithToken Page={CafePage} />} />
            <Route path="/my-cafe-orders" element={<WithToken Page={MyCafeOrdersPage} />} />


            {/* ── Supervisor screens ── */}
            <Route path="/issuance"       element={<WithToken Page={IssuanceDashboardPage} />} />
            <Route path="/kitchen"        element={<WithToken Page={KitchenDashboardPage} />} />
            <Route path="/cafe-kitchen"   element={<WithToken Page={CafeKitchenPage} />} />
            <Route path="/cafe-proxy-order" element={<WithToken Page={CafeProxyOrderPage} />} />
            <Route path="/cafe-history"   element={<WithToken Page={CafeHistoryPage} />} />
            <Route path="/proxy-booking"  element={<WithToken Page={ProxyBookingPage} />} />
            <Route path="/walk-in"        element={<WithToken Page={WalkInPage} />} />

            {/* ── Accounts screens ── */}
            <Route path="/rate-entry"        element={<WithToken Page={RateEntryPage} />} />
            <Route path="/billing"           element={<WithToken Page={BillingDashboardPage} />} />
            <Route path="/official-accounts" element={<WithToken Page={BillingDashboardPage} extraProps={{ defaultTab: 'official' }} />} />

            {/* ── Admin / Manager screens ── */}
            <Route path="/employees"  element={<WithToken Page={EmployeeMasterPage} />} />
            <Route path="/users"      element={<WithToken Page={UserManagementPage} />} />
            <Route path="/menu"       element={<WithToken Page={MenuManagementPage} />} />
            <Route path="/templates"  element={<WithToken Page={TemplatesCyclesPage} />} />
            <Route path="/events"     element={<WithToken Page={EventManagementPage} />} />
            <Route path="/reports"    element={<WithToken Page={ReportingDashboardPage} />} />
            <Route path="/notifications-centre" element={<WithToken Page={NotificationCentrePage} />} />

            {/* ── Admin-only: App Settings ── */}
            <Route path="/settings"        element={<WithToken Page={AppSettingsPage} />} />
            <Route path="/feedback-admin"        element={<WithToken Page={FeedbackDashboardPage} />} />
            <Route path="/guest-approvals"       element={<WithToken Page={OfficialGuestApprovalsPage} />} />
            
            {/* ── Shared: Contact Us (all roles) ── */}
            <Route path="/contact"    element={<WithToken Page={ContactUsPage} />} />

            {/* ── Super admin screens (V2) ── */}
            <Route path="/tenant"     element={<ComingSoon title="Tenant Config" />} />
            <Route path="/deployment" element={<ComingSoon title="Deployment Config" />} />
            <Route path="/security"   element={<ComingSoon title="Security Log" />} />

          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
