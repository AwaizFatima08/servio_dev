// web/src/pages/admin/TeabarSharedHistoryPage.jsx
// Tea Bar — Shared History — Screen 6
// Role: manager | admin | super_admin (Manager added 09-Jul-2026 — a real
// gap, not a deliberate exclusion, confirmed against the access matrix).
// Path: /teabar-history
//
// READ-ONLY, no pagination (backend always returns the full filtered set —
// no cursor exists). Three filters, mutually exclusive by design — Day
// wins outright, then Employee Number, then Location — matching the
// backend's own precedence, verified live before this page was built.
// No "include cancelled" toggle — the backend never excludes cancelled
// orders in the first place, unlike café's history endpoint.

import { useState, useEffect, useCallback } from 'react';
import { getTeabarAdminHistory } from '../../services/teabarOrderService';
import { listTeabarLocations } from '../../services/teabarLocationService';
import styles from './TeabarSharedHistoryPage.module.css';

const SOURCE_LABELS = { self: 'Self', proxy: 'Proxy', official: 'Official' };
const ISSUE_LABELS = { pending: 'Pending pickup', issued: 'Handed over' };
const APPROVAL_LABELS = {
  pending_approval: 'Approval pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function fmtCreatedAt(createdAt) {
  if (!createdAt) return '—';
  const d = createdAt._seconds != null ? new Date(createdAt._seconds * 1000) : new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function TeabarSharedHistoryPage({ token }) {
  const [locations, setLocations] = useState([]);

  // Filter drafts — read into a request only on Apply, same "no per-
  // keystroke reload" rule café's history page already follows.
  const [filters, setFilters] = useState({ locationId: '', day: '', employeeNumber: '' });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const locs = await listTeabarLocations(token);
        setLocations(locs);
      } catch (e) {
        // Non-fatal — the location dropdown just stays empty; the rest of
        // the page still works without it.
      }
    })();
  }, [token]);

  const load = useCallback(async (activeFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await getTeabarAdminHistory(token, activeFilters);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load({}); }, [load]);

  const onApply = () => {
    // Precedence enforced client-side too, so the filter bar's own state
    // never implies two filters are simultaneously active.
    if (filters.day) load({ day: filters.day });
    else if (filters.employeeNumber.trim()) load({ employeeNumber: filters.employeeNumber.trim().toUpperCase() });
    else if (filters.locationId) load({ locationId: filters.locationId });
    else load({});
  };

  const onClear = () => {
    setFilters({ locationId: '', day: '', employeeNumber: '' });
    load({});
  };

  const groups = result?.groups || [];
  const windowLabel = result?.day
    ? result.day
    : result?.employeeNumber
      ? `for ${result.employeeNumber}`
      : result?.locationId
        ? locations.find((l) => l.locationId === result.locationId)?.locationName || 'selected location'
        : 'last 30 days · all locations';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tea Bar History</h1>
          <p className={styles.subtitle}>
            {windowLabel}{groups.length > 0 && ` · ${groups.length} order${groups.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={() => load(
          filters.day ? { day: filters.day }
          : filters.employeeNumber.trim() ? { employeeNumber: filters.employeeNumber.trim().toUpperCase() }
          : filters.locationId ? { locationId: filters.locationId }
          : {}
        )} disabled={loading}>
          <i className="ti ti-refresh" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Location</label>
          <select
            className={styles.filterInput}
            value={filters.locationId}
            onChange={(e) => setFilters({ locationId: e.target.value, day: '', employeeNumber: '' })}
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.locationId} value={l.locationId}>{l.locationName}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Day</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.day}
            onChange={(e) => setFilters({ locationId: '', day: e.target.value, employeeNumber: '' })}
          />
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Employee number</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="e.g. FFL00002"
            value={filters.employeeNumber}
            onChange={(e) => setFilters({ locationId: '', day: '', employeeNumber: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') onApply(); }}
          />
        </div>

        <div className={styles.filterActions}>
          <button className={styles.applyBtn} onClick={onApply} disabled={loading}>
            <i className="ti ti-filter" /> Apply
          </button>
          <button className={styles.clearBtn} onClick={onClear} disabled={loading}>
            Clear
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}><i className="ti ti-alert-circle" /> {error}</div>}

      {loading && groups.length === 0 ? (
        <div className={styles.loading}>Loading history…</div>
      ) : groups.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-history-off" />
          <p>No Tea Bar orders for this filter.</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {groups.map((g) => {
            const isOfficial = g.bookingSource === 'official';
            return (
              <div key={g.bookingGroupId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.sourceBadge}>{SOURCE_LABELS[g.bookingSource] || g.bookingSource}</span>
                  <span className={styles.createdCell}>{fmtCreatedAt(g.createdAt)}</span>
                </div>

                <div className={styles.consumerLine}>
                  <i className="ti ti-user" /> {g.employeeName} <span className={styles.viaEmp}>· {g.employeeNumber}</span>
                </div>

                <div className={styles.lines}>
                  {g.items.map((it) => (
                    <div key={it.orderId} className={styles.line}>
                      <span className={styles.lineName}>{it.itemName}</span>
                      <span className={styles.lineQty}>×{it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Location</span>
                    <span className={styles.metaValue}>{g.locationName}</span>
                  </div>
                  {isOfficial && (
                    <>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Sponsor</span>
                        <span className={styles.metaValue}>{g.sponsoringEmployeeName} · {g.sponsoringEmployeeNumber}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Cost centre</span>
                        <span className={styles.metaValue}>{g.costCentreCode || '—'}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.pillRow}>
                  <span className={`${styles.statusPill} ${styles[`status_${g.orderStatus}`] || ''}`}>
                    {g.orderStatus === 'cancelled' ? 'Cancelled' : 'Placed'}
                  </span>
                  {g.orderStatus !== 'cancelled' && (
                    <span className={`${styles.issuePill} ${styles[`issue_${g.issueStatus}`] || ''}`}>
                      {ISSUE_LABELS[g.issueStatus] || g.issueStatus}
                    </span>
                  )}
                  {isOfficial && g.approvalStatus !== 'not_applicable' && (
                    <span className={`${styles.approvalPill} ${styles[`approval_${g.approvalStatus}`] || ''}`}>
                      {APPROVAL_LABELS[g.approvalStatus] || g.approvalStatus}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}