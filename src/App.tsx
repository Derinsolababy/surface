import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '@/components/layout/AuthLayout';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Customers from '@/pages/customers/Customers';
import Dashboard from '@/pages/dashboard/Dashboard';
import Inventory from '@/pages/inventory/Inventory';
import POSTerminal from '@/pages/pos/POSTerminal';
import Settings from '@/pages/settings/Settings';
import Transactions from '@/pages/transactions/Transactions';
import { useAuthStore } from '@/stores/authStore';

function App() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth/*"
        element={
          isAuthenticated ? (
            <Navigate to="/pos" replace />
          ) : (
            <AuthLayout>
              <Routes>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="*" element={<Navigate to="login" replace />} />
              </Routes>
            </AuthLayout>
          )
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route path="pos" element={<POSTerminal />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="customers" element={<Customers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/pos" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
