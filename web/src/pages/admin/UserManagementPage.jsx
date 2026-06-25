// web/src/pages/admin/UserManagementPage.jsx
// Screen 13 — User Management + Approvals (Admin)
// Flow 01: pending approvals + active user list + role management

import { useState, useEffect, useCallback } from 'react';
import {
  getPendingRequests,
  approveRegistration,
  rejectRegistration,
  getUsers,
  updateUserRole,
  updateUserStatus,
  resetThrottle,
} from '../../services/userManagementService';
import { formatTsDate } from '../../utils/dateUtils';
import styles from './UserManagementPage.module.css';

const ROLES = [
  'employee',
  'mess_supervisor',
  'accounts_supervisor',
  'cafe_bakery_tuckshop_supervisor',
  'cafe_supervisor',
  'cafe_waiter',
  'gh_supervisor',
  'boq_supervisor',
  'store_supervisor',
  'purchaser',
  'sports_supervisor',
  'manager',
  'admin',
  'super_admin',
];

const ROLE_LABELS = {
  employee:                          'Employee',
  mess_supervisor:                   'Mess Supervisor',
  accounts_supervisor:               'Accounts Supervisor',
  cafe_bakery_tuckshop_supervisor:   'Café/Bakery/Tuck Shop Supervisor',
  cafe_supervisor:                   'Café Supervisor',
  cafe_waiter:                       'Café Waiter',
  gh_supervisor:                     'Guest House Supervisor',
  boq_supervisor:                    'BOQ Supervisor',
  store_supervisor:                  'Store Supervisor',
  purchaser:                         'Purchaser',
  sports_supervisor:                 'Sports Supervisor',
  manager:                           'Manager',
  admin:                             'Admin',
  super_admin:                       'Super Admin',
};

const STATUS_LABELS = { active: 'Active', inactive: 'Inactive', suspended: 'Suspended' };

const TABS = [
  { key: 'pending', label: 'Pending Approvals', icon: 'ti-user-check' },
  { key: 'users',   label: 'Active Users',       icon: 'ti-users' },
];

