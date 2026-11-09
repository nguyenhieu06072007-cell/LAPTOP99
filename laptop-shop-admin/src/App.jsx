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
  const { can, user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage />
  if (!can(permission)) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-xl shadow-sm border border-gray-200 text-center">
        <div className="w-14 h-14 mx-auto mb-4 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Giới hạn quyền truy cập</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tài khoản của bạn ({user?.email || 'Người dùng'}) với vai trò <span className="font-semibold text-blue-600">{user?.role || 'Chưa định danh'}</span> không có quyền truy cập chức năng này.
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-100 font-mono mb-4 text-center">
          Quyền yêu cầu: <span className="text-red-600 font-semibold">{Array.isArray(permission) ? permission.join(' HOẶC ') : permission}</span>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          ← Quay lại trang trước
        </button>
      </div>
    )
  }
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
        <Route
          path="categories"
          element={
            <PermissionRoute permission={['catalog:write', 'product:read']}>
              <CategoryListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="products"
          element={
            <PermissionRoute permission="product:read">
              <ProductListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="products/new"
          element={
            <PermissionRoute permission="product:write">
              <ProductFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="products/:id"
          element={
            <PermissionRoute permission="product:read">
              <ProductDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="products/:id/edit"
          element={
            <PermissionRoute permission="product:write">
              <ProductFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="brands"
          element={
            <PermissionRoute permission={['catalog:write', 'product:read']}>
              <BrandListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PermissionRoute permission={['order:read:all', 'order:read:own', 'order:write']}>
              <OrderKanbanPage />
            </PermissionRoute>
          }
        />
        <Route
          path="finance"
          element={
            <PermissionRoute permission={['finance:read', 'report:sales', 'report:read']}>
              <OrderKanbanPage />
            </PermissionRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <PermissionRoute permission="inventory:read">
              <InventoryPage />
            </PermissionRoute>
          }
        />
        <Route
          path="batch-import"
          element={
            <PermissionRoute permission="import:batch">
              <BatchImportPage />
            </PermissionRoute>
          }
        />
        <Route
          path="warranty"
          element={
            <PermissionRoute permission={['warranty:read', 'inventory:serial:manage', 'inventory:serial:read']}>
              <WarrantySerialPage />
            </PermissionRoute>
          }
        />
        <Route
          path="returns"
          element={
            <PermissionRoute permission={['rma:manage', 'warranty:read']}>
              <ReturnsManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="trade-in"
          element={
            <PermissionRoute permission={['tradein:estimate', 'order:read:all', 'warranty:read']}>
              <TradeInPage />
            </PermissionRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="promotions"
          element={
            <PermissionRoute permission="promotion:read">
              <PromotionCampaignPage />
            </PermissionRoute>
          }
        />
        <Route
          path="banners"
          element={
            <PermissionRoute permission={['media:upload', 'catalog:write']}>
              <BannerManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="content"
          element={
            <PermissionRoute permission={['media:upload', 'catalog:write']}>
              <BannerManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="customers"
          element={
            <PermissionRoute permission="customer:read">
              <CustomerPurchaseHistoryPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reports"
          element={
            <PermissionRoute permission={['report:read', 'report:sales', 'finance:read']}>
              <FeedbackReportsPage />
            </PermissionRoute>
          }
        />
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
