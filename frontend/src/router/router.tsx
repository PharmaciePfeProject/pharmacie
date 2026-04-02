import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute";
import PermissionRoute from "../components/PermissionRoute";
import AppLayout from "../components/AppLayout";
import { PERMISSIONS } from "@/lib/roles";

const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Home = lazy(() => import("../pages/Home"));
const Admin = lazy(() => import("../pages/Admin"));
const ProductsList = lazy(() => import("../pages/products/ProductsList"));
const ProductDetails = lazy(() => import("../pages/products/ProductDetails"));
const StockList = lazy(() => import("../pages/stock/StockList"));
const StockLotsList = lazy(() => import("../pages/stock/StockLotsList"));
const StockMovementsList = lazy(() => import("../pages/stock-movements/StockMovementsList"));
const StockMovementDetails = lazy(() => import("../pages/stock-movements/StockMovementDetails"));
const DistributionsList = lazy(() => import("../pages/distribution/DistributionsList"));
const DistributionDetails = lazy(() => import("../pages/distribution/DistributionDetails"));
const InventoriesList = lazy(() => import("../pages/inventory/InventoriesList"));
const InventoryDetails = lazy(() => import("../pages/inventory/InventoryDetails"));
const ExternalOrdersList = lazy(() => import("../pages/supply-flow/ExternalOrdersList"));
const ExternalOrderDetails = lazy(() => import("../pages/supply-flow/ExternalOrderDetails"));
const InternalOrdersList = lazy(() => import("../pages/supply-flow/InternalOrdersList"));
const InternalOrderDetails = lazy(() => import("../pages/supply-flow/InternalOrderDetails"));
const ReceptionsList = lazy(() => import("../pages/supply-flow/ReceptionsList"));
const ReceptionDetails = lazy(() => import("../pages/supply-flow/ReceptionDetails"));
const InternalDeliveriesList = lazy(() => import("../pages/supply-flow/InternalDeliveriesList"));
const InternalDeliveryDetails = lazy(() => import("../pages/supply-flow/InternalDeliveryDetails"));
const BiDashboard = lazy(() => import("../pages/bi/BiDashboard"));
const ReportsList = lazy(() => import("../pages/bi/ReportsList"));
const UsersManagement = lazy(() => import("../pages/admin/UsersManagement"));
const AdminMedicines = lazy(() => import("../pages/admin/AdminMedicines"));
const AdminDoctors = lazy(() => import("../pages/admin/AdminDoctors"));
const SecurityPage = lazy(() => import("../pages/admin/SecurityPage"));
const PrescriptionsPage = lazy(() => import("../pages/prescriptions/PrescriptionsPage"));

function PlaceholderPage({ title }: { title: string }) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-muted-foreground">
          This module is planned and ready for implementation in the next steps.
        </p>
      </div>
  );
}

function RouteLoader() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-muted/70" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-muted/70" />
      </div>
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: withSuspense(<Login />) },
  { path: "/register", element: withSuspense(<Register />) },

    {
      path: "/",
      element: <Navigate to="/app/dashboard" replace />,
    },

    {
      element: <ProtectedRoute />,
      children: [
        {
          path: "/app",
          element: <AppLayout />,
          children: [
            { index: true, element: <Navigate to="/app/dashboard" replace /> },
            { path: "dashboard", element: withSuspense(<Home />) },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_READ]} />,
              children: [
                { path: "products", element: withSuspense(<ProductsList />) },
                { path: "products/:id", element: withSuspense(<ProductDetails />) },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.STOCK_READ]} />,
              children: [{ path: "stock", element: withSuspense(<StockList />) }],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.STOCKLOTS_READ]} />,
              children: [{ path: "stock-lots", element: withSuspense(<StockLotsList />) }],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.MOVEMENTS_READ]} />,
              children: [
                { path: "stock-movements", element: withSuspense(<StockMovementsList />) },
                { path: "stock-movements/:id", element: withSuspense(<StockMovementDetails />) },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.DISTRIBUTIONS_READ]} />,
              children: [
                { path: "distributions", element: withSuspense(<DistributionsList />) },
                { path: "distributions/:id", element: withSuspense(<DistributionDetails />) },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.INVENTORIES_READ]} />,
              children: [
                { path: "inventories", element: withSuspense(<InventoriesList />) },
                { path: "inventories/:id", element: withSuspense(<InventoryDetails />) },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.SUPPLY_READ]} />,
              children: [
                { path: "external-orders", element: withSuspense(<ExternalOrdersList />) },
                { path: "external-orders/:id", element: withSuspense(<ExternalOrderDetails />) },
                { path: "internal-orders", element: withSuspense(<InternalOrdersList />) },
                { path: "internal-orders/:id", element: withSuspense(<InternalOrderDetails />) },
                { path: "receptions", element: withSuspense(<ReceptionsList />) },
                { path: "receptions/:id", element: withSuspense(<ReceptionDetails />) },
                { path: "internal-deliveries", element: withSuspense(<InternalDeliveriesList />) },
                { path: "internal-deliveries/:id", element: withSuspense(<InternalDeliveryDetails />) },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.ANALYTICS_READ]} />,
              children: [
                { path: "bi", element: withSuspense(<BiDashboard />) },
                { path: "bi/reports", element: withSuspense(<ReportsList />) },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.PRESCRIPTIONS_READ]} />,
              children: [{ path: "doctors/prescriptions", element: withSuspense(<PrescriptionsPage />) }],
            },
            { path: "ordonnances", element: <Navigate to="/app/doctors/prescriptions" replace /> },
            { path: "orders", element: <PlaceholderPage title="Orders" /> },
            { path: "reporting", element: <PlaceholderPage title="Reporting" /> },

            {
              element: <AdminRoute />,
              children: [
                { path: "admin", element: withSuspense(<Admin />) },
                {
                  element: <PermissionRoute permissions={[PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS]} />,
                  children: [{ path: "admin/users", element: withSuspense(<UsersManagement />) }],
                },
                {
                  element: <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_MANAGE]} />,
                  children: [{ path: "admin/medicines", element: withSuspense(<AdminMedicines />) }],
                },
                {
                  element: <PermissionRoute permissions={[PERMISSIONS.DOCTORS_MANAGE, PERMISSIONS.ADMIN_ACCESS]} />,
                  children: [{ path: "admin/doctors", element: withSuspense(<AdminDoctors />) }],
                },
                {
                  element: <PermissionRoute permissions={[PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS]} />,
                  children: [{ path: "admin/security", element: withSuspense(<SecurityPage />) }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