export default function UserManagementPage() {
  const [activeTab, setActiveTab]     = useState('pending');
  const [pending, setPending]         = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Role edit state
  const [editingRole, setEditingRole] = useState(null); // uid
  const [newRole, setNewRole]         = useState('');

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPendingRequests();
      setPending(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') loadPending();
    else loadUsers();
  }, [activeTab, loadPending, loadUsers]);

  const setAction = (id, val) =>
    setActionLoading(prev => ({ ...prev, [id]: val }));

  const handleApprove = async (requestId, employeeNumber) => {
    setAction(requestId, true);
    setError('');
    setSuccessMsg('');
    try {
      await approveRegistration(requestId);
      setSuccessMsg(`Account activated for ${employeeNumber}.`);
      await loadPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setAction(requestId, false);
    }
  };

  const handleReject = async (requestId, employeeNumber) => {
    if (!window.confirm(`Reject registration request for ${employeeNumber}?`)) return;
    setAction(requestId, true);
    setError('');
    setSuccessMsg('');
    try {
      await rejectRegistration(requestId);
      setSuccessMsg(`Request rejected for ${employeeNumber}.`);
      await loadPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setAction(requestId, false);
    }
  };

  const handleRoleUpdate = async (uid) => {
    if (!newRole) return;
    setAction(uid, true);
    setError('');
    setSuccessMsg('');
    try {
      await updateUserRole(uid, newRole);
      setSuccessMsg(`Role updated to ${ROLE_LABELS[newRole]}.`);
      setEditingRole(null);
      setNewRole('');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setAction(uid, false);
    }
  };

  const handleStatusToggle = async (uid, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Activate'} this user?`)) return;
    setAction(uid, true);
    setError('');
    setSuccessMsg('');
    try {
      await updateUserStatus(uid, newStatus);
      setSuccessMsg(`User ${newStatus === 'active' ? 'activated' : 'suspended'}.`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setAction(uid, false);
    }
  };

  const handleResetThrottle = async (employeeNumber) => {
    setAction(employeeNumber, true);
    setError('');
    setSuccessMsg('');
    try {
      await resetThrottle(employeeNumber);
      setSuccessMsg(`Throttle reset for ${employeeNumber}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAction(employeeNumber, false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    const matchSearch = !term ||
      u.officialEmployeeNumber?.toLowerCase().includes(term) ||
      u.fullName?.toLowerCase().includes(term) ||
      u.personalEmail?.toLowerCase().includes(term);
    const matchRole   = !roleFilter   || u.role === roleFilter;
    const matchStatus = !statusFilter || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>Manage registrations, roles, and account status</p>
        </div>
        {pending.length > 0 && (
          <div className={styles.pendingAlert}>
            <i className="ti ti-bell-ringing" />
            <span><strong>{pending.length}</strong> pending approval{pending.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab(tab.key); setError(''); setSuccessMsg(''); }}
          >
            <i className={tab.icon} />
            {tab.label}
            {tab.key === 'pending' && pending.length > 0 && (
              <span className={styles.badge}>{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Banners */}
      {error && (
        <div className={styles.errorBanner}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}
      {successMsg && (
        <div className={styles.successBanner}>
          <i className="ti ti-circle-check" /> {successMsg}
        </div>
      )}

      {loading && (
        <div className={styles.loadingBlock}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      )}

      {/* ── PENDING APPROVALS TAB ── */}
      {!loading && activeTab === 'pending' && (
        pending.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="ti ti-circle-check" />
            <p>No pending registrations.</p>
            <small>All registration requests have been processed.</small>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <div className={`${styles.tableHeader} ${styles.pendingHeader}`}>
              <span>Employee No.</span>
              <span>Email</span>
              <span>Requested</span>
              <span>IP Address</span>
              <span>Actions</span>
            </div>
            {pending.map(req => (
              <div key={req.requestId} className={`${styles.tableRow} ${styles.pendingRow}`}>
                <span className={styles.empNumCell}>
                  <strong>{req.officialEmployeeNumber}</strong>
                </span>
                <span className={styles.emailCell}>{req.attemptedEmail || '—'}</span>
                <span>{formatTsDate(req.createdAt)}</span>
                <span className={styles.ipCell}>{req.ipAddress || '—'}</span>
                <span className={styles.actionsCell}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleApprove(req.requestId, req.officialEmployeeNumber)}
                    disabled={actionLoading[req.requestId]}
                  >
                    {actionLoading[req.requestId] ? (
                      <div className={styles.spinnerSm} />
                    ) : (
                      <><i className="ti ti-check" /> Approve</>
                    )}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReject(req.requestId, req.officialEmployeeNumber)}
                    disabled={actionLoading[req.requestId]}
                  >
                    <i className="ti ti-x" /> Reject
                  </button>
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── USERS TAB ── */}
      {!loading && activeTab === 'users' && (
        <>
          {/* Filters */}
          <div className={styles.filterRow}>
            <div className={styles.searchWrapper}>
              <i className="ti ti-search" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, employee no., or email…"
                className={styles.searchInput}
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All roles</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <span className={styles.resultCount}>{filteredUsers.length} user(s)</span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="ti ti-users-off" />
              <p>No users found matching your filters.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <div className={`${styles.tableHeader} ${styles.usersHeader}`}>
                <span>Employee</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Last Login</span>
                <span>Actions</span>
              </div>
              {filteredUsers.map(user => (
                <div key={user.uid} className={`${styles.tableRow} ${styles.usersRow} ${user.status !== 'active' ? styles.rowInactive : ''}`}>

                  {/* Employee */}
                  <span className={styles.empCell}>
                    <strong>{user.fullName || '—'}</strong>
                    <small>{user.officialEmployeeNumber}</small>
                  </span>

                  {/* Email */}
                  <span className={styles.emailCell}>{user.personalEmail || '—'}</span>

                  {/* Role — inline edit */}
                  <span>
                    {editingRole === user.uid ? (
                      <div className={styles.roleEditRow}>
                        <select
                          value={newRole || user.role}
                          onChange={e => setNewRole(e.target.value)}
                          className={styles.roleSelect}
                          autoFocus
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        <button
                          className={styles.saveRoleBtn}
                          onClick={() => handleRoleUpdate(user.uid)}
                          disabled={actionLoading[user.uid]}
                        >
                          {actionLoading[user.uid] ? <div className={styles.spinnerSm} /> : <i className="ti ti-check" />}
                        </button>
                        <button
                          className={styles.cancelRoleBtn}
                          onClick={() => { setEditingRole(null); setNewRole(''); }}
                        >
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.rolePill}
                        onClick={() => { setEditingRole(user.uid); setNewRole(user.role); }}
                        title="Click to change role"
                      >
                        {ROLE_LABELS[user.role] || user.role}
                        <i className="ti ti-pencil" />
                      </button>
                    )}
                  </span>

                  {/* Status */}
                  <span>
                    <span className={`${styles.statusBadge} ${styles[`status_${user.status}`]}`}>
                      {STATUS_LABELS[user.status] || user.status}
                    </span>
                  </span>

                  {/* Last login */}
                  <span className={styles.loginCell}>{formatTsDate(user.lastLoginAt)}</span>

                  {/* Actions */}
                  <span className={styles.actionsCell}>
                    <button
                      className={user.status === 'active' ? styles.suspendBtn : styles.activateBtn}
                      onClick={() => handleStatusToggle(user.uid, user.status)}
                      disabled={actionLoading[user.uid]}
                    >
                      {user.status === 'active' ? (
                        <><i className="ti ti-ban" /> Suspend</>
                      ) : (
                        <><i className="ti ti-circle-check" /> Activate</>
                      )}
                    </button>
                  </span>

                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
