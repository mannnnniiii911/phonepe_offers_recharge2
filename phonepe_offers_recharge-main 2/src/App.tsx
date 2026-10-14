import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RechargeProvider } from './context/RechargeContext';
import { RechargePage } from './pages/RechargePage';
import { PlansPage } from './pages/PlansPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HelpModal, NotificationDrawer } from './components/HeaderModals';
import { RefreshConfirmationDialog } from './components/RefreshConfirmationDialog';

// Admin imports
import { AdminAuthProvider } from './admin/context/AdminAuthContext';
import { ProtectedRoute } from './admin/components/ProtectedRoute';
import { AdminLayout } from './admin/components/AdminLayout';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';
import { DashboardOverview } from './admin/pages/DashboardOverview';
import { ProvidersManager } from './admin/pages/ProvidersManager';
import { OffersManager } from './admin/pages/OffersManager';
import { ContentManager } from './admin/pages/ContentManager';
import { SubmissionsManager } from './admin/pages/SubmissionsManager';
import { OrdersManager } from './admin/pages/OrdersManager';
import { ReportsAnalytics } from './admin/pages/ReportsAnalytics';
import { AuditLogViewer } from './admin/pages/AuditLogViewer';
import { SettingsManager } from './admin/pages/SettingsManager';

export const App: React.FC = () => {
  return (
    <AdminAuthProvider>
      <RechargeProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer Website Routes */}
            <Route path="/" element={<RechargePage />} />
            <Route path="/recharge" element={<Navigate to="/" replace />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />

            {/* Admin Authentication Route */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="orders" element={<OrdersManager />} />
              <Route path="providers" element={<ProvidersManager />} />
              <Route path="offers" element={<OffersManager />} />
              <Route path="content" element={<ContentManager />} />
              <Route path="submissions" element={<SubmissionsManager />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="audit-logs" element={<AuditLogViewer />} />
              <Route path="settings" element={<SettingsManager />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Customer Global Modals */}
          <HelpModal />
          <NotificationDrawer />
          <RefreshConfirmationDialog />
        </BrowserRouter>
      </RechargeProvider>
    </AdminAuthProvider>
  );
};

export default App;
