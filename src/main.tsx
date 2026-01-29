import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./auth";
import { KitDataProvider } from "./config/KitDataContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRouter } from "./router";
import "./i18n";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <HelmetProvider>
      <AuthProvider>
        <KitDataProvider>
          <AppRouter />
        </KitDataProvider>
      </AuthProvider>
    </HelmetProvider>
  </ErrorBoundary>
);
