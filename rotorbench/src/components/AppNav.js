import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  FolderOpen,
  Home,
  Plus,
  RadioTower,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import logo from "../assets/logo.png";

const primaryLinks = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/build", label: "Build", icon: SlidersHorizontal },
  { to: "/setup", label: "Setup", icon: RadioTower },
  { to: "/saved", label: "Saved", icon: FolderOpen },
  { to: "/profile", label: "Profile", icon: UserRound },
];

function NavItem({ to, label, icon: Icon, end, compact = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${compact ? "mobile-nav-item" : "sidebar-nav-item"}${isActive ? " is-active" : ""}`
      }
    >
      <Icon size={compact ? 21 : 19} strokeWidth={1.9} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppNav() {
  return (
    <>
      <aside className="app-sidebar">
        <Link to="/" className="brand-lockup">
          <img src={logo} alt="" className="brand-logo" />
          <span>
            <strong>RotorBench</strong>
            <small>FPV build workbench</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {primaryLinks.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/legal" className="sidebar-legal-link">
            <ShieldAlert size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>Legal & safety</span>
          </Link>
          <p>Plan and compare before you build.</p>
        </div>
      </aside>

      <header className="mobile-header">
        <Link to="/" className="brand-lockup brand-lockup-mobile">
          <img src={logo} alt="" className="brand-logo" />
          <strong>RotorBench</strong>
        </Link>
        <Link to="/build?new=1" className="mobile-build-action">
          <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
          <span>New build</span>
        </Link>
        <Link to="/legal" className="mobile-legal-action" aria-label="Legal and safety">
          <ShieldAlert size={19} strokeWidth={1.9} aria-hidden="true" />
        </Link>
      </header>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {primaryLinks.map((item) => (
          <NavItem key={item.to} {...item} compact />
        ))}
      </nav>
    </>
  );
}
