// web/src/pages/admin/BbqMenuApprovePage.jsx
// BBQ — Menu Approve & Publish — Screen #13
// Role: admin | super_admin
// Path: /bbq-menu-approve
//
// Admin's review queue for BBQ menu drafts submitted by a manager
// (status pending_review). List + detail pane, same layout shape as
// EventManagementPage.jsx's management view — Publish / Return are the
// only actions; unlike official club events, BBQ's publish takes no
// extra fields (no venue requirement), so Publish here is a single
// confirm, not a form.
//
// Token: Pattern B — `token` prop from <WithToken>, kept consistent with
// the rest of BBQ (Events itself uses a different, older convention —
// see BbqMenuDraftPage.jsx's header for the same note).
//
// Styling: zero new CSS — reuses EventManagementPage.module.css directly.

import { useState, useCallback, useEffect } from 'react';
import { getBbqEventsList, getBbqEvent, publishBbqEvent, returnBbqEvent } from '../../services/bbqEventService';
import styles from './EventManagementPage.module.css';

const GROUP_LABELS = {
  preorderItems: 'Preorder',
  liveCookItems: 'Live Cook',
  kidsItems: 'Kids',
  beverages: 'Beverages',
  breadItems: 'Bread',
  dessertItems: 'Dessert',
};
const GROUP_ORDER = ['preorderItems', 'liveCookItems', 'kidsItems', 'beverages', 'breadItems', 'dessertItems'];

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(`${str}T00:00:00`);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BbqMenuApprovePage({ token }) {
  const [events, setEvents] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState('');

  const [returnModal, setReturnModal] = useState(false);
  const [returnComments, setReturnComments] = useState('');
  const [returning, setReturning] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const data = await getBbqEventsList(token, { status: 'pending_review', limit: 20 });
      setEvents(data);
    } catch (e) {
      setListError(e.message);
    } finally {
      setListLoading(false);
    }
  }, [token]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (eventId) => {
    setDetailLoading(true);
    setSelectedEvent(null);
    setActionError('');
    try {
      const ev = await getBbqEvent(token, eventId);
      setSelectedEvent(ev);
    } catch (e) {
      setListError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const onPublish = async () => {
    if (!window.confirm(`Publish the BBQ menu for ${selectedEvent.eventDate}? Employees will be able to order immediately once the order window opens.`)) return;
    setPublishing(true);
    setActionError('');
    try {
      await publishBbqEvent(token, selectedEvent.eventId);
      setSelectedEvent(null);
      loadList();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const onReturn = async () => {
    if (!returnComments.trim()) { setActionError('Comments are required when returning.'); return; }
    setReturning(true);
    setActionError('');
    try {
      await returnBbqEvent(token, selectedEvent.eventId, returnComments.trim());
      setReturnModal(false);
      setReturnComments('');
      setSelectedEvent(null);
      loadList();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>BBQ Menu Approvals</h1>
          <p className={styles.pageSubtitle}>Review and publish menu drafts submitted by managers</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.listPane}>
          {listLoading && <p className={styles.loadingText}>Loading…</p>}
          {listError && <p className={styles.errorText}>{listError}</p>}
          {!listLoading && !listError && events.length === 0 && (
            <div className={styles.emptyState}>
              <i className="ti ti-calendar-off" />
              <p>No BBQ menus pending review.</p>
            </div>
          )}
          {!listLoading && events.map((ev) => (
            <button
              key={ev.eventId}
              className={`${styles.eventCard} ${selectedEvent?.eventId === ev.eventId ? styles.eventCardActive : ''}`}
              onClick={() => openDetail(ev.eventId)}
            >
              <div className={styles.eventCardTop}>
                <span className={styles.eventCardTitle}>{formatDate(ev.eventDate)}</span>
                <span className={`${styles.tag} ${styles.tagPending}`}>Pending Review</span>
              </div>
              <div className={styles.eventCardMeta}>
                <span><i className="ti ti-user" /> {ev.createdByUid ? 'Manager submitted' : '—'}</span>
              </div>
            </button>
          ))}
        </div>

        <div className={styles.detailPane}>
          {detailLoading && <p className={styles.loadingText}>Loading event…</p>}

          {!detailLoading && selectedEvent && (
            <div className={styles.createForm}>
              <div className={styles.formHeader}>
                <h2>{formatDate(selectedEvent.eventDate)}</h2>
                <span className={`${styles.tag} ${styles.tagPending}`}>Pending Review</span>
              </div>

              {GROUP_ORDER.map((key) => {
                const items = selectedEvent.menu?.[key] || [];
                if (items.length === 0) return null;
                return (
                  <div key={key} className={styles.formGroup}>
                    <label>{GROUP_LABELS[key]}</label>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {items.map((it) => (
                        <li key={it.itemId}>{it.itemName} <span style={{ color: '#9ca3af' }}>({it.baseUnit})</span></li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {actionError && <p className={styles.errorText}>{actionError}</p>}

              <div className={styles.actionRow}>
                <button className={styles.btnPrimary} onClick={onPublish} disabled={publishing}>
                  <i className="ti ti-check" /> {publishing ? 'Publishing…' : 'Publish'}
                </button>
                <button className={styles.btnDanger} onClick={() => { setReturnModal(true); setActionError(''); }} disabled={publishing}>
                  <i className="ti ti-arrow-back-up" /> Return
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {returnModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>Return Menu Draft</span>
              <button className={styles.iconBtn} onClick={() => { setReturnModal(false); setActionError(''); }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalNote}>Explain what needs to be corrected before the manager resubmits.</p>
              <div className={styles.formGroup}>
                <label>Comments <span className={styles.req}>*</span></label>
                <textarea rows={4} value={returnComments} onChange={(e) => setReturnComments(e.target.value)} placeholder="What needs to change?" />
              </div>
              {actionError && <p className={styles.errorText}>{actionError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => { setReturnModal(false); setActionError(''); }} disabled={returning}>
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={onReturn} disabled={returning}>
                {returning ? 'Returning…' : 'Return to Manager'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
