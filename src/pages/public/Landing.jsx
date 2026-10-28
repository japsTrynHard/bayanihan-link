import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  Briefcase,
  Heart,
  MapPin,
  AlertCircle,
  ArrowRight,
  Check as CheckCircle2,
  BellRing,
  ClipboardCheck,
  MessageCircle,
  Clock3,
} from "lucide-react";
import logoIcon from "../../styles/assets/bayanihan-logo-icon.png";
import "../../styles/pages/Landing.css";

const services = [
  {
    icon: Briefcase,
    className: "jobs",
    title: "Job Matching",
    description: "Mag-post ng hiring, maghanap ng trabaho, o maghanap ng available workers sa barangay.",
  },
  {
    icon: Heart,
    className: "help",
    title: "Community Assistance",
    description: "Humingi ng tulong, mag-abot ng suporta, at makipag-coordinate sa mga residente.",
  },
  {
    icon: MapPin,
    className: "lost",
    title: "Lost & Found",
    description: "I-report ang nawawalang gamit o i-post ang napulot na item para mabilis maibalik.",
  },
  {
    icon: AlertCircle,
    className: "emergency",
    title: "Emergency Reports",
    description: "Mabilis na magsumite ng urgent report at makita ang update mula sa barangay admin.",
  },
  {
    icon: MessageCircle,
    className: "chat",
    title: "Resident Chat",
    description: "Diretsong usapan sa loob ng system para sa coordination at follow-up.",
  },
  {
    icon: Shield,
    className: "admin",
    title: "Barangay Officials Tools",
    description: "Review, response tracking, user management, appointments, reports, at announcements.",
  },
];

const workflow = [
  {
    number: "01",
    title: "Register or sign in",
    description: "Residents and authorized barangay officials sign in through secure assigned accounts.",
  },
  {
    number: "02",
    title: "Choose a service",
    description: "Post jobs, request appointments, send emergency reports, or use lost and found.",
  },
  {
    number: "03",
    title: "Coordinate locally",
    description: "Residents receive notifications, messages, and updates inside the platform.",
  },
  {
    number: "04",
    title: "Admin reviews action",
    description: "Officials process reports, verify concerns, and manage barangay records.",
  },
];

