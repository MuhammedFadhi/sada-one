import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { NotificationListener } from '@/components/NotificationListener'
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query'
import toast, { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// ── Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const SetPasswordPage = lazy(() => import('@/pages/auth/SetPassword').then(m => ({ default: m.SetPasswordPage })))
const CompleteProfilePage = lazy(() => import('@/pages/auth/CompleteProfilePage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPassword').then(m => ({ default: m.ResetPasswordPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPasswordPage })))
const InvitePage = lazy(() => import('@/pages/auth/Invite').then(m => ({ default: m.InvitePage })))
const WelcomePage = lazy(() => import('@/pages/auth/Welcome').then(m => ({ default: m.WelcomePage })))
const TutorialPage = lazy(() => import('@/pages/auth/Tutorial').then(m => ({ default: m.TutorialPage })))

// ── Employee panel
import { EmployeeLayout }     from '@/components/layout/EmployeeLayout'
import { RoleLayout }         from '@/components/layout/RoleLayout'
const EmployeeHomePage = lazy(() => import('@/pages/employee/HomePage').then(m => ({ default: m.EmployeeHomePage })))
const AttendancePage = lazy(() => import('@/pages/employee/AttendancePage').then(m => ({ default: m.AttendancePage })))
const LeavePage = lazy(() => import('@/pages/employee/LeavePage').then(m => ({ default: m.LeavePage })))
const PayslipsPage = lazy(() => import('@/pages/employee/PayslipsPage').then(m => ({ default: m.PayslipsPage })))
const ServicesPage = lazy(() => import('@/pages/employee/ServicesPage').then(m => ({ default: m.ServicesPage })))
const LoansPage = lazy(() => import('@/pages/employee/LoansPage').then(m => ({ default: m.LoansPage })))
const ExitReentryPage = lazy(() => import('@/pages/employee/ExitReentryPage').then(m => ({ default: m.ExitReentryPage })))
const DocumentsPage = lazy(() => import('@/pages/employee/DocumentsPage').then(m => ({ default: m.DocumentsPage })))
const DirectoryPage = lazy(() => import('@/pages/employee/DirectoryPage').then(m => ({ default: m.DirectoryPage })))
const OrgChartPage = lazy(() => import('@/pages/employee/OrgChartPage').then(m => ({ default: m.OrgChartPage })))
const AnnouncementsPage = lazy(() => import('@/pages/employee/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })))
const PerformancePage = lazy(() => import('@/pages/employee/PerformancePage').then(m => ({ default: m.PerformancePage })))
const MyAssetsPage = lazy(() => import('@/pages/employee/AssetsPage').then(m => ({ default: m.MyAssetsPage })))
const ExpenseClaimsPage = lazy(() => import('@/pages/employee/ExpensesPage').then(m => ({ default: m.ExpenseClaimsPage })))
const PoliciesPage = lazy(() => import('@/pages/employee/PoliciesPage').then(m => ({ default: m.PoliciesPage })))
const CalendarPage = lazy(() => import('@/pages/employee/CalendarPage').then(m => ({ default: m.CalendarPage })))
const HelpDeskPage = lazy(() => import('@/pages/employee/HelpDeskPage').then(m => ({ default: m.HelpDeskPage })))
const ProfilePage = lazy(() => import('@/pages/employee/ProfilePage').then(m => ({ default: m.ProfilePage })))

// ── Manager panel
import { ManagerLayout }      from '@/components/layout/ManagerLayout'
const ManagerHomePage = lazy(() => import('@/pages/manager/HomePage').then(m => ({ default: m.ManagerHomePage })))
const ApprovalsPage = lazy(() => import('@/pages/manager/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })))
const TeamPage = lazy(() => import('@/pages/manager/TeamPage').then(m => ({ default: m.TeamPage })))
const TeamMemberPage = lazy(() => import('@/pages/manager/TeamMemberPage').then(m => ({ default: m.TeamMemberPage })))
const ManagerReportsPage = lazy(() => import('@/pages/manager/ReportsPage').then(m => ({ default: m.ManagerReportsPage })))

// ── HR panel
import { HRLayout }           from '@/components/layout/HRLayout'
const HRHomePage = lazy(() => import('@/pages/hr/HomePage').then(m => ({ default: m.HRHomePage })))
const EmployeesPage = lazy(() => import('@/pages/hr/EmployeesPage').then(m => ({ default: m.EmployeesPage })))
const EmployeeFilePage = lazy(() => import('@/pages/hr/EmployeeFilePage').then(m => ({ default: m.EmployeeFilePage })))
const HRRequestsAllPage = lazy(() => import('@/pages/hr/RequestsPage').then(m => ({ default: m.HRRequestsAllPage })))
const OnboardingPage = lazy(() => import('@/pages/hr/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const AddEmployeePage = lazy(() => import('@/pages/hr/AddEmployeePage').then(m => ({ default: m.AddEmployeePage })))
const BulkImportPage = lazy(() => import('@/pages/hr/BulkImportPage').then(m => ({ default: m.BulkImportPage })))
const DocTrackingPage = lazy(() => import('@/pages/hr/DocTrackingPage').then(m => ({ default: m.DocTrackingPage })))
const HRReportsPage = lazy(() => import('@/pages/hr/ReportsPage').then(m => ({ default: m.HRReportsPage })))
const HRToolsPage = lazy(() => import('@/pages/hr/ToolsPage').then(m => ({ default: m.HRToolsPage })))
const UserActivityPage = lazy(() => import('@/pages/hr/UserActivityPage'))
const OffboardingPage = lazy(() => import('@/pages/hr/OffboardingPage').then(m => ({ default: m.OffboardingPage })))

// ── Finance panel
import { FinanceLayout }      from '@/components/layout/FinanceLayout'
const FinanceHomePage = lazy(() => import('@/pages/finance/HomePage').then(m => ({ default: m.FinanceHomePage })))
const PayrollPage = lazy(() => import('@/pages/finance/PayrollPage').then(m => ({ default: m.PayrollPage })))
const AllLoansPage = lazy(() => import('@/pages/finance/LoansPage').then(m => ({ default: m.AllLoansPage })))
const EOSPage = lazy(() => import('@/pages/finance/EOSPage').then(m => ({ default: m.EOSPage })))
const FinanceReportsPage = lazy(() => import('@/pages/finance/ReportsPage').then(m => ({ default: m.FinanceReportsPage })))

// ── Admin panel
import { AdminLayout }        from '@/components/layout/AdminLayout'
const AdminHomePage = lazy(() => import('@/pages/admin/HomePage').then(m => ({ default: m.AdminHomePage })))
const UsersPage = lazy(() => import('@/pages/admin/UsersPage').then(m => ({ default: m.UsersPage })))
const UserDetailPage = lazy(() => import('@/pages/admin/UserDetailPage').then(m => ({ default: m.UserDetailPage })))
const RolesPage = lazy(() => import('@/pages/admin/RolesPage').then(m => ({ default: m.RolesPage })))
const RoleDetailPage = lazy(() => import('@/pages/admin/RoleDetailPage').then(m => ({ default: m.RoleDetailPage })))
const DivisionsPage = lazy(() => import('@/pages/admin/DivisionsPage').then(m => ({ default: m.DivisionsPage })))
const OrganizationPage = lazy(() => import('@/pages/admin/OrganizationPage').then(m => ({ default: m.OrganizationPage })))
const WorkSitesPage = lazy(() => import('@/pages/admin/WorkSitesPage').then(m => ({ default: m.WorkSitesPage })))
const FeatureFlagsPage = lazy(() => import('@/pages/admin/FeatureFlagsPage').then(m => ({ default: m.FeatureFlagsPage })))
const SalesAnalyticsPage = lazy(() => import('@/pages/analytics/SalesAnalyticsPage').then(m => ({ default: m.SalesAnalyticsPage })))
import { FeatureGate }         from '@/components/FeatureGate'
const SystemSettingsPage = lazy(() => import('@/pages/admin/SystemPage').then(m => ({ default: m.SystemSettingsPage })))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage').then(m => ({ default: m.AuditLogPage })))

// ── Tasks
const TasksHomePage = lazy(() => import('@/pages/tasks/TasksHomePage').then(m => ({ default: m.TasksHomePage })))
const ProjectBoardPage = lazy(() => import('@/pages/tasks/ProjectBoardPage').then(m => ({ default: m.ProjectBoardPage })))
const TaskDetailPage = lazy(() => import('@/pages/tasks/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })))
const TaskHistoryPage = lazy(() => import('@/pages/tasks/TaskHistoryPage'))

// ── Chat
const ChatChannelsPage = lazy(() => import('@/pages/chat/ChatChannelsPage').then(m => ({ default: m.ChatChannelsPage })))
const ChatRoomPage = lazy(() => import('@/pages/chat/ChatRoomPage').then(m => ({ default: m.ChatRoomPage })))
const NotificationsPage = lazy(() => import('@/pages/shared/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const SuggestionsPage = lazy(() => import('@/pages/employee/SuggestionsPage').then(m => ({ default: m.SuggestionsPage })))
const HRRequestsPage = lazy(() => import('@/pages/employee/HRRequestsPage').then(m => ({ default: m.HRRequestsPage })))

import { LoadingScreen }      from '@/components/ui/LoadingScreen'

const queryClient = new QueryClient({
  // Surface any query failure once (deduped by id) instead of letting pages render as empty.
  queryCache: new QueryCache({
    onError: () => toast.error("Couldn't load some data. Pull to refresh or try again.", { id: 'query-error' }),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      // Mobile PWAs get backgrounded constantly, which drops the realtime socket.
      // Refetching on focus/reconnect makes data self-heal the moment the user returns.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, role, initialized } = useAuthStore()
  const navigate = useNavigate()
  useEffect(() => {
    if (initialized && !user) navigate('/auth/login', { replace: true })
  }, [initialized, user])
  if (!initialized) return <LoadingScreen />
  if (!user) return null
  if (roles && role && !roles.includes(role)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}

function RoleRedirect() {
  const { role, profile } = useAuthStore()
  if (profile && profile.profile_completed === false) return <Navigate to="/auth/complete-profile" replace />
  if (profile?.must_change_password) return <Navigate to="/auth/set-password" replace />
  const routes: Record<string, string> = {
    employee: '/employee', manager: '/manager', hr_officer: '/hr',
    finance: '/hr', admin: '/admin'   // HR & Finance merged into one portal
  }
  return <Navigate to={routes[role ?? ''] ?? '/auth/login'} replace />
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, initialized } = useAuthStore()
  useEffect(() => { initialize() }, [])
  if (!initialized) return <LoadingScreen />
  return <>{children}</>
}


function PageLoader() {
  return (
    <div style={{
      height: '100dvh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0D1B2A',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,.15)', borderTopColor: '#17B8D0',
          animation: 'sada-spin .7s linear infinite',
        }} />
        <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, letterSpacing: 0.4 }}>Loading…</span>
      </div>
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
      <BrowserRouter>
        <AppInitializer>
          <NotificationListener />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />

            {/* Auth */}
            <Route path="/auth/login"          element={<LoginPage />} />
            <Route path="/auth/set-password"   element={<SetPasswordPage />} />
            <Route path="/auth/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/auth/forgot"         element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/join/:token"         element={<InvitePage />} />
            <Route path="/welcome"             element={<WelcomePage />} />
            <Route path="/tutorial"            element={<TutorialPage />} />

            {/* Employee */}
            <Route path="/employee" element={<ProtectedRoute><EmployeeLayout /></ProtectedRoute>}>
              <Route index                element={<EmployeeHomePage />} />
              <Route path="attendance"    element={<FeatureGate feature="attendance"><AttendancePage /></FeatureGate>} />
              <Route path="leave"         element={<FeatureGate feature="leave"><LeavePage /></FeatureGate>} />
              <Route path="services"      element={<ServicesPage />} />
              <Route path="loans"         element={<FeatureGate feature="loans"><LoansPage /></FeatureGate>} />
              <Route path="exit"          element={<ExitReentryPage />} />
              <Route path="documents"     element={<FeatureGate feature="documents"><DocumentsPage /></FeatureGate>} />
              <Route path="directory"     element={<FeatureGate feature="directory"><DirectoryPage /></FeatureGate>} />
              <Route path="org"           element={<OrgChartPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="performance"   element={<FeatureGate feature="performance"><PerformancePage /></FeatureGate>} />
              <Route path="assets"        element={<MyAssetsPage />} />
              <Route path="expenses"      element={<FeatureGate feature="expenses"><ExpenseClaimsPage /></FeatureGate>} />
              <Route path="policies"      element={<PoliciesPage />} />
              <Route path="calendar"      element={<CalendarPage />} />
              <Route path="helpdesk"      element={<FeatureGate feature="helpdesk"><HelpDeskPage /></FeatureGate>} />
              <Route path="profile"       element={<ProfilePage />} />
              <Route path="suggestions"   element={<SuggestionsPage />} />
              <Route path="hr-requests"   element={<HRRequestsPage />} />
            </Route>

            {/* Manager */}
            <Route path="/manager" element={<ProtectedRoute roles={['manager','admin']}><ManagerLayout /></ProtectedRoute>}>
              <Route index               element={<ManagerHomePage />} />
              <Route path="approvals"    element={<ApprovalsPage />} />
              <Route path="team"         element={<TeamPage />} />
              <Route path="team/:id"     element={<TeamMemberPage />} />
              <Route path="reports"      element={<ManagerReportsPage />} />
            </Route>

            {/* HR */}
            <Route path="/hr" element={<ProtectedRoute roles={['hr_officer','finance','admin']}><HRLayout /></ProtectedRoute>}>
              <Route index                element={<HRHomePage />} />
              <Route path="employees"     element={<EmployeesPage />} />
              <Route path="employees/:id" element={<EmployeeFilePage />} />
              <Route path="requests"      element={<HRRequestsAllPage />} />
              <Route path="onboarding"    element={<OnboardingPage />} />
              <Route path="offboarding"   element={<OffboardingPage />} />
              <Route path="documents"     element={<DocTrackingPage />} />
              <Route path="reports"       element={<HRReportsPage />} />
              <Route path="tools"         element={<HRToolsPage />} />
              <Route path="activity"      element={<UserActivityPage />} />
            </Route>

            {/* Finance */}
            <Route path="/finance" element={<ProtectedRoute roles={['finance','hr_officer','admin']}><FinanceLayout /></ProtectedRoute>}>
              <Route index           element={<FinanceHomePage />} />
              <Route path="payroll"  element={<PayrollPage />} />
              <Route path="loans"    element={<AllLoansPage />} />
              <Route path="eos"      element={<EOSPage />} />
              <Route path="reports"  element={<FinanceReportsPage />} />
              <Route path="analytics" element={<FeatureGate feature="sales_analytics"><SalesAnalyticsPage /></FeatureGate>} />
            </Route>

            {/* Shared Sales Analytics (managers + HR too) — role-aware layout keeps the nav */}
            <Route path="/analytics" element={<ProtectedRoute roles={['finance','admin','manager','hr_officer']}><RoleLayout /></ProtectedRoute>}>
              <Route index element={<FeatureGate feature="sales_analytics"><SalesAnalyticsPage /></FeatureGate>} />
            </Route>

            {/* Add Employee — standalone full-screen (own header + footer, no bottom nav) */}
            <Route path="/hr/employees/new" element={<ProtectedRoute roles={['hr_officer','finance','admin']}><AddEmployeePage /></ProtectedRoute>} />
            <Route path="/hr/employees/import" element={<ProtectedRoute roles={['hr_officer','finance','admin']}><BulkImportPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index               element={<AdminHomePage />} />
              <Route path="users"        element={<UsersPage />} />
              <Route path="users/:id"    element={<UserDetailPage />} />
              <Route path="roles"        element={<RolesPage />} />
              <Route path="roles/:role"  element={<RoleDetailPage />} />
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="divisions"    element={<DivisionsPage />} />
              <Route path="work-sites"   element={<WorkSitesPage />} />
              <Route path="features"     element={<FeatureFlagsPage />} />
              <Route path="settings"     element={<SettingsPage />} />
              <Route path="system"       element={<SystemSettingsPage />} />
              <Route path="audit"        element={<AuditLogPage />} />
            </Route>

            {/* Tasks — nested inside employee layout for consistent nav */}
            <Route path="/tasks" element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
              <Route index element={<FeatureGate feature="tasks"><TasksHomePage /></FeatureGate>} />
              <Route path="project/:id" element={<FeatureGate feature="tasks"><ProjectBoardPage /></FeatureGate>} />
              <Route path="history" element={<FeatureGate feature="tasks"><TaskHistoryPage /></FeatureGate>} />
              <Route path=":id" element={<FeatureGate feature="tasks"><TaskDetailPage /></FeatureGate>} />
            </Route>

            {/* Chat — nested inside employee layout for consistent nav */}
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            <Route path="/chat" element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
              <Route index element={<FeatureGate feature="chat"><ChatChannelsPage /></FeatureGate>} />
              <Route path=":channelId" element={<FeatureGate feature="chat"><ChatRoomPage /></FeatureGate>} />
            </Route>

            {/* Fallbacks */}
            <Route path="/unauthorized" element={
              <div style={{ minHeight: '100dvh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, flexDirection: 'column' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                <h1 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Access Denied</h1>
                <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, marginBottom: 24 }}>You don't have permission to view this page.</p>
                <button onClick={() => window.history.back()}
                  style={{ background: '#17B8D0', color: 'white', border: 'none', borderRadius: 12, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Go Back
                </button>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AppInitializer>
      </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-center" containerStyle={{
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      }} toastOptions={{
        style: { background: '#17294A', color: '#fff', borderRadius: '12px' },
        success: { iconTheme: { primary: '#1D9E75', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#E24B4A', secondary: '#fff' } },
      }} />
    </QueryClientProvider>
  )
}
