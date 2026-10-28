import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import AdminLayout from "../../components/AdminLayout";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { USER_STATUS } from "../../utils/storage";
import {
  WARNING_SEVERITY_OPTIONS,
  formatSuspensionUntil,
  getSuspensionRemainingText,
  getWarningExpiryText,
} from "../../utils/accountModeration";
import {
  getWarningDurationForSeverity,
  getWarningPolicy,
  setWarningPolicy,
} from "../../utils/warningPolicy";
import "../../styles/pages/UserManagement.css";

const STATUS_FILTERS = [
  { key: "all", label: "All Accounts" },
  { key: USER_STATUS.ACTIVE, label: "Active" },
  { key: USER_STATUS.WARNED, label: "Warned" },
  { key: USER_STATUS.SUSPENDED, label: "Suspended" },
];

const SUSPENSION_SEVERITY_OPTIONS = [
  {
    value: "minor",
    label: "Minor issue",
    days: 1,
    description: "Light violation / reminder only.",
  },
  {
    value: "moderate",
    label: "Moderate issue",
    days: 3,
    description: "Repeated rule break or verified concern.",
  },
  {
    value: "serious",
    label: "Serious issue",
    days: 7,
    description: "Harmful behavior or serious verified report.",
  },
  {
    value: "critical",
    label: "Critical issue",
    days: 30,
    description:
      "High-risk abuse, fake emergency, or repeated serious reports.",
  },
  {
    value: "indefinite",
    label: "Indefinite",
    days: 0,
    description: "Until admin manually restores the account.",
  },
];

const statusVariant = (status) => {
  if (status === USER_STATUS.SUSPENDED) return "danger";
  if (status === USER_STATUS.WARNED) return "warning";
  return "success";
};

const defaultReason = (actionType, severityLabel = "") => {
  if (actionType === "warn")
    return "Please follow barangay posting, chat, and reporting guidelines.";
  if (actionType === "remove_warning")
    return "Warning removed after barangay admin review.";
  if (actionType === "restore") return "Account restored by barangay admin.";
  return severityLabel
    ? `Account suspended due to ${severityLabel.toLowerCase()} after moderation review.`
    : "Account suspended due to moderation review.";
};

