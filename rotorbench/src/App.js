import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { BuildProvider } from "./context/BuildContext";
import HomePage from "./components/HomePage";
import BuildPage from "./components/BuildPage";
import AnalysisPage from "./components/AnalysisPage";
import UserProfilePage from "./components/UserProfilePage";
import SavedConfigsPage from "./components/SavedConfigsPage";
import LegalPage from "./components/LegalPage";

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
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

export default function App() {
  return (
    <BuildProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/build" element={<BuildPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/saved" element={<SavedConfigsPage />} />
            <Route path="/legal" element={<LegalPage />} />
          </Routes>
          <footer className="legal-footer">
            <Link to="/legal">Legal & Disclaimer</Link>
          </footer>
        </div>
      </BrowserRouter>
    </BuildProvider>
  );
}
