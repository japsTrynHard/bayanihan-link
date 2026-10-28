import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  ListChecks,
  MapPin,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { buildBarangayAnalytics } from "../../utils/communityAnalytics";
import {
  buildAdvancedAnalytics,
  exportAnalyticsAsCSV,
} from "../../services/analyticsService";
import {
  buildGoogleMapsSearchUrl,
  getLocationConfidence,
  getRecordLocationLabel,
} from "../../utils/locationApi";
import "../../styles/pages/Dashboard.css";
import "../../styles/pages/AdminAnalytics.css";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

const toArray = (value) => (Array.isArray(value) ? value : []);

const safeDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const firebaseDate = value.toDate();
    return Number.isNaN(firebaseDate.getTime()) ? null : firebaseDate;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getRecordDate = (record = {}) =>
  safeDate(
    record.createdAt ||
      record.createdAtIso ||
      record.timestamp ||
      record.requestedAtIso ||
      record.requestedDate ||
      record.updatedAt ||
      record.updatedAtIso ||
      record.date,
  );

const isWithinDays = (record, days) => {
  const date = getRecordDate(record);
  if (!date) return false;

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (Number(days) - 1));
  return date >= startDate;
};

const formatDate = (record) => {
  const date = getRecordDate(record);
  if (!date) return "No date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatHours = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "No data yet";
  if (value < 1) return `${Math.max(Math.round(value * 60), 1)} min`;
  return `${value.toFixed(1)} hr`;
};

const formatTrend = (value) => {
  if (!Number.isFinite(value) || value === 0) return "No change";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
};

const getTrendVariant = (value) => {
  if (!Number.isFinite(value) || value === 0) return "secondary";
  return value > 0 ? "warning" : "success";
};

const getTrendText = (value) => {
  if (!Number.isFinite(value) || value === 0) return "same as previous period";
  return value > 0 ? "more than previous period" : "less than previous period";
};

const getRecordKind = (record = {}) => {
  if (record.analyticsKind) return record.analyticsKind;
  if (record.emergencyType || record.severity) return "Emergency";
  if (record.serviceType || record.requestedDate) return "Appointment";
  if (record.reason || record.targetType) return "Report";
  if (record.type === "job") return "Job Post";
  return "Community Post";
};

const getRecordTitle = (record = {}) =>
  record.title ||
  record.serviceType ||
  record.emergencyType ||
  record.category ||
  record.reason ||
  record.description ||
  "Community record";

const getStatusVariant = (status = "") => {
  if (["Resolved", "Completed", "Approved", "Active"].includes(status)) {
    return "success";
  }
  if (["Pending", "Under Review", "Rescheduled", "Missing Requirements"].includes(status)) {
    return "warning";
  }
  if (["Rejected", "Declined", "Suspended", "False Report"].includes(status)) {
    return "danger";
  }
  return "secondary";
};

const getNextStep = (record = {}) => {
  const kind = getRecordKind(record);
  const status = record.status || "Pending";

  if (kind === "Emergency") {
    return status === "Resolved" ? "Already resolved" : "Check details and update response status";
  }
  if (kind === "Appointment") {
    return "Approve, reschedule, or mark completed";
  }
  if (kind === "Report") {
    return "Review reported content and apply action if needed";
  }
  return "Review activity if follow-up is needed";
};

const getRecordPath = (record = {}) => {
  const kind = getRecordKind(record);
  if (kind === "Emergency") return "/admin/emergencies";
  if (kind === "Appointment") return "/admin/appointments";
  if (kind === "Report") return "/admin/reports";
  return "/admin/dashboard";
};

function TrendBadge({ value }) {
  const TrendIcon = value > 0 ? TrendingUp : TrendingDown;

  return (
    <span className={`analytics-trend-badge analytics-trend-badge--${getTrendVariant(value)}`}>
      <TrendIcon size={14} />
      {formatTrend(value)}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, note, trend, variant = "default" }) {
  return (
    <Card elevated className={`analytics-summary-card analytics-summary-card--${variant}`}>
      <CardContent>
        <div className="analytics-summary-card__top">
          <div className="analytics-summary-card__icon">
            <Icon size={21} />
          </div>
          {trend !== undefined ? <TrendBadge value={trend} /> : null}
        </div>
        <strong className="analytics-summary-card__value">{value}</strong>
        <span className="analytics-summary-card__label">{label}</span>
        {note ? <small className="analytics-summary-card__note">{note}</small> : null}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, badge }) {
  return (
    <div className="analytics-section-header">
      <div className="analytics-section-header__title">
        {Icon ? <Icon size={20} /> : null}
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {badge ? <div>{badge}</div> : null}
    </div>
  );
}

