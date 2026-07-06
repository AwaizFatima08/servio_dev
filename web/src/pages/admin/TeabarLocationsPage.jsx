// web/src/pages/admin/TeabarLocationsPage.jsx
// Tea Bar — Location Management — Screen 8, Slice 1 (read-only list only)
// Role: manager | admin | super_admin
// Path: /teabar-locations
//
// SLICE 1 ONLY: shows the list of Tea Bar locations, read-only. No create,
// edit, assign, or unassign actions yet — those are separate, later slices,
// added one at a time per project convention. This mirrors CafeHistoryPage's
// overall shape (header + refresh + table) but is a new, separate style file
// (CafeHistoryPage.module.css was not available to copy from directly).

import { useState, useEffect, useCallback } from 'react';
import { listTeabarLocations, createTeabarLocation, updateTeabarLocation, unassignTeabarAttendant } from '../../services/teabarLocationService';
import styles from './TeabarLocationsPage.module.css';

export default function TeabarLocationsPage({ token }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingLocation, setEditingLocation] = useState(null);
  const [editName, setEditName] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [unassigningId, setUnassigningId] = useState(null);
  const [unassignError, setUnassignError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listTeabarLocations(token);
      setLocations(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleCreate = async () => {
    const trimmedName = newLocationName.trim();
    if (!trimmedName) {
      setCreateError('Please enter a location name.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createTeabarLocation(token, trimmedName);
      setShowCreateModal(false);
      setNewLocationName('');
      await load();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };
  
  const openEdit = (loc) => {
    setEditingLocation(loc);
    setEditName(loc.locationName);
    setEditActive(loc.isActive);
    setEditError('');
  };

  const handleEditSave = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Please enter a location name.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await updateTeabarLocation(token, editingLocation.locationId, {
        locationName: trimmedName,
        isActive: editActive,
      });
      setEditingLocation(null);
      await load();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleUnassign = async (loc) => {
    const confirmed = window.confirm(`Remove the assigned attendant from "${loc.locationName}"?`);
    if (!confirmed) return;
    setUnassigningId(loc.locationId);
    setUnassignError('');
    try {
      await unassignTeabarAttendant(token, loc.locationId);
      await load();
    } catch (e) {
      setUnassignError(e.message);
    } finally {
      setUnassigningId(null);
    }
  };

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tea Bar Locations</h1>
          <p className={styles.subtitle}>
            {locations.length > 0 && `${locations.length} location${locations.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          <i className="ti ti-refresh" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
          <i className="ti ti-plus" /> Add Location
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {unassignError && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {unassignError}
        </div>
      )}

      {loading && locations.length === 0 ? (
        <div className={styles.loading}>Loading locations…</div>
      ) : locations.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No Tea Bar locations yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Location</th>
                <th>Status</th>
                <th>Coverage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.locationId}>
                  <td>{loc.locationName}</td>
                  <td>
                    <span className={loc.isActive ? styles.activeTag : styles.inactiveTag}>
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={loc.assignedAttendantUid ? styles.coveredTag : styles.unassignedTag}>
                      {loc.assignedAttendantUid ? 'Covered' : 'Unassigned'}
                    </span>
                  </td>
                  <td>
                    <button className={styles.editBtn} onClick={() => openEdit(loc)}>
                      Edit
                    </button>
                    {loc.assignedAttendantUid && (
                      <button
                        className={styles.unassignBtn}
                        onClick={() => handleUnassign(loc)}
                        disabled={unassigningId === loc.locationId}
                      >
                        {unassigningId === loc.locationId ? 'Removing…' : 'Unassign'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    {showCreateModal && (
        <div className={styles.overlay} onClick={() => !creating && setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Tea Bar Location</h2>
            <input
              className={styles.modalInput}
              type="text"
              placeholder="e.g. CCR II - East Wing"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              autoFocus
            />
            {createError && <div className={styles.modalError}>{createError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowCreateModal(false)} disabled={creating}>
                Cancel
              </button>
              <button className={styles.modalConfirmBtn} onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLocation && (
        <div className={styles.overlay} onClick={() => !saving && setEditingLocation(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Location</h2>
            <input
              className={styles.modalInput}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              Active
            </label>
            {editError && <div className={styles.modalError}>{editError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setEditingLocation(null)} disabled={saving}>
                Cancel
              </button>
              <button className={styles.modalConfirmBtn} onClick={handleEditSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}