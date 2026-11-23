import { createContext, useContext, useState, useEffect } from "react";
import { readJsonStorage, writeJsonStorage } from "../utils/storage";

const BuildContext = createContext();

export function useBuild() {
  const context = useContext(BuildContext);
  if (!context) {
    throw new Error("useBuild must be used within BuildProvider");
  }
  return context;
}

export function BuildProvider({ children }) {
  // Initialize from localStorage if available
  const [currentBuild, setCurrentBuild] = useState(() =>
    readJsonStorage("currentBuild", null));

  const [analysisResults, setAnalysisResults] = useState(() =>
    readJsonStorage("analysisResults", null));

  // Save to localStorage whenever build changes
  useEffect(() => {
    writeJsonStorage("currentBuild", currentBuild);
  }, [currentBuild]);

  // Save analysis results to localStorage
  useEffect(() => {
    writeJsonStorage("analysisResults", analysisResults);
  }, [analysisResults]);

  const updateBuild = (buildConfig) => {
    setCurrentBuild(buildConfig);
  };

  const updateAnalysis = (analysis) => {
    setAnalysisResults(analysis);
  };

  const clearBuild = () => {
    setCurrentBuild(null);
    setAnalysisResults(null);
  };

  return (
    <BuildContext.Provider value={{ currentBuild, updateBuild, analysisResults, updateAnalysis, clearBuild }}>
      {children}
    </BuildContext.Provider>
  );
}

