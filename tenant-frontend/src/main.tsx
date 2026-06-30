import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./providers/AuthProvider";
import { TenantProvider } from "./providers/TenantProvider";
import { MealWindowsProvider } from "./providers/MealWindowsProvider";
import { LoadingProvider } from "./providers/LoadingProvider";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/club">
      <TenantProvider>
        <AuthProvider>
          <MealWindowsProvider>
            <LoadingProvider>
              <App />
            </LoadingProvider>
          </MealWindowsProvider>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
