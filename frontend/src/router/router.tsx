import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Admin from "../pages/Admin";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <Admin />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
]);