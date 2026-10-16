import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AdminLayout from './components/layout/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductListPage from './pages/products/ProductListPage'
import ProductFormPage from './pages/products/ProductFormPage'
import ProductDetailPage from './pages/products/ProductDetailPage'
import BrandListPage from './pages/brands/BrandListPage'
import CategoryListPage from './pages/categories/CategoryListPage'
import InventoryPage from './pages/inventory/InventoryPage'
import BatchImportPage from './pages/import/BatchImportPage'
import OrderKanbanPage from './pages/orders/OrderKanbanPage'
import WarrantySerialPage from './pages/warranty/WarrantySerialPage'
import ReturnsManagementPage from './pages/returns/ReturnsManagementPage'
import TradeInPage from './pages/tradein/TradeInPage'
import ProfilePage from './pages/profile/ProfilePage'
import CustomerPurchaseHistoryPage from './pages/customers/CustomerPurchaseHistoryPage'
import FeedbackReportsPage from './pages/reports/FeedbackReportsPage'
import PromotionCampaignPage from './pages/promotions/PromotionCampaignPage'
import BannerManagementPage from './pages/banners/BannerManagementPage'
import UserListPage from './pages/users/UserListPage'
import AuditLogPage from './pages/audit/AuditLogPage'
import NotFoundPage from './pages/NotFoundPage'
import LoadingSpinner from './components/ui/LoadingSpinner'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage />
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage />
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

function PermissionRoute({ children, permission }) {
  const { can } = useAuth()
  if (!can(permission)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="brands" element={<BrandListPage />} />
        <Route path="orders" element={<OrderKanbanPage />} />
        <Route path="finance" element={<OrderKanbanPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="batch-import" element={<BatchImportPage />} />
        <Route path="warranty" element={<WarrantySerialPage />} />
        <Route path="returns" element={<ReturnsManagementPage />} />
        <Route path="trade-in" element={<TradeInPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="promotions" element={<PromotionCampaignPage />} />
        <Route path="banners" element={<BannerManagementPage />} />
        <Route path="content" element={<BannerManagementPage />} />
        <Route path="customers" element={<CustomerPurchaseHistoryPage />} />
        <Route path="reports" element={<FeedbackReportsPage />} />
        <Route
          path="users"
          element={
            <PermissionRoute permission="user:manage">
              <UserListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <PermissionRoute permission="audit:read">
              <AuditLogPage />
            </PermissionRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
