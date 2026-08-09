// web/src/pages/admin/BbqMenuDraftPage.jsx
// BBQ — Menu Draft — Screen #12
// Role: manager | admin | super_admin (route-level; backend is managerAndAbove)
// Path: /bbq-menu-draft
//
// Manager selects which bbq-tagged menuItems make up a given Friday's
// menu, saves as draft, optionally submits for Admin review in the same
// action. Mirrors EventManagementPage.jsx's create/edit-in-one-screen
// shape and its status-gated action row — NOT its token handling.
// EventManagementPage pulls token via `getToken()` from AuthContext;
// every BBQ file this whole module uses `token` as a prop from
// <WithToken> (Style B). Kept BBQ consistent with itself here, not with
// Events' older convention.
//
// LOCKED DECISION (02-Aug-2026): once an event leaves draft/returned
// (submitted, published, or cancelled), it can NEVER be edited again —
// confirmed intentional, not a gap to route around. This screen must not
// offer any path that pretends otherwise. If a date's event is found in
// any of those terminal-for-editing states, this screen shows why and
// stops — no save attempt that the backend would reject anyway.
//
// TWO prefill paths, deliberately different in purpose:
//  1. Reload an in-progress draft/returned event for the SAME date if
//     one already exists — a safety net against losing unsaved work on
//     revisit, not a reopening of anything locked.
//  2. "Copy from last published" — explicit button, pulls the most
//     recent past published event's item selection as a starting point
//     for a NEW date's draft. This is the actual feature requested
//     (items repeat week to week) — never automatic, always a deliberate
//     click, so a manager is never surprised by a pre-filled list they
//     didn't ask for.
//
// ASSUMPTION FLAGGED, NOT YET VERIFIED: getMenuItems()'s call shape is
// written here as `getMenuItems({ serviceCategory, isActive, limit },
// token)` — inferred from how MenuManagementPage.jsx and
// TemplatesCyclesPage.jsx call it, not from reading menuService.js
// itself. Grep-verify the real signature before trusting this.
//
// Styling: zero new CSS — reuses EventManagementPage.module.css
// directly (layout/listPane/detailPane are unused here since this is a
// single-form screen, but tag/btn*/formGroup/overlay/modal classes are
// all confirmed present and exactly what this screen needs).

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMenuItems } from '../../services/menuService';
import {
  getBbqEventsList, getBbqEvent, getPublishedBbqEvents,
  saveBbqEventDraft, submitBbqEvent, cancelBbqEvent,
} from '../../services/bbqEventService';
import styles from './EventManagementPage.module.css';

const GROUP_LABELS = {
  preorderItems: 'Preorder',
  liveCookItems: 'Live Cook',
  kidsItems: 'Kids',
  beverages: 'Beverages',
  breadItems: 'Bread',
  dessertItems: 'Dessert',
};
// bbqMenuGroup catalogue values -> the resolved-menu array key they map
// to server-side (GROUP_TO_MENU_KEY in bbqEventService.js backend) —
// mirrored here only for grouping the picker UI and for flattening an
// existing event's resolved menu back into a flat itemIds list.
const GROUP_ORDER = ['preorderItems', 'liveCookItems', 'kidsItems', 'beverages', 'breadItems', 'dessertItems'];
// menuItems.bbqMenuGroup stores the RAW catalogue tag (preorder/live_cook/
// kids/beverage/bread/dessert) — a different vocabulary from the resolved
// menu's array keys (preorderItems/liveCookItems/etc.) that
// saveBbqEventDraft produces server-side. Confirmed via curl against real
// data 02-Aug-2026 — an earlier version of this file conflated the two,
// checking raw tag values against resolved-key names directly, which
// silently matched nothing and emptied the whole picker with no error.
// This map is the exact same translation bbqEventService.js's own
// GROUP_TO_MENU_KEY does server-side — kept in sync with that, not
// invented independently.
const CATALOGUE_GROUP_TO_KEY = {
  preorder: 'preorderItems',
  live_cook: 'liveCookItems',
  kids: 'kidsItems',
  beverage: 'beverages',
  bread: 'breadItems',
  dessert: 'dessertItems',
};

function nextFriday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun..6=Sat, Friday=5
  const diff = (5 - day + 7) % 7 || 7; // always the NEXT Friday, not today even if today is Friday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function isFriday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  return !isNaN(d.getTime()) && d.getDay() === 5;
}

const NON_EDITABLE_STATUSES = ['pending_review', 'published', 'cancelled'];
// Label + CSS-class pairs, copied verbatim from EventManagementPage.jsx's
// own STATUS_META map — NOT derived by string transformation. An earlier
// draft of this file tried to build the class name dynamically
// (`tag${status}`) and got it wrong for pending_review (would have
// produced 'tagPendingReview', which doesn't exist — the real class is
// 'tagPending'). Explicit map avoids that whole class of bug.
const STATUS_META = {
  draft:            { label: 'Draft',           cls: 'tagDraft' },
  pending_review:   { label: 'Pending Review',  cls: 'tagPending' },
  returned:         { label: 'Returned',        cls: 'tagReturned' },
  published:        { label: 'Published',       cls: 'tagPublished' },
  cancelled:        { label: 'Cancelled',       cls: 'tagCancelled' },
};

