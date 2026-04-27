import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute";
import PermissionRoute from "../components/PermissionRoute";
import AppLayout from "../components/AppLayout";
import { PERMISSIONS, ROLES } from "@/lib/roles";

import Login from "../pages/Login";
import Home from "../pages/Home";
import Admin from "../pages/Admin";
import ProductsList from "../pages/products/ProductsList";
import ProductDetails from "../pages/products/ProductDetails";
import StockList from "../pages/stock/StockList";
import StockMovementsList from "../pages/stock-movements/StockMovementsList";
import StockMovementDetails from "../pages/stock-movements/StockMovementDetails";
import DistributionsList from "../pages/distribution/DistributionsList";
import DistributionDetails from "../pages/distribution/DistributionDetails";
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
import UserRegistration from "../pages/admin/UserRegistration";
import AdminMedicines from "../pages/admin/AdminMedicines";
import SecurityPage from "../pages/admin/SecurityPage";
import PrescriptionsPage from "../pages/prescriptions/PrescriptionsPage";
import ProfilePage from "../pages/ProfilePage";

function PlaceholderPage({ title }) {
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
  { path: "/", element: <Navigate to="/app/dashboard" replace /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/app/dashboard" replace /> },
          { path: "dashboard", element: <Home /> },
          { path: "profile", element: <ProfilePage /> },
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
          { path: "stock-lots", element: <Navigate to="/app/stock" replace /> },
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
          { path: "inventories", element: <Navigate to="/app/dashboard" replace /> },
          { path: "inventories/:id", element: <Navigate to="/app/dashboard" replace /> },
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
            element: (
              <PermissionRoute
                permissions={[PERMISSIONS.PRESCRIPTIONS_READ]}
                roles={[ROLES.PHARMACIEN, ROLES.MEDECIN]}
                functions={["PRESCRIPTIONS"]}
                match="any"
              />
            ),
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
                element: <PermissionRoute permissions={[PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS]} />,
                children: [{ path: "admin/user-registration", element: <UserRegistration /> }],
              },
              {
                element: <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_MANAGE]} />,
                children: [{ path: "admin/medicines", element: <AdminMedicines /> }],
              },
              {
                element: <PermissionRoute permissions={[PERMISSIONS.USERS_MANAGE, PERMISSIONS.ADMIN_ACCESS]} />,
                children: [{ path: "admin/security", element: <SecurityPage /> }],
              },
            ],
          },
        ],
      },
    ],
  },
]);