function UserManagementPage() {
  const { users, warnUser, suspendUser, activateUser, removeUserWarning } =
    useApp();
  const { user } = useAuth();
  const initialSearch = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  }, []);
  const emergencyReviewMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      new URLSearchParams(window.location.search).get("review") ===
      "false-report"
    );
  }, []);

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm] = useState({
    severity: "moderate",
    durationDays: 3,
    durationHours: 24,
    reason: "",
  });
  const [flash, setFlash] = useState(null);
  const [warningPolicy, setWarningPolicyState] = useState(() =>
    getWarningPolicy(),
  );
  // FORCE REFRESH TRICK: nag-i-increment ito para i-recompute ang residents kahit hindi nag-update ang users state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const refreshPolicy = () => setWarningPolicyState(getWarningPolicy());
    window.addEventListener("warning-policy-refresh", refreshPolicy);
    return () =>
      window.removeEventListener("warning-policy-refresh", refreshPolicy);
  }, []);

  const barangayResidents = useMemo(
    () =>
      users.filter(
        (resident) =>
          resident.role === "resident" && resident.barangay === user?.barangay,
      ),
    [users, user?.barangay, refreshTrigger],
  ); // added refreshTrigger dependency

  const counts = useMemo(() => {
    const base = {
      all: barangayResidents.length,
      [USER_STATUS.ACTIVE]: 0,
      [USER_STATUS.WARNED]: 0,
      [USER_STATUS.SUSPENDED]: 0,
    };

    barangayResidents.forEach((resident) => {
      const status = resident.status || USER_STATUS.ACTIVE;
      base[status] = (base[status] || 0) + 1;
    });

    return base;
  }, [barangayResidents]);

  const residents = useMemo(() => {
    const query = search.toLowerCase();
    return barangayResidents
      .filter((resident) => {
        const status = resident.status || USER_STATUS.ACTIVE;
        const matchesStatus = statusFilter === "all" || status === statusFilter;
        const matchesSearch =
          !query ||
          resident.name?.toLowerCase().includes(query) ||
          resident.email?.toLowerCase().includes(query) ||
          resident.barangay?.toLowerCase().includes(query) ||
          resident.statusReason?.toLowerCase().includes(query) ||
          String(resident.id || "")
            .toLowerCase()
            .includes(query) ||
          String(resident.uid || "")
            .toLowerCase()
            .includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const rank = {
          [USER_STATUS.SUSPENDED]: 0,
          [USER_STATUS.WARNED]: 1,
          [USER_STATUS.ACTIVE]: 2,
        };
        const statusA = rank[a.status || USER_STATUS.ACTIVE] ?? 3;
        const statusB = rank[b.status || USER_STATUS.ACTIVE] ?? 3;
        if (statusA !== statusB) return statusA - statusB;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [barangayResidents, search, statusFilter]);

  const openAction = (resident, type) => {
    const defaultSeverity =
      type === "suspend"
        ? SUSPENSION_SEVERITY_OPTIONS[1]
        : WARNING_SEVERITY_OPTIONS[0];
    const defaultWarningHours =
      type === "warn"
        ? getWarningDurationForSeverity(defaultSeverity.value)
        : defaultSeverity.hours || 24;
    setActionModal({ resident, type });
    setActionForm({
      severity: defaultSeverity.value,
      durationDays: defaultSeverity.days || 3,
      durationHours: defaultWarningHours,
      reason: defaultReason(type, defaultSeverity.label),
    });
  };

  const handleSeverityChange = (e) => {
    const options =
      actionModal?.type === "warn"
        ? WARNING_SEVERITY_OPTIONS
        : SUSPENSION_SEVERITY_OPTIONS;
    const severity =
      options.find((item) => item.value === e.target.value) || options[0];
    setActionForm((current) => ({
      ...current,
      severity: severity.value,
      durationDays: severity.days ?? current.durationDays,
      durationHours:
        actionModal?.type === "warn"
          ? getWarningDurationForSeverity(severity.value)
          : (severity.hours ?? current.durationHours),
      reason:
        current.reason || defaultReason(actionModal?.type, severity.label),
    }));
  };

  const closeAction = () => {
    setActionModal(null);
    setActionForm({
      severity: "moderate",
      durationDays: 3,
      durationHours: 24,
      reason: "",
    });
  };

  const showFlash = (type, message) => {
    setFlash({ type, message });
    window.setTimeout(() => setFlash(null), 3500);
  };

  const handlePolicyChange = (severity, value) => {
    const hours = Number(value);
    setWarningPolicyState((current) => ({
      ...current,
      [severity]:
        Number.isFinite(hours) && hours > 0 ? hours : current[severity],
    }));
  };

  const handleSaveWarningPolicy = () => {
    const saved = setWarningPolicy(warningPolicy);
    setWarningPolicyState(saved);
    showFlash("success", "Warning duration settings saved.");
  };

  const handleSubmitAction = (e) => {
    e.preventDefault();
    if (!actionModal?.resident) return;

    const reason = actionForm.reason.trim();
    let result = null;

    if (actionModal.type === "warn") {
      result = warnUser(
        actionModal.resident.id ||
          actionModal.resident.uid ||
          actionModal.resident.email,
        reason,
        user,
        {
          severity: actionForm.severity,
          durationHours: Number(actionForm.durationHours || 24),
        },
      );
    }

    if (actionModal.type === "remove_warning") {
      result = removeUserWarning(
        actionModal.resident.id ||
          actionModal.resident.uid ||
          actionModal.resident.email,
        reason || "Warning removed by barangay admin.",
        user,
      );
    }

    if (actionModal.type === "suspend") {
      result = suspendUser(
        actionModal.resident.id ||
          actionModal.resident.uid ||
          actionModal.resident.email,
        reason,
        user,
        {
          severity: actionForm.severity,
          durationDays: Number(actionForm.durationDays || 0),
        },
      );
    }

    if (actionModal.type === "restore") {
      result = activateUser(
        actionModal.resident.id ||
          actionModal.resident.uid ||
          actionModal.resident.email,
        reason || "Account restored by barangay admin.",
        user,
      );

      // 🔁 FORCE REFRESH: kung matagumpay ang restore, pilitin ang UI na mag-recompute ng residents
      if (result) {
        // Maghintay ng 100ms para mag-update ang context, pagkatapos i-trigger ang refresh
        setTimeout(() => {
          setRefreshTrigger((prev) => prev + 1);
        }, 100);
      }
    }

    if (!result) {
      showFlash(
        "error",
        "Action was not completed. Check barangay scope or account record, then try again.",
      );
      return;
    }

    const actionLabel =
      actionModal.type === "warn"
        ? "warning sent"
        : actionModal.type === "remove_warning"
          ? "warning removed"
          : actionModal.type === "restore"
            ? "account restored"
            : "account suspended";

    showFlash(
      "success",
      `${actionModal.resident.name || "Resident"} ${actionLabel} successfully.`,
    );
    closeAction();
  };

  const actionTitle =
    actionModal?.type === "warn"
      ? "Warn Resident"
      : actionModal?.type === "remove_warning"
        ? "Remove Warning"
        : actionModal?.type === "restore"
          ? "Restore Account"
          : "Suspend Resident";

  return (
    <AdminLayout
      title="User Management"
      subtitle="Monitor registered residents, warnings, suspensions, and barangay-based account restrictions."
    >
      {flash ? (
        <div className={`admin-flash admin-flash--${flash.type}`} role="status">
          {flash.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{flash.message}</span>
        </div>
      ) : null}

      {emergencyReviewMode ? (
        <div className="admin-flash admin-flash--warning" role="status">
          <ShieldAlert size={18} />
          <span>
            False report review: check the resident record, warning history, and
            evidence before issuing a warning or suspension.
          </span>
        </div>
      ) : null}

      <Card elevated className="warning-policy-card">
        <CardContent>
          <div className="toolbar-row" style={{ marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>
                Warning duration settings
              </h3>
              <p style={{ marginBottom: 0, color: "var(--foreground-muted)" }}>
                Admins can adjust the duration per warning before sending it.
              </p>
            </div>
            <Badge variant="warning">Auto-expiring</Badge>
          </div>
          <div className="warning-policy-grid warning-policy-grid--editable">
            {WARNING_SEVERITY_OPTIONS.filter(
              (item) => item.value !== "custom",
            ).map((item) => (
              <label key={item.value} className="warning-policy-input">
                <span>{item.label}</span>
                <input
                  type="number"
                  min="1"
                  value={warningPolicy[item.value] || item.hours || 24}
                  onChange={(event) =>
                    handlePolicyChange(item.value, event.target.value)
                  }
                />
                <small>hours</small>
              </label>
            ))}
          </div>
          <div className="policy-save-row">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveWarningPolicy}
            >
              Save Warning Settings
            </Button>
            <small>
              These durations are used as defaults when issuing warnings.
            </small>
          </div>
        </CardContent>
      </Card>

      <div className="user-status-overview">
        <Card elevated className="user-status-card">
          <CardContent>
            <span>
              <Users size={16} /> All
            </span>
            <strong>{counts.all}</strong>
          </CardContent>
        </Card>
        <Card elevated className="user-status-card">
          <CardContent>
            <span>
              <CheckCircle2 size={16} /> Active
            </span>
            <strong>{counts[USER_STATUS.ACTIVE] || 0}</strong>
          </CardContent>
        </Card>
        <Card elevated className="user-status-card">
          <CardContent>
            <span>
              <AlertTriangle size={16} /> Warned
            </span>
            <strong>{counts[USER_STATUS.WARNED] || 0}</strong>
          </CardContent>
        </Card>
        <Card elevated className="user-status-card danger">
          <CardContent>
            <span>
              <ShieldAlert size={16} /> Suspended
            </span>
            <strong>{counts[USER_STATUS.SUSPENDED] || 0}</strong>
          </CardContent>
        </Card>
      </div>

      <div className="toolbar-row user-management-toolbar">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
          placeholder="Search resident, email, barangay, or reason"
        />
        <div
          className="user-filter-tabs"
          role="tablist"
          aria-label="User status filters"
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={statusFilter === filter.key ? "active" : ""}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
              <span>{counts[filter.key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <Card elevated>
        <CardContent>
          <div className="data-table-wrap">
            <table className="data-table user-management-table">
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Barangay</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Warnings</th>
                  <th>Suspension</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {residents.length > 0 ? (
                  residents.map((resident) => {
                    const status = resident.status || USER_STATUS.ACTIVE;
                    return (
                      <tr key={resident.id || resident.uid || resident.email}>
                        <td>
                          <strong>{resident.name}</strong>
                          <br />
                          <small>{resident.email}</small>
                          {resident.statusReason &&
                          status !== USER_STATUS.ACTIVE ? (
                            <p className="user-status-reason">
                              {resident.statusReason}
                            </p>
                          ) : null}
                        </td>
                        <td>{resident.barangay}</td>
                        <td>{resident.phone || "No contact saved"}</td>
                        <td>
                          <Badge variant={statusVariant(status)}>
                            {status}
                          </Badge>
                        </td>
                        <td>
                          {status === USER_STATUS.WARNED ? (
                            <div className="suspension-cell">
                              <span>
                                <Clock size={14} />{" "}
                                {getWarningExpiryText(
                                  resident.warningExpiresAt,
                                )}
                              </span>
                              <small>
                                {resident.latestWarning?.severityLabel ||
                                  "Active warning"}
                              </small>
                            </div>
                          ) : (
                            <span>{resident.warnings?.length || 0}</span>
                          )}
                        </td>
                        <td>
                          {status === USER_STATUS.SUSPENDED ? (
                            <div className="suspension-cell">
                              <span>
                                <Clock size={14} />{" "}
                                {getSuspensionRemainingText(
                                  resident.suspensionEndsAt,
                                )}
                              </span>
                              <small>
                                {formatSuspensionUntil(
                                  resident.suspensionEndsAt,
                                )}
                              </small>
                            </div>
                          ) : (
                            <span className="muted-text">
                              No active suspension
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="inline-actions">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAction(resident, "warn")}
                            >
                              Warn
                            </Button>
                            {status === USER_STATUS.WARNED ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  openAction(resident, "remove_warning")
                                }
                              >
                                Remove Warning
                              </Button>
                            ) : null}
                            {status === USER_STATUS.SUSPENDED ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openAction(resident, "restore")}
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openAction(resident, "suspend")}
                              >
                                Suspend
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-table-cell">
                      No resident accounts match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={Boolean(actionModal)}
        onClose={closeAction}
        title={actionTitle}
        subtitle={
          actionModal?.resident
            ? `${actionModal.resident.name} • ${actionModal.resident.email}`
            : ""
        }
        size="md"
      >
        <form onSubmit={handleSubmitAction} className="moderation-action-form">
          {actionModal?.type === "warn" ? (
            <>
              <label>
                Warning Severity
                <select
                  value={actionForm.severity}
                  onChange={handleSeverityChange}
                >
                  {WARNING_SEVERITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label} —{" "}
                      {item.hours ? `${item.hours} hour(s)` : "custom"}
                    </option>
                  ))}
                </select>
                <small>
                  Warnings auto-expire. Admin can still remove them manually.
                </small>
              </label>
              <label>
                Warning Duration in Hours
                <input
                  type="number"
                  min="1"
                  value={actionForm.durationHours}
                  onChange={(e) =>
                    setActionForm((current) => ({
                      ...current,
                      durationHours: e.target.value,
                    }))
                  }
                />
                <small>
                  Example: 12 = within the day, 24 = one day, 72 = three days.
                </small>
              </label>
            </>
          ) : null}

          {actionModal?.type === "suspend" ? (
            <>
              <label>
                Severity
                <select
                  value={actionForm.severity}
                  onChange={handleSeverityChange}
                >
                  {SUSPENSION_SEVERITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label} —{" "}
                      {item.days ? `${item.days} day(s)` : "manual restore"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Suspension Duration in Days
                <input
                  type="number"
                  min="0"
                  value={actionForm.durationDays}
                  onChange={(e) =>
                    setActionForm((current) => ({
                      ...current,
                      durationDays: e.target.value,
                    }))
                  }
                />
                <small>Use 0 for indefinite/manual restore.</small>
              </label>
            </>
          ) : null}

          <label>
            Admin Note / Reason
            <textarea
              rows="4"
              value={actionForm.reason}
              onChange={(e) =>
                setActionForm((current) => ({
                  ...current,
                  reason: e.target.value,
                }))
              }
              placeholder="Explain why this action is being applied."
              required={
                !["restore", "remove_warning"].includes(actionModal?.type)
              }
            />
          </label>

          <div className="modal-action-row">
            <Button type="button" variant="outline" onClick={closeAction}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionModal?.type === "suspend" ? "danger" : "primary"}
            >
              {actionTitle}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

export default UserManagementPage;