function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <Link to="/" className="landing-brand" aria-label="Bayanihan Link home">
            <img src={logoIcon} alt="Bayanihan Link" />
            <span>BAYANIHAN<strong>LINK</strong></span>
          </Link>

          <nav className="landing-nav" aria-label="Landing navigation">
            <a href="#services">Mga Serbisyo</a>
            <a href="#workflow">Paano Gamitin</a>
            <a href="#access">System Flow</a>
          </nav>

          <div className="landing-header-actions">
            <Link to="/login" className="landing-btn landing-btn--ghost">Login</Link>
            <Link to="/register" className="landing-btn landing-btn--primary">Register</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__image" aria-hidden="true" />
          <div className="landing-container landing-hero__inner">
            <div className="landing-hero__copy">
              <div className="landing-eyebrow">
                <span /> San Miguel, Bulacan Community Platform
              </div>

              <h1>
                Pag-ugnayin ang <br />
                <strong>Iyong Komunidad</strong>
              </h1>

              <p>
                Bayanihan Link is a barangay-centered web system for resident assistance, job matching,
                emergency reporting, appointments, and local admin operations.
              </p>

              <div className="landing-hero__actions">
                <Link to="/register" className="landing-btn landing-btn--primary landing-btn--large">
                  Create Resident Account <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="landing-btn landing-btn--ghost landing-btn--large">
                  Login to Dashboard
                </Link>
              </div>

              <div className="landing-quick-stats" aria-label="System highlights">
                <div>
                  <strong>49</strong>
                  <span>Barangays</span>
                </div>
                <div>
                  <strong>6</strong>
                  <span>Service modules</span>
                </div>
                <div>
                  <strong>1</strong>
                  <span>Unified login</span>
                </div>
              </div>
            </div>

            <aside className="landing-command-card" aria-label="Bayanihan Link preview panel">
              <div className="command-card__top">
                <div>
                  <span className="command-card__label">Barangay Operations</span>
                  <h2>Clean response dashboard</h2>
                </div>
                <div className="command-card__status"><span /> Live-ready</div>
              </div>

              <div className="command-card__grid">
                <div className="command-metric command-metric--urgent">
                  <span>Emergency</span>
                  <strong>Review</strong>
                  <small>Urgent posts and location checks</small>
                </div>
                <div className="command-metric">
                  <span>Appointments</span>
                  <strong>Track</strong>
                  <small>Resident document requests</small>
                </div>
                <div className="command-metric">
                  <span>Reports</span>
                  <strong>Moderate</strong>
                  <small>Posts, chats, and false reports</small>
                </div>
                <div className="command-metric command-metric--safe">
                  <span>Community</span>
                  <strong>Connect</strong>
                  <small>Jobs, lost & found, assistance</small>
                </div>
              </div>

              <div className="command-card__footer">
                <div>
                  <Clock3 size={16} /> Fast status visibility
                </div>
                <div>
                  <BellRing size={16} /> In-app notifications
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="services" className="landing-section landing-section--services">
          <div className="landing-container">
            <div className="landing-section__heading">
              <span className="landing-section-tag">Core Services</span>
              <h2>Ano ang pwede mong gawin dito?</h2>
              <p>Malinis na resident services at barangay operations na nakaayos sa iisang system.</p>
            </div>

            <div className="service-grid">
              {services.map(({ icon: Icon, className, title, description }) => (
                <article key={title} className="service-card">
                  <div className={`service-card__icon service-card__icon--${className}`}>
                    <Icon size={24} />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="landing-section landing-section--workflow">
          <div className="landing-container landing-workflow-layout">
            <div className="landing-section__heading landing-section__heading--sticky">
              <span className="landing-section-tag">Workflow</span>
              <h2>Paano ito gamitin?</h2>
              <p>Simple flow mula account access hanggang barangay response.</p>
            </div>

            <div className="workflow-list">
              {workflow.map((item) => (
                <article key={item.number} className="workflow-card">
                  <span>{item.number}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="access" className="landing-section landing-section--access">
          <div className="landing-container">
            <div className="access-panel">
              <div className="landing-section__heading">
                <span className="landing-section-tag">System Access</span>
                <h2>One login, correct dashboard</h2>
                <p>Residents and barangay officials enter from the same login page, then the system routes them based on account role.</p>
              </div>

              <div className="access-grid">
                <div className="access-card">
                  <ClipboardCheck size={22} />
                  <h3>Resident Registration</h3>
                  <p>First name, last name, email, phone, and barangay selection.</p>
                  <small><CheckCircle2 size={14} /> Creates resident profile and access.</small>
                </div>

                <div className="access-card">
                  <Users size={22} />
                  <h3>Unified Login</h3>
                  <p>One secure login experience for residents and authorized barangay officials.</p>
                  <small><CheckCircle2 size={14} /> Routes to the proper dashboard.</small>
                </div>

                <div className="access-card">
                  <Shield size={22} />
                  <h3>Barangay Officials</h3>
                  <p>Barangay-specific access for official operations.</p>
                  <small><CheckCircle2 size={14} /> Barangay-specific admin operations.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-cta-section">
          <div className="landing-container">
            <div className="landing-cta-card">
              <div>
                <span className="landing-section-tag">Get Started</span>
                <h2>Ready to use Bayanihan Link?</h2>
                <p>Gumawa ng resident account o mag-login para pumasok sa tamang dashboard.</p>
              </div>
              <div className="landing-cta-actions">
                <Link to="/register" className="landing-btn landing-btn--primary">Create Account</Link>
                <Link to="/login" className="landing-btn landing-btn--ghost">Open Login</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <img src={logoIcon} alt="Bayanihan Link" />
          <div>
            <strong>BAYANIHAN LINK</strong>
            <span>Community Assistance & Service Request</span>
          </div>
        </div>
        <p>© 2026 Para sa San Miguel, Bulacan. By Japle Ligaya.</p>
      </footer>
    </div>
  );
}

export default Landing;
