import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import RootLayout from '@/lib/(root)/layout'
import AuthLayout from '@/lib/(auth)/layout'
import HomePage from '@/lib/(root)/page'
import SignInPage from '@/lib/(auth)/sign-in/page'
import AnalyticsPage from '@/lib/(root)/analytics/page'
import CustomersPage from '@/lib/(root)/customers/page'
import ProductsPage from '@/lib/(root)/products/page'
import OrdersPage from '@/lib/(root)/orders/page'
import OrderDetailsPage from '@/lib/(root)/orders/[id]/page'
import FulfillmentPage from '@/lib/(root)/fulfillment/page'
import FulfillmentDetailsPage from '@/lib/(root)/fulfillment/[orderId]/page'
import ReportsPage from '@/lib/(root)/reports/page'
import MessagesPage from '@/lib/(root)/messages/page'
import SettingsPage from '@/lib/(root)/settings/page'
import ProfilePage from '@/lib/(root)/settings/profile/page'
import PaymentPage from '@/lib/(root)/fulfillment/payment/[fulfillmentId]/page'
import ProductDetailsPage from '@/lib/(root)/products/[id]/page'
import ProductInventoryPage from '@/lib/(root)/products/[id]/inventory/page'
import EditProductPage from '@/lib/(root)/products/[id]/edit/page'
import NewProductPage from '@/lib/(root)/products/new/page'
import NewOrderPage from '@/lib/(root)/orders/new/page'
import InboxPage from '@/lib/(root)/inbox/page'
import CustomerDetailsPage from '@/lib/(root)/customers/[id]/page'
import CustomerNewPage from '@/lib/(root)/customers/new/page'
import CustomerEditPage from '@/lib/(root)/customers/[id]/edit/page'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { NotificationProvider } from '@/contexts/notification-context'
import { SettingsProvider } from '@/contexts/settings-context'
import { DatabaseProvider } from '@/contexts/database-context'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { Toaster } from "@/components/ui/toaster"
import { ProtectedRoute } from '@/components/protected-route'
import EmployeesPage from '@/lib/(root)/employees/page'
import { AdminRoute } from "@/components/admin-route"
import ThreadPage from '@/lib/(root)/messages/[threadId]/page'
import EmployeeDetailsPage from '@/lib/(root)/employees/[id]/page'
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-w-full">
        {error.message}
      </pre>
      <button
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        onClick={() => window.location.reload()}
      >
        Try again
      </button>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DatabaseProvider>
        <WebSocketProvider>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Router>
              <AuthProvider>
                <NotificationProvider>
                  <SettingsProvider>
                    <Routes>
                      {/* Auth routes - public */}
                      <Route element={<AuthLayout />}>
                        <Route path="/sign-in" element={<SignInPage />} />
                      </Route>

                      {/* Protected routes */}
                      <Route element={<RootLayout />}>
                        <Route path="/" element={
                          <ProtectedRoute>
                            <HomePage />
                          </ProtectedRoute>
                        } />
                        <Route path="/analytics" element={
                          <ProtectedRoute>
                            <AnalyticsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/customers" element={
                          <ProtectedRoute>
                            <CustomersPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/customers/:id" element={
                          <ProtectedRoute>
                            <CustomerDetailsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/products" element={
                          <ProtectedRoute>
                            <ProductsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/products/new" element={
                          <AdminRoute>
                            <NewProductPage />
                          </AdminRoute>
                        } />
                        <Route path="/products/:id" element={
                          <ProtectedRoute>
                            <ProductDetailsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/products/:id/inventory" element={
                          <ProtectedRoute>
                            <ProductInventoryPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/products/:id/edit" element={
                          <AdminRoute>
                            <EditProductPage />
                          </AdminRoute>
                        } />
                        <Route path="/orders" element={
                          <ProtectedRoute>
                            <OrdersPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/orders/new" element={
                          <ProtectedRoute>
                            <NewOrderPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/orders/:id" element={
                          <ProtectedRoute>
                            <OrderDetailsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/fulfillment" element={
                          <ProtectedRoute>
                            <FulfillmentPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/fulfillment/:orderId" element={
                          <ProtectedRoute>
                            <FulfillmentDetailsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/fulfillment/payment/:fulfillmentId" element={
                          <ProtectedRoute>
                            <PaymentPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/reports" element={
                          <ProtectedRoute>
                            <ReportsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/messages" element={
                          <ProtectedRoute>
                            <MessagesPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/messages/:threadId" element={
                          <ProtectedRoute>
                            <ThreadPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                          <ProtectedRoute>
                            <SettingsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/settings/profile" element={
                          <ProtectedRoute>
                            <ProfilePage />
                          </ProtectedRoute>
                        } />
                        <Route path="/inbox" element={<InboxPage />} />
                        {/* Admin only routes */}
                        <Route path="/employees" element={
                          <ProtectedRoute requireAdmin>
                            <EmployeesPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/employees/:id" element={
                          <AdminRoute>
                            <EmployeeDetailsPage />
                          </AdminRoute>
                        } />
                        <Route path="/customers/new" element={
                          <AdminRoute>
                            <CustomerNewPage />
                          </AdminRoute>
                        } />
                        <Route path="/customers/:id/edit" element={
                          <AdminRoute>
                            <CustomerEditPage />
                          </AdminRoute>
                        } />
                      </Route>
                    </Routes>
                    <Toaster />
                  </SettingsProvider>
                </NotificationProvider>
              </AuthProvider>
            </Router>
          </ThemeProvider>
        </WebSocketProvider>
      </DatabaseProvider>
    </ErrorBoundary>
  )
}