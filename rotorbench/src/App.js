import React from "react";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import { BuildProvider } from "./context/BuildContext";
import HomePage from "./components/HomePage";
import BuildPage from "./components/BuildPage";
import AnalysisPage from "./components/AnalysisPage";
import UserProfilePage from "./components/UserProfilePage";
import SavedConfigsPage from "./components/SavedConfigsPage";
import LegalPage from "./components/LegalPage";

export default function App() {
  const isGithubPagesHost =
    typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  const RouterComponent = isGithubPagesHost ? HashRouter : BrowserRouter;

  return (
    <BuildProvider>
      <RouterComponent>
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
      </RouterComponent>
    </BuildProvider>
  );
}
