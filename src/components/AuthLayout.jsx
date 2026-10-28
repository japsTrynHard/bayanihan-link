import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, BellRing, ShieldCheck } from "lucide-react";
import logoIcon from "../styles/assets/bayanihan-logo-icon.png";
import "../styles/components/LayoutShell.css";

function AuthLayout({ title, subtitle, badge = "Resident Access", footerLinks, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-showcase">
        <Link to="/" className="auth-brand">
          <img src={logoIcon} alt="Bayanihan Link" className="brand-logo-img" />
          <span className="auth-brand-text">
            BAYANIHAN<span>LINK</span>
          </span>
        </Link>

        <div className="auth-showcase-copy">
          <span className="auth-showcase-badge">{badge}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="auth-showcase-list">
          <div className="auth-showcase-item">
            <Briefcase size={18} />
            <span>Maghanap ng trabaho at community opportunities.</span>
          </div>
          <div className="auth-showcase-item">
            <BellRing size={18} />
            <span>Makatanggap ng alerts, updates, at appointment status.</span>
          </div>
          <div className="auth-showcase-item">
            <ShieldCheck size={18} />
            <span>Barangay-based access para mas local at secure ang feed.</span>
          </div>
        </div>

        <div className="auth-showcase-actions">
          <Link to="/" className="auth-inline-link">
            Back to landing <ArrowRight size={16} />
          </Link>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel-inner">
          {children}
          {footerLinks ? <div className="auth-panel-links">{footerLinks}</div> : null}
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
