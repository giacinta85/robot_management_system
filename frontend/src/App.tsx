import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/LoginPage'
import MainLayout from './components/MainLayout'
import MachinesPage from './pages/machines/MachinesPage'
import MachineDetailPage from './pages/machines/MachineDetailPage'
import MaintenancePage from './pages/maintenance/MaintenancePage'
import TestRecordsPage from './pages/maintenance/TestRecordsPage'
import MarketingRequestPage from './pages/marketing/MarketingRequestPage'
import MarketingCalendarPage from './pages/admin/MarketingCalendarPage'
import RequestListPage from './pages/admin/RequestListPage'
import DashboardPage from './pages/DashboardPage'
import AdminResourcesPage from './pages/admin/AdminResourcesPage'
import ShippingRequestPage from './pages/shipping/ShippingRequestPage'
import ShippingListPage from './pages/shipping/ShippingListPage'
import AfterSalesRequestPage from './pages/after_sales/AfterSalesRequestPage'
import AfterSalesListPage from './pages/after_sales/AfterSalesListPage'
import AuditLogPage from './pages/admin/AuditLogPage'

function RequireAuth({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { token, role } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/request" element={<MarketingRequestPage />} />
        <Route path="/shipping-request" element={<ShippingRequestPage />} />
        <Route path="/after-sales-request" element={<AfterSalesRequestPage />} />

        {/* Protected */}
        <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="machines" element={<RequireAuth roles={['admin', 'rd_test']}><MachinesPage /></RequireAuth>} />
          <Route path="machines/:id" element={<RequireAuth roles={['admin', 'rd_test']}><MachineDetailPage /></RequireAuth>} />
          <Route path="maintenance" element={<RequireAuth roles={['admin', 'maintenance', 'rd_test']}><MaintenancePage /></RequireAuth>} />
          <Route path="test-records" element={<RequireAuth roles={['admin', 'rd_test']}><TestRecordsPage /></RequireAuth>} />
          <Route path="requests" element={<RequireAuth roles={['admin']}><RequestListPage /></RequireAuth>} />
          <Route path="calendar" element={<RequireAuth roles={['admin']}><MarketingCalendarPage /></RequireAuth>} />
          <Route path="resources" element={<RequireAuth roles={['admin']}><AdminResourcesPage /></RequireAuth>} />
          <Route path="shipping-list" element={<RequireAuth roles={['admin']}><ShippingListPage /></RequireAuth>} />
          <Route path="after-sales-list" element={<RequireAuth roles={['admin']}><AfterSalesListPage /></RequireAuth>} />
          <Route path="audit-logs" element={<RequireAuth roles={['admin']}><AuditLogPage /></RequireAuth>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
