import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth";
import { KitDataProvider } from "./config/KitDataContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRouter } from "./router";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AuthProvider>
      <KitDataProvider>
        <AppRouter />
      </KitDataProvider>
    </AuthProvider>
  </ErrorBoundary>
);