export default function BbqMenuDraftPage({ token }) {
  const [eventDate, setEventDate] = useState(nextFriday());
  const [dateError, setDateError] = useState('');

  const [catalogue, setCatalogue] = useState([]); // all active bbq items
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');

  const [existingEvent, setExistingEvent] = useState(undefined); // undefined=checking, null=none, object=found
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // ── Load the bbq-tagged catalogue once ──
  useEffect(() => {
    if (!token) return;
    (async () => {
      setCatalogueLoading(true);
      setCatalogueError('');
      try {
        const data = await getMenuItems({ serviceCategory: 'bbq', isActive: true, limit: 500 }, token);
        const list = Array.isArray(data) ? data : (data.items || []);
        setCatalogue(list);
      } catch (e) {
        setCatalogueError(e.message);
      } finally {
        setCatalogueLoading(false);
      }
    })();
  }, [token]);

  // ── Check for an existing draft/returned/etc. event on this date ──
  const checkExisting = useCallback(async () => {
    if (!token || !isFriday(eventDate)) { setExistingEvent(null); setCheckingExisting(false); return; }
    setCheckingExisting(true);
    setSaveSuccess('');
    try {
      const events = await getBbqEventsList(token, { limit: 20 });
      const match = events.find((e) => e.eventDate === eventDate);
      if (!match) {
        setExistingEvent(null);
        setSelectedIds(new Set());
      } else if (NON_EDITABLE_STATUSES.includes(match.status)) {
        setExistingEvent(match); // shown as a blocking notice, not loaded into the checklist
        setSelectedIds(new Set());
      } else {
        // draft or returned — reload the full event to get itemIds back
        // out of its resolved menu (flatten all 6 group arrays).
        const full = await getBbqEvent(token, match.eventId);
        setExistingEvent(full);
        const ids = new Set();
        GROUP_ORDER.forEach((key) => (full.menu?.[key] || []).forEach((it) => ids.add(it.itemId)));
        setSelectedIds(ids);
      }
    } catch (e) {
      setCatalogueError(e.message);
    } finally {
      setCheckingExisting(false);
    }
  }, [token, eventDate]);

  useEffect(() => { checkExisting(); }, [checkExisting]);

  const onDateChange = (val) => {
    setEventDate(val);
    setDateError(isFriday(val) ? '' : 'BBQ events must be on a Friday.');
    setSaveError(''); setSaveSuccess(''); setCopyError('');
  };

  const toggleItem = (itemId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const onCopyFromLastPublished = async () => {
    setCopying(true);
    setCopyError('');
    try {
      const published = await getPublishedBbqEvents(token);
      const past = published
        .filter((e) => e.eventDate < eventDate)
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
      if (past.length === 0) { setCopyError('No earlier published BBQ event found to copy from.'); return; }
      const source = await getBbqEvent(token, past[0].eventId || `${past[0].tenantId}_${past[0].eventDate}`);
      const ids = new Set();
      GROUP_ORDER.forEach((key) => (source.menu?.[key] || []).forEach((it) => ids.add(it.itemId)));
      setSelectedIds(ids);
    } catch (e) {
      setCopyError(e.message);
    } finally {
      setCopying(false);
    }
  };

  const grouped = useMemo(() => {
    const byGroup = {};
    GROUP_ORDER.forEach((k) => (byGroup[k] = []));
    catalogue.forEach((item) => {
      const key = CATALOGUE_GROUP_TO_KEY[item.bbqMenuGroup];
      // Items with a bbqMenuGroup value not in the map are excluded from
      // the picker rather than silently dumped in a group — the backend
      // would reject them at save time anyway (saveBbqEventDraft
      // validates bbqMenuGroup per item against the same catalogue
      // values), so surfacing them here as unselectable would be
      // misleading.
      if (key) byGroup[key].push(item);
    });
    return byGroup;
  }, [catalogue]);

  const doSave = async (andSubmit) => {
    if (!isFriday(eventDate)) { setDateError('BBQ events must be on a Friday.'); return; }
    if (selectedIds.size === 0) { setSaveError('Select at least one item before saving.'); return; }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const result = await saveBbqEventDraft(token, { eventDate, itemIds: [...selectedIds] });
      if (andSubmit) {
        await submitBbqEvent(token, result.eventId);
        setSaveSuccess('Draft saved and submitted for Admin review.');
      } else {
        setSaveSuccess('Draft saved.');
      }
      await checkExisting();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // M18 — cancel the currently-loaded draft/returned event entirely.
  // PERMANENT: 'cancelled' is not in the backend's editableStatuses list,
  // and the deterministic doc ID means this Friday can never get a fresh
  // draft afterward either. Confirmed with Homi 03-Aug-2026: this is the
  // correct, intended behavior for this action specifically — BBQ being
  // called off entirely (weather, official commitment) is never
  // rescheduled onto the same date. NOT a mistake-cleanup tool — an
  // unsubmitted wrong-date draft is already harmless and needs no fix;
  // the dialog actively warns against using this for that case.
  const onCancelEvent = async () => {
    if (!window.confirm(
      `Cancel the BBQ event for ${eventDate}? This is PERMANENT — this Friday's date can never be used for a new BBQ menu again afterward (the system has no way to create a fresh draft for a date that's already been cancelled). If you just picked the wrong date, close this dialog and start a NEW draft on a different Friday instead — don't cancel this one.`
    )) return;
    setCancelling(true);
    setCancelError('');
    try {
      await cancelBbqEvent(token, existingEvent.eventId);
      setSelectedIds(new Set());
      setSaveSuccess('');
      await checkExisting();
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const blocked = existingEvent && NON_EDITABLE_STATUSES.includes(existingEvent.status);
  const isEditingDraft = existingEvent && !blocked;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>BBQ Menu Draft</h1>
          <p className={styles.pageSubtitle}>Select this week's BBQ items and save as a draft</p>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Event date (must be a Friday)</label>
        <input type="date" value={eventDate} onChange={(e) => onDateChange(e.target.value)} />
        {dateError && <p className={styles.errorText}>{dateError}</p>}
      </div>

      {checkingExisting ? (
        <p className={styles.loadingText}>Checking for an existing event on this date…</p>
      ) : blocked ? (
        <div className={styles.emptyState}>
          <i className="ti ti-lock" />
          <p>
            An event already exists for {eventDate} with status{' '}
            <span className={`${styles.tag} ${styles[STATUS_META[existingEvent.status]?.cls] || ''}`}>
              {STATUS_META[existingEvent.status]?.label || existingEvent.status}
            </span>
            . Once submitted, published, or cancelled, a BBQ event's menu cannot be edited —
            pick a different Friday, or wait for next week.
          </p>
        </div>
      ) : (
        <>
          {isEditingDraft && (
            <p className={styles.modalNote}>
              Continuing an existing {STATUS_META[existingEvent.status]?.label?.toLowerCase()} for {eventDate} —
              your previous selections are loaded below.
              {existingEvent.returnComments && (
                <><br /><strong>Return note:</strong> {existingEvent.returnComments}</>
              )}
            </p>
          )}

          {!isEditingDraft && (
            <div style={{ marginBottom: 16 }}>
              <button className={styles.btnSecondary} onClick={onCopyFromLastPublished} disabled={copying}>
                <i className="ti ti-copy" /> {copying ? 'Copying…' : 'Copy from last published'}
              </button>
              {copyError && <p className={styles.errorText}>{copyError}</p>}
            </div>
          )}

          {catalogueLoading ? (
              <p className={styles.loadingText}>Loading BBQ item catalogue…</p>
            ) : catalogueError ? (
              <p className={styles.errorText}>{catalogueError}</p>
            ) : (
              <div className={styles.menuGroupGrid}>
                {GROUP_ORDER.map((key) => (
                  <div key={key} className={styles.menuGroupColumn}>
                    <p className={styles.menuGroupColumnLabel}>{GROUP_LABELS[key]}</p>
                    {grouped[key].length === 0 ? (
                      <p className={styles.menuGroupEmptyNote}>No items</p>
                    ) : (
                      grouped[key].map((item) => {
                        const selected = selectedIds.has(item.itemId);
                        return (
                          <label key={item.itemId} className={styles.checkLabel}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleItem(item.itemId)}
                            />
                            {item.itemName}
                          </label>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            )}

          <p className={styles.loadingText}>{selectedIds.size} item{selectedIds.size === 1 ? '' : 's'} selected</p>

          {saveError && <p className={styles.errorText}>{saveError}</p>}
          {saveSuccess && <p className={styles.modalNote}>{saveSuccess}</p>}
          {cancelError && <p className={styles.errorText}>{cancelError}</p>}

          <div className={styles.headerActions}>
            <button className={styles.btnSecondary} onClick={() => doSave(false)} disabled={saving || !!dateError}>
              {saving ? 'Saving…' : 'Save as Draft'}
            </button>
            <button className={styles.btnPrimary} onClick={() => doSave(true)} disabled={saving || !!dateError}>
              {saving ? 'Saving…' : 'Save & Submit for Review'}
            </button>
            {isEditingDraft && (
              <button className={styles.btnDanger} onClick={onCancelEvent} disabled={saving || cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel This Event'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
