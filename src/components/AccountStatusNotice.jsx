import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, Clock, X } from 'lucide-react';
import { USER_STATUS } from '../utils/storage';
import {
  dismissAccountNotice,
  getAccountNoticeAutoHideMs,
  getAccountNoticeKey,
  shouldShowAccountNotice,
} from '../utils/accountNoticeState';
import { formatSuspensionUntil, getSuspensionRemainingText } from '../utils/accountModeration';

function AccountStatusNotice({ user }) {
  const noticeKey = useMemo(() => getAccountNoticeKey(user), [user]);
  const [visible, setVisible] = useState(() => shouldShowAccountNotice(user));

  useEffect(() => {
    setVisible(shouldShowAccountNotice(user));
  }, [noticeKey, user]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setTimeout(() => {
      dismissAccountNotice(user);
      setVisible(false);
    }, getAccountNoticeAutoHideMs(user));
    return () => window.clearTimeout(timer);
  }, [visible, noticeKey, user]);

  if (!visible) return null;

  const isSuspended = user?.status === USER_STATUS.SUSPENDED;
  const title = isSuspended ? 'Account suspension active' : 'Account warning received';
  const message = isSuspended
    ? user?.statusReason || 'Some resident actions are temporarily restricted after barangay moderation review.'
    : user?.statusReason || 'Please follow barangay posting, chat, and reporting guidelines.';

  const handleDismiss = () => {
    dismissAccountNotice(user);
    setVisible(false);
  };

  return (
    <div
      className={`account-status-toast ${isSuspended ? 'account-status-toast--suspended' : 'account-status-toast--warned'}`}
      role={isSuspended ? 'alert' : 'status'}
    >
      <AlertTriangle size={20} />
      <div className="account-status-toast__body">
        <div className="account-status-toast__title-row">
          <strong>{title}</strong>
          {isSuspended ? (
            <span className="account-status-toast__timer"><Clock size={13} /> {getSuspensionRemainingText(user?.suspensionEndsAt)}</span>
          ) : null}
        </div>
        <p>{message}</p>
        {isSuspended ? <small>Restricted {formatSuspensionUntil(user?.suspensionEndsAt)}. Blocked feature details are in your Profile.</small> : null}
        <div className="account-status-toast__actions">
          <Link to="/notifications"><Bell size={14} /> Notifications</Link>
          <Link to="/profile">View profile details</Link>
        </div>
      </div>
      <button type="button" className="account-status-toast__close" onClick={handleDismiss} aria-label="Dismiss account notice">
        <X size={17} />
      </button>
    </div>
  );
}

export default AccountStatusNotice;
