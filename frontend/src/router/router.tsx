  import { createBrowserRouter, Navigate } from "react-router-dom";
  import ProtectedRoute from "../components/ProtectedRoute";
  import AdminRoute from "../components/AdminRoute";
  import PermissionRoute from "../components/PermissionRoute";
  import AppLayout from "../components/AppLayout";
  import Login from "../pages/Login";
  import Register from "../pages/Register";
  import Home from "../pages/Home";
  import Admin from "../pages/Admin";
  import ProductsList from "../pages/products/ProductsList";
  import ProductDetails from "../pages/products/ProductDetails";
  import StockList from "../pages/stock/StockList";
  import StockLotsList from "../pages/stock/StockLotsList";
  import StockMovementsList from "../pages/stock-movements/StockMovementsList";
  import StockMovementDetails from "../pages/stock-movements/StockMovementDetails";
  import DistributionsList from "../pages/distribution/DistributionsList";
  import DistributionDetails from "../pages/distribution/DistributionDetails";
  import InventoriesList from "../pages/inventory/InventoriesList";
  import InventoryDetails from "../pages/inventory/InventoryDetails";
  import ExternalOrdersList from "../pages/supply-flow/ExternalOrdersList";
  import ExternalOrderDetails from "../pages/supply-flow/ExternalOrderDetails";
  import InternalOrdersList from "../pages/supply-flow/InternalOrdersList";
  import InternalOrderDetails from "../pages/supply-flow/InternalOrderDetails";
  import ReceptionsList from "../pages/supply-flow/ReceptionsList";
  import ReceptionDetails from "../pages/supply-flow/ReceptionDetails";
  import InternalDeliveriesList from "../pages/supply-flow/InternalDeliveriesList";
  import InternalDeliveryDetails from "../pages/supply-flow/InternalDeliveryDetails";
  import BiDashboard from "../pages/bi/BiDashboard";
  import ReportsList from "../pages/bi/ReportsList";
  import UsersManagement from "../pages/admin/UsersManagement";
  import AdminMedicines from "../pages/admin/AdminMedicines";
  import AdminDoctors from "../pages/admin/AdminDoctors";
  import PrescriptionsPage from "../pages/prescriptions/PrescriptionsPage";
  import { PERMISSIONS } from "@/lib/roles";

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

  export const router = createBrowserRouter([
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },

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
            { path: "dashboard", element: <Home /> },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_READ]} />,
              children: [
                { path: "products", element: <ProductsList /> },
                { path: "products/:id", element: <ProductDetails /> },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.STOCK_READ]} />,
              children: [{ path: "stock", element: <StockList /> }],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.STOCKLOTS_READ]} />,
              children: [{ path: "stock-lots", element: <StockLotsList /> }],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.MOVEMENTS_READ]} />,
              children: [
                { path: "stock-movements", element: <StockMovementsList /> },
                { path: "stock-movements/:id", element: <StockMovementDetails /> },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.DISTRIBUTIONS_READ]} />,
              children: [
                { path: "distributions", element: <DistributionsList /> },
                { path: "distributions/:id", element: <DistributionDetails /> },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.INVENTORIES_READ]} />,
              children: [
                { path: "inventories", element: <InventoriesList /> },
                { path: "inventories/:id", element: <InventoryDetails /> },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.SUPPLY_READ]} />,
              children: [
                { path: "external-orders", element: <ExternalOrdersList /> },
                { path: "external-orders/:id", element: <ExternalOrderDetails /> },
                { path: "internal-orders", element: <InternalOrdersList /> },
                { path: "internal-orders/:id", element: <InternalOrderDetails /> },
                { path: "receptions", element: <ReceptionsList /> },
                { path: "receptions/:id", element: <ReceptionDetails /> },
                { path: "internal-deliveries", element: <InternalDeliveriesList /> },
                { path: "internal-deliveries/:id", element: <InternalDeliveryDetails /> },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.ANALYTICS_READ]} />,
              children: [
                { path: "bi", element: <BiDashboard /> },
                { path: "bi/reports", element: <ReportsList /> },
              ],
            },
            {
              element: <PermissionRoute permissions={[PERMISSIONS.PRESCRIPTIONS_READ]} />,
              children: [{ path: "doctors/prescriptions", element: <PrescriptionsPage /> }],
            },
            { path: "ordonnances", element: <Navigate to="/app/doctors/prescriptions" replace /> },
            { path: "orders", element: <PlaceholderPage title="Orders" /> },
            { path: "reporting", element: <PlaceholderPage title="Reporting" /> },

            {
              element: <AdminRoute />,
              children: [
                { path: "admin", element: <Admin /> },
                {
                  element: <PermissionRoute permissions={[PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS]} />,
                  children: [{ path: "admin/users", element: <UsersManagement /> }],
                },
                {
                  element: <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_MANAGE]} />,
                  children: [{ path: "admin/medicines", element: <AdminMedicines /> }],
                },
                {
                  element: <PermissionRoute permissions={[PERMISSIONS.DOCTORS_MANAGE, PERMISSIONS.ADMIN_ACCESS]} />,
                  children: [{ path: "admin/doctors", element: <AdminDoctors /> }],
                },
                { path: "admin/security", element: <PlaceholderPage title="Security" /> },
              ],
            },
          ],
        },
      ],
    },
  ]);
