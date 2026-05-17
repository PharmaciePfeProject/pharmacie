import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { router } from "./router/router";
export default function App() {
    return (<LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router}/>
      </AuthProvider>
    </LanguageProvider>);
}