function PriorityList({ items }) {
  return (
    <div className="analytics-priority-list">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="analytics-priority-item">
            <div className={`analytics-priority-item__icon analytics-priority-item__icon--${item.variant}`}>
              <Icon size={18} />
            </div>
            <div className="analytics-priority-item__content">
              <strong>{item.label}</strong>
              <span>{item.help}</span>
            </div>
            <Badge variant={item.variant}>{item.count}</Badge>
            <Link to={item.href} className="analytics-text-link">
              Open
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function GuideList() {
  const labels = [
    {
      term: "Needs action",
      meaning: "May pending emergency, appointment, or report that barangay staff should review.",
      variant: "danger",
    },
    {
      term: "Pending",
      meaning: "Waiting for approval, review, or follow-up from the barangay office.",
      variant: "warning",
    },
    {
      term: "Resolved / Completed",
      meaning: "Already handled. Keep it for record tracking.",
      variant: "success",
    },
    {
      term: "Location ready",
      meaning: "The record has enough location details to open in Google Maps search.",
      variant: "secondary",
    },
  ];

  return (
    <div className="analytics-guide-list">
      {labels.map((item) => (
        <div key={item.term} className="analytics-guide-item">
          <Badge variant={item.variant}>{item.term}</Badge>
          <span>{item.meaning}</span>
        </div>
      ))}
    </div>
  );
}

function PerformanceGrid({ metrics }) {
  return (
    <div className="analytics-performance-grid">
      {metrics.map((metric) => (
        <div key={metric.label} className="analytics-performance-item">
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.note}</small>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ title, subtitle, data = [], trend }) {
  const safeData = toArray(data);
  const total = safeData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  if (!safeData.length) {
    return (
      <Card elevated className="analytics-chart-card">
        <CardContent>
          <SectionHeader icon={BarChart3} title={title} subtitle={subtitle} />
          <p className="analytics-empty-state">No records found for this period.</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...safeData.map((item) => Number(item.value) || 0), 1);
  const lastIndex = Math.max(safeData.length - 1, 1);
  const points = safeData
    .map((item, index) => {
      const x = safeData.length === 1 ? 50 : (index / lastIndex) * 100;
      const y = 100 - ((Number(item.value) || 0) / maxValue) * 88;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card elevated className="analytics-chart-card">
      <CardContent>
        <SectionHeader
          icon={BarChart3}
          title={title}
          subtitle={subtitle}
          badge={<TrendBadge value={trend} />}
        />
        <div className="analytics-chart-card__total">
          <strong>{total}</strong>
          <span>{getTrendText(trend)}</span>
        </div>
        <div className="analytics-chart" role="img" aria-label={`${title} trend chart`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {[20, 45, 70, 95].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} vectorEffect="non-scaling-stroke" />
            ))}
            <polyline points={points} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="analytics-chart__labels">
          <span>{safeData[0]?.label || "Start"}</span>
          <span>{safeData[safeData.length - 1]?.label || "Today"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionCard({ title, subtitle, items = [], emptyText }) {
  const safeItems = toArray(items).slice(0, 5);
  const highest = Math.max(...safeItems.map((item) => Number(item.count) || 0), 1);

  return (
    <Card elevated className="analytics-list-card">
      <CardContent>
        <SectionHeader icon={ListChecks} title={title} subtitle={subtitle} />
        <div className="analytics-bar-list">
          {safeItems.length ? (
            safeItems.map((item, index) => (
              <div key={`${item.category || "Unspecified"}-${index}`} className="analytics-bar-item">
                <div className="analytics-bar-item__info">
                  <span>{item.category || "Unspecified"}</span>
                  <strong>{item.count} record{item.count === 1 ? "" : "s"}</strong>
                </div>
                <div className="analytics-bar-item__track">
                  <div style={{ width: `${((Number(item.count) || 0) / highest) * 100}%` }} />
                </div>
                <small>{item.percentage || 0}% of records shown</small>
              </div>
            ))
          ) : (
            <p className="analytics-empty-state">{emptyText}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveResidentsCard({ contributors = [] }) {
  const safeContributors = toArray(contributors);

  return (
    <Card elevated className="analytics-list-card">
      <CardContent>
        <SectionHeader
          icon={Users}
          title="Most active residents"
          subtitle="Residents with the most community posts in the selected period."
        />
        <div className="analytics-resident-list">
          {safeContributors.length ? (
            safeContributors.map((resident, index) => (
              <div key={`${resident.authorId || resident.authorName}-${index}`} className="analytics-resident-item">
                <div className="analytics-resident-item__rank">#{index + 1}</div>
                <div>
                  <strong>{resident.authorName || "Resident"}</strong>
                  <span>{resident.count} post{resident.count === 1 ? "" : "s"}</span>
                </div>
                <Badge variant={resident.status === "active" ? "success" : "warning"}>
                  {resident.status || "active"}
                </Badge>
              </div>
            ))
          ) : (
            <p className="analytics-empty-state">No resident posts found in this period.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FollowUpRecords({ records = [] }) {
  return (
    <Card elevated className="analytics-followup-card">
      <CardContent>
        <SectionHeader
          icon={Clock}
          title="Records that may need follow-up"
          subtitle="Newest pending items are shown first so staff can check what to handle next."
        />
        <div className="analytics-followup-list">
          {records.length ? (
            records.map((record) => (
              <div key={record.analyticsId} className="analytics-followup-item">
                <div className="analytics-followup-item__main">
                  <strong>{getRecordTitle(record)}</strong>
                  <span>{getNextStep(record)}</span>
                  <small>{getRecordKind(record)} • {formatDate(record)}</small>
                </div>
                <Badge variant={getStatusVariant(record.status)}>{record.status || "Pending"}</Badge>
                <Link to={getRecordPath(record)} className="analytics-text-link">
                  Review
                </Link>
              </div>
            ))
          ) : (
            <div className="analytics-success-empty">
              <CheckCircle2 size={20} />
              <span>No pending follow-up records found.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationRecords({ records = [] }) {
  return (
    <Card elevated className="analytics-location-card">
      <CardContent>
        <SectionHeader
          icon={MapPin}
          title="Location guide"
          subtitle="Open map links for records with enough location details. Always verify with the resident before dispatch."
          badge={<Badge variant={records.length ? "success" : "warning"}>{records.length} location ready</Badge>}
        />
        <div className="analytics-location-list">
          {records.length ? (
            records.map((record) => {
              const confidence = getLocationConfidence(record);
              return (
                <div key={`${getRecordKind(record)}-${record.id || record.analyticsId}`} className="analytics-location-item">
                  <div>
                    <strong>{getRecordTitle(record)}</strong>
                    <span>{getRecordKind(record)} • {getRecordLocationLabel(record)}</span>
                    <small>{confidence.label}</small>
                  </div>
                  <a
                    href={buildGoogleMapsSearchUrl(record)}
                    target="_blank"
                    rel="noreferrer"
                    title="Open location in Google Maps"
                    className="analytics-map-link"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              );
            })
          ) : (
            <p className="analytics-empty-state">
              No records with enough location details yet. Ask users to include purok, street, or nearest landmark.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30");
  const selectedDays = Number(timeRange) || 30;
  const {
    users,
    emergencies,
    appointments,
    reports,
    allPosts,
    getVisibleNotifications,
  } = useApp();
  const { user } = useAuth();
  const barangay = user?.barangay || "Assigned Barangay";

  const scopedData = useMemo(() => {
    const scopedUsers = toArray(users).filter(
      (item) => item.role === "resident" && item.barangay === user?.barangay,
    );
    const scopedEmergencies = toArray(emergencies).filter(
      (item) => item.barangay === user?.barangay,
    );
    const scopedAppointments = toArray(appointments).filter(
      (item) => item.barangay === user?.barangay,
    );
    const scopedReports = toArray(reports).filter((item) => (item.handlerBarangay || item.barangay) === user?.barangay);
    const scopedPosts = toArray(allPosts).filter((item) => item.barangay === user?.barangay);
    const scopedNotifications =
      typeof getVisibleNotifications === "function" ? toArray(getVisibleNotifications(user)) : [];

    return {
      users: scopedUsers,
      emergencies: scopedEmergencies,
      appointments: scopedAppointments,
      reports: scopedReports,
      posts: scopedPosts,
      notifications: scopedNotifications,
    };
  }, [users, emergencies, appointments, reports, allPosts, getVisibleNotifications, user]);

  const periodData = useMemo(
    () => ({
      users: scopedData.users,
      emergencies: scopedData.emergencies.filter((item) => isWithinDays(item, selectedDays)),
      appointments: scopedData.appointments.filter((item) => isWithinDays(item, selectedDays)),
      reports: scopedData.reports.filter((item) => isWithinDays(item, selectedDays)),
      posts: scopedData.posts.filter((item) => isWithinDays(item, selectedDays)),
      notifications: scopedData.notifications.filter((item) => isWithinDays(item, selectedDays)),
    }),
    [scopedData, selectedDays],
  );

  const currentAnalytics = useMemo(
    () => buildAdvancedAnalytics(scopedData, { days: selectedDays }),
    [scopedData, selectedDays],
  );
  const periodAnalytics = useMemo(
    () => buildAdvancedAnalytics(periodData, { days: selectedDays }),
    [periodData, selectedDays],
  );
  const basicAnalytics = useMemo(() => buildBarangayAnalytics(scopedData), [scopedData]);

  const followUpRecords = useMemo(() => {
    const emergencyItems = scopedData.emergencies
      .filter((item) => !["Resolved", "False Report", "Cancelled"].includes(item.status))
      .map((item, index) => ({ ...item, analyticsKind: "Emergency", analyticsId: `emergency-${item.id || index}` }));

    const appointmentItems = scopedData.appointments
      .filter((item) => ["Pending", "Rescheduled", "Missing Requirements"].includes(item.status))
      .map((item, index) => ({ ...item, analyticsKind: "Appointment", analyticsId: `appointment-${item.id || index}` }));

    const reportItems = scopedData.reports
      .filter((item) => ["Pending", "Under Review"].includes(item.status))
      .map((item, index) => ({ ...item, analyticsKind: "Report", analyticsId: `report-${item.id || index}` }));

    return [...emergencyItems, ...appointmentItems, ...reportItems]
      .sort((a, b) => (getRecordDate(b)?.getTime() || 0) - (getRecordDate(a)?.getTime() || 0))
      .slice(0, 8);
  }, [scopedData]);

  const mapReadyRecords = useMemo(
    () =>
      [...scopedData.emergencies, ...scopedData.appointments, ...scopedData.posts]
        .filter((item) => getLocationConfidence(item).score >= 25)
        .sort((a, b) => (getRecordDate(b)?.getTime() || 0) - (getRecordDate(a)?.getTime() || 0))
        .slice(0, 8),
    [scopedData],
  );

  const priorityItems = [
    {
      id: "emergencies",
      label: "Emergency reports",
      count: currentAnalytics.summary.unresolvedEmergencies,
      help: currentAnalytics.summary.unresolvedEmergencies
        ? "Needs response or resolution update."
        : "No unresolved emergency right now.",
      variant: currentAnalytics.summary.unresolvedEmergencies ? "danger" : "success",
      href: "/admin/emergencies",
      icon: AlertTriangle,
    },
    {
      id: "appointments",
      label: "Appointment requests",
      count: currentAnalytics.summary.pendingAppointments,
      help: currentAnalytics.summary.pendingAppointments
        ? "Approve, reschedule, or ask for missing requirements."
        : "Appointment queue is clear.",
      variant: currentAnalytics.summary.pendingAppointments ? "warning" : "success",
      href: "/admin/appointments",
      icon: CalendarDays,
    },
    {
      id: "reports",
      label: "Reported posts or chats",
      count: currentAnalytics.summary.pendingReports,
      help: currentAnalytics.summary.pendingReports
        ? "Review reports before they affect residents."
        : "No pending reports to review.",
      variant: currentAnalytics.summary.pendingReports ? "danger" : "success",
      href: "/admin/reports",
      icon: Shield,
    },
  ];

  const handleExportCSV = () => {
    const csv = exportAnalyticsAsCSV({ ...periodAnalytics, growth: currentAnalytics.growth }, barangay);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barangay-activity-${barangay}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const selectedRangeLabel = RANGE_OPTIONS.find((item) => item.value === timeRange)?.label || "Selected period";

  return (
    <AdminLayout
      title="Barangay Activity Summary"
      subtitle={`${barangay} reports, appointments, posts, and resident activity in one clear view.`}
      actions={
        <div className="analytics-actions">
          <label className="analytics-range-select">
            <span>Show</span>
            <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={handleExportCSV} variant="secondary">
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="analytics-page">
        <section className="analytics-summary-grid" aria-label="Barangay summary cards">
          <SummaryCard
            icon={AlertTriangle}
            label="Emergency reports needing action"
            value={currentAnalytics.summary.unresolvedEmergencies}
            note="Respond or mark as resolved after action"
            variant={currentAnalytics.summary.unresolvedEmergencies ? "danger" : "success"}
          />
          <SummaryCard
            icon={CalendarDays}
            label="Appointment requests pending"
            value={currentAnalytics.summary.pendingAppointments}
            note="Waiting for approval, reschedule, or completion"
            variant={currentAnalytics.summary.pendingAppointments ? "warning" : "success"}
          />
          <SummaryCard
            icon={Shield}
            label="Reports to review"
            value={currentAnalytics.summary.pendingReports}
            note="Reported posts, chats, or users"
            variant={currentAnalytics.summary.pendingReports ? "danger" : "success"}
          />
          <SummaryCard
            icon={Users}
            label="Active residents"
            value={`${currentAnalytics.summary.activeUsers}/${currentAnalytics.summary.totalUsers}`}
            note="Not suspended accounts in this barangay"
          />
          <SummaryCard
            icon={Activity}
            label={`Community posts (${selectedRangeLabel.toLowerCase()})`}
            value={periodAnalytics.summary.postsInPeriod}
            trend={currentAnalytics.growth.posts.periodChange}
            note="Posts created during selected period"
          />
          <SummaryCard
            icon={ListChecks}
            label="Barangay workload"
            value={basicAnalytics.health.label}
            note={`${basicAnalytics.metrics.workloadScore}% workload based on pending items`}
            variant={basicAnalytics.health.variant}
          />
        </section>

        <section className="analytics-two-column">
          <Card elevated className="analytics-attention-card">
            <CardContent>
              <SectionHeader
                icon={ListChecks}
                title="What to check first"
                subtitle="Start here before reviewing charts. These are the items that need actual barangay action."
                badge={<Badge variant={basicAnalytics.health.variant}>{basicAnalytics.health.label}</Badge>}
              />
              <div className="analytics-note-box">
                <HelpCircle size={18} />
                <p>{basicAnalytics.health.recommendation}</p>
              </div>
              <PriorityList items={priorityItems} />
            </CardContent>
          </Card>

          <Card elevated className="analytics-guide-card">
            <CardContent>
              <SectionHeader
                icon={FileText}
                title="Label guide"
                subtitle="Simple meaning of labels used on this page."
              />
              <GuideList />
            </CardContent>
          </Card>
        </section>

        <Card elevated className="analytics-performance-card">
          <CardContent>
            <SectionHeader
              icon={Clock}
              title="Response and processing"
              subtitle="These help staff see if requests are being handled quickly."
            />
            <PerformanceGrid
              metrics={[
                {
                  label: "Average emergency response",
                  value: formatHours(periodAnalytics.performance.emergencyResponse.average),
                  note: "Based on resolved/responded emergency records",
                },
                {
                  label: "Emergencies resolved",
                  value: `${periodAnalytics.performance.emergencyResponse.resolutionRate}%`,
                  note: "Resolved out of emergency reports shown",
                },
                {
                  label: "Appointments approved/completed",
                  value: `${periodAnalytics.performance.appointmentResponse.approvalRate}%`,
                  note: "Approved or completed requests shown",
                },
                {
                  label: "Reports closed",
                  value: `${periodAnalytics.performance.reportMetrics.closureRate}%`,
                  note: `${periodAnalytics.performance.reportMetrics.pendingCount} report(s) still pending`,
                },
              ]}
            />
          </CardContent>
        </Card>

        <section className="analytics-chart-grid">
          <TrendChart
            title="Emergency reports"
            subtitle={selectedRangeLabel}
            data={periodAnalytics.trends.emergencies}
            trend={currentAnalytics.growth.emergencies.periodChange}
          />
          <TrendChart
            title="Appointment requests"
            subtitle={selectedRangeLabel}
            data={periodAnalytics.trends.appointments}
            trend={currentAnalytics.growth.appointments.periodChange}
          />
          <TrendChart
            title="Community posts"
            subtitle={selectedRangeLabel}
            data={periodAnalytics.trends.posts}
            trend={currentAnalytics.growth.posts.periodChange}
          />
        </section>

        <section className="analytics-three-column">
          <DistributionCard
            title="Common emergency types"
            subtitle="Helps identify repeated emergency concerns."
            items={periodAnalytics.distribution.emergencies}
            emptyText="No emergency records found in this period."
          />
          <DistributionCard
            title="Most requested services"
            subtitle="Helps prepare forms, staff, and appointment slots."
            items={periodAnalytics.distribution.appointments}
            emptyText="No appointment requests found in this period."
          />
          <ActiveResidentsCard contributors={periodAnalytics.topContributors} />
        </section>

        <section className="analytics-two-column analytics-two-column--wide-left">
          <FollowUpRecords records={followUpRecords} />
          <LocationRecords records={mapReadyRecords} />
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminAnalyticsPage;
