import React, { createContext, useContext, useState, useEffect } from "react";

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
  const [currentBuild, setCurrentBuild] = useState(() => {
    const saved = localStorage.getItem("currentBuild");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved build:", e);
        return null;
      }
    }
    return null;
  });

  const [analysisResults, setAnalysisResults] = useState(() => {
    const saved = localStorage.getItem("analysisResults");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved analysis:", e);
        return null;
      }
    }
    return null;
  });

  // Save to localStorage whenever build changes
  useEffect(() => {
    if (currentBuild) {
      localStorage.setItem("currentBuild", JSON.stringify(currentBuild));
    } else {
      localStorage.removeItem("currentBuild");
    }
  }, [currentBuild]);

  // Save analysis results to localStorage
  useEffect(() => {
    if (analysisResults) {
      localStorage.setItem("analysisResults", JSON.stringify(analysisResults));
    } else {
      localStorage.removeItem("analysisResults");
    }
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

