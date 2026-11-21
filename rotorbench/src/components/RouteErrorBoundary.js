import React from "react";
import { CircleAlert, RotateCw } from "lucide-react";

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV === "development") {
      console.error("Route rendering failed", error, info);
    }
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="route-error" role="alert">
        <CircleAlert size={24} aria-hidden="true" />
        <strong>This view could not load</strong>
        <p>
          A page resource may be stale or unavailable. Reload RotorBench to
          request the current application files.
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          <RotateCw size={16} aria-hidden="true" />
          Reload RotorBench
        </button>
      </div>
    );
  }
}
