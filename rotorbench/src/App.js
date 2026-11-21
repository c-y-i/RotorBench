import React, { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { BuildProvider } from "./context/BuildContext";
import AppNav from "./components/AppNav";
import RouteErrorBoundary from "./components/RouteErrorBoundary";

const HomePage = lazy(() => import("./components/HomePage"));
const BuildPage = lazy(() => import("./components/BuildPage"));
const AnalysisPage = lazy(() => import("./components/AnalysisPage"));
const UserProfilePage = lazy(() => import("./components/UserProfilePage"));
const SavedConfigsPage = lazy(() => import("./components/SavedConfigsPage"));
const LegalPage = lazy(() => import("./components/LegalPage"));
const SetupPage = lazy(() => import("./components/SetupPage"));
const ComparePage = lazy(() => import("./components/ComparePage"));

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (typeof window.gtag !== "function") {
      return;
    }

    const pagePath = `${location.pathname}${location.search}${location.hash}`;
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_title: document.title,
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}

export function RouteLoading() {
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="route-loading-status">
        <span className="route-loading-mark" aria-hidden="true" />
        <span>
          <strong>Loading workspace</strong>
          <small>Preparing the workbench view.</small>
        </span>
      </div>
      <div className="route-loading-skeleton" aria-hidden="true">
        <div className="route-loading-primary">
          <span className="route-loading-title-line" />
          <span className="route-loading-copy-line" />
          <div className="route-loading-canvas">
            <span className="route-loading-canvas-toolbar" />
            <span className="route-loading-canvas-object" />
          </div>
          <span className="route-loading-caption-line" />
        </div>
        <div className="route-loading-rail">
          <span className="route-loading-rail-title" />
          <span />
          <span />
          <div className="route-loading-rail-list">
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <RouteErrorBoundary
      resetKey={`${location.pathname}${location.search}`}
    >
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/saved" element={<SavedConfigsPage />} />
          <Route path="/legal" element={<LegalPage />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <BuildProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <AppNav />
          <main id="main-content" className="route-stage">
            <AppRoutes />
          </main>
        </div>
      </BrowserRouter>
    </BuildProvider>
  );
}
