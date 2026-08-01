// web/src/pages/admin/BbqLiveCountsPage.jsx
// Screen #7 — BBQ Live Kitchen Dashboard: cumulative item counts
// Role: bbq_supervisor | manager | admin | super_admin
// Path: /bbq-live-counts
//
// Reads bbqLiveItemStatus (design doc §2.5) — a flat {itemId: {itemName,
// orderedCount, preparedCount}} map with no category info. To group items
// by menu category for display, this screen ALSO fetches the current
// published bbqEvent (same call Screen #6 makes) and builds an
// itemId -> {group, sortOrder} lookup from its 6-array resolved menu.
//
// Decisions confirmed with Homi 01-Aug-2026:
// - Only items that actually appear in itemCounts are shown — this screen
//   does NOT pad the display with the full menu at zero. It's a live
//   counter, not a menu browser.
// - An itemId present in itemCounts but absent from the current event's
//   menu (stale data, or a different event than "current") lands in an
//   "Uncategorized" bucket rather than being silently dropped.
// - preparedCount is treated as 0 whenever missing (confirmed via live
//   curl test — the field is genuinely absent until something has been
//   prepared, not present-and-zero).
// - Same 30s auto-refresh + toggle convention as Screen #6.

import { useState, useEffect, useCallback } from 'react';
import { getCurrentBbqEvent } from '../../services/bbqEventService';
import { getBbqLiveItemStatus } from '../../services/bbqKitchenService';
import styles from './BbqLiveCountsPage.module.css';

const REFRESH_MS = 30000;

// Fixed display order — mirrors bbqOrderService.js's own searchOrder
// convention on the backend, so the two stay conceptually aligned.
const MENU_GROUPS = [
  { key: 'preorderItems', label: 'Preorder' },
  { key: 'liveCookItems', label: 'Live Cook' },
  { key: 'kidsItems',     label: 'Kids' },
  { key: 'beverages',     label: 'Beverages' },
  { key: 'breadItems',    label: 'Bread' },
  { key: 'dessertItems',  label: 'Dessert' },
];

// ── Build itemId -> {group, sortOrder} lookup from the event's menu,
//    then bucket itemCounts into fixed-order groups. Non-empty groups
//    only. ──
function buildGroupedCounts(event, itemCounts) {
  const lookup = {};
  MENU_GROUPS.forEach(({ key, label }) => {
    (event?.menu?.[key] || []).forEach((it) => {
      lookup[it.itemId] = { group: label, sortOrder: it.sortOrder ?? 0 };
    });
  });

  const buckets = {};
  MENU_GROUPS.forEach(({ label }) => { buckets[label] = []; });
  buckets['Uncategorized'] = [];

  Object.entries(itemCounts || {}).forEach(([itemId, counts]) => {
    const info = lookup[itemId];
    const group = info ? info.group : 'Uncategorized';
    const sortOrder = info ? info.sortOrder : 0;
    buckets[group].push({
      itemId,
      itemName: counts.itemName,
      orderedCount: counts.orderedCount || 0,
      preparedCount: counts.preparedCount || 0,
      sortOrder,
    });
  });

  Object.values(buckets).forEach((arr) =>
    arr.sort((a, b) => a.sortOrder - b.sortOrder || a.itemName.localeCompare(b.itemName))
  );

  const orderedLabels = [...MENU_GROUPS.map((g) => g.label), 'Uncategorized'];
  return orderedLabels
    .map((label) => ({ label, items: buckets[label] }))
    .filter((g) => g.items.length > 0);
}

export default function BbqLiveCountsPage({ token }) {
  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [status, setStatus] = useState(null);       // raw { notFound, eventDate, itemCounts, lastAggregatedAt }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadEvent = useCallback(async () => {
    setEventLoading(true);
    setError('');
    try {
      const ev = await getCurrentBbqEvent(token);
      setEvent(ev);
    } catch (err) {
      setError(err.message);
    } finally {
      setEventLoading(false);
    }
  }, [token]);

  const loadCounts = useCallback(async (eventDate) => {
    setError('');
    try {
      const data = await getBbqLiveItemStatus(token, eventDate);
      setStatus(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  useEffect(() => {
    if (event?.eventDate) {
      setLoading(true);
      loadCounts(event.eventDate);
    } else if (!eventLoading) {
      setLoading(false);
    }
  }, [event, eventLoading, loadCounts]);

  useEffect(() => {
    if (!autoRefresh || !event?.eventDate) return;
    const id = setInterval(() => loadCounts(event.eventDate), REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, event, loadCounts]);

  const manualRefresh = () => {
    if (event?.eventDate) {
      setLoading(true);
      loadCounts(event.eventDate);
    }
  };

  const groups = event ? buildGroupedCounts(event, status?.itemCounts) : [];
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>BBQ Live Item Counts</h1>
          <p className={styles.subtitle}>
            {eventLoading
              ? 'Loading event…'
              : event
                ? `${event.eventDate}${totalItems > 0 ? ` · ${totalItems} item${totalItems === 1 ? '' : 's'} moving` : ''}`
                : 'No published BBQ event currently.'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <label className={styles.autoLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button className={styles.refreshBtn} onClick={manualRefresh} disabled={loading || !event}>
            <i className="ti ti-refresh" />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {eventLoading || (loading && !status) ? (
        <div className={styles.detailLoading}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      ) : !event ? (
        <div className={styles.emptyState}>
          <i className="ti ti-calendar-off" />
          <p>No published BBQ event right now. Check back closer to Friday.</p>
        </div>
      ) : totalItems === 0 ? (
        <div className={styles.emptyState}>
          <i className="ti ti-chart-bar-off" />
          <p>No orders yet for {event.eventDate}.</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} className={styles.groupSection}>
            <h2 className={styles.groupTitle}>{group.label}</h2>
            <div className={styles.itemGrid}>
              {group.items.map((it) => (
                <div key={it.itemId} className={styles.itemCard}>
                  <div className={styles.itemName}>{it.itemName}</div>
                  <div className={styles.countRow}>
                    <div className={styles.countBlock}>
                      <span className={styles.countValue}>{it.orderedCount}</span>
                      <span className={styles.countLabel}>Ordered</span>
                    </div>
                    <div className={styles.countBlock}>
                      <span className={styles.countValuePrepared}>{it.preparedCount}</span>
                      <span className={styles.countLabel}>Prepared</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {lastRefresh && (
        <div className={styles.refreshNote}>
          Last updated: {lastRefresh.toLocaleTimeString('en-PK')}
        </div>
      )}

    </div>
  );
}