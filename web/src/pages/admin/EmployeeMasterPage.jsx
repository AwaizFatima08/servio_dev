// ─────────────────────────────────────────
// EmployeeMasterPage.jsx — Screen 7
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEmployees, addEmployee, setEmployeeStatus, updateEmployee } from '../../services/employeeService';
import styles from './EmployeeMasterPage.module.css';

// ── Constants ──
const EMPLOYEE_TYPES = [
  { value: 'management',   label: 'Management' },
  { value: 'contractual',  label: 'Contractual' },
];

const PREFIXES = ['FFL', 'FAS', 'OSL', 'ESB', 'CLB'];

// ── Helpers ──
function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function statusBadge(isActive) {
  return isActive
    ? { text: 'Active',   cls: styles.badgeActive }
    : { text: 'Inactive', cls: styles.badgeInactive };
}

function typeBadge(type) {
  return type === 'management'
    ? { text: 'Management',  cls: styles.badgeMgmt }
    : { text: 'Contractual', cls: styles.badgeContract };
}

// ─────────────────────────────────────────
// Add Employee Drawer
// ─────────────────────────────────────────
function AddEmployeeDrawer({ onClose, onAdded }) {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    prefix: 'FFL',
    number: '',
    fullName: '',
    employeeType: 'management',
    cnicLast4: '',
    dateOfBirth: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const officialEmployeeNumber = `${form.prefix}${form.number.trim()}`;

  const handleSubmit = async () => {
    if (!form.number.trim() || !form.fullName.trim()) {
      setError('Employee number and full name are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      await addEmployee({
        officialEmployeeNumber,
        fullName: form.fullName.trim(),
        employeeType: form.employeeType,
        cnicLast4: form.cnicLast4.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
      }, token);
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Add Employee</span>
          <button className={styles.drawerClose} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className={styles.drawerBody}>

          {/* Employee number */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Employee Number <span className={styles.req}>*</span></label>
            <div className={styles.empNumRow}>
              <select
                className={styles.prefixSelect}
                value={form.prefix}
                onChange={e => set('prefix', e.target.value)}
              >
                {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                className={styles.input}
                placeholder="e.g. 00123"
                value={form.number}
                onChange={e => set('number', e.target.value)}
                maxLength={10}
              />
            </div>
            {form.number && (
              <span className={styles.formHint}>Will be saved as: {officialEmployeeNumber}</span>
            )}
          </div>

          {/* Full name */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Full Name <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              placeholder="As per HR record"
              value={form.fullName}
              onChange={e => set('fullName', e.target.value)}
            />
          </div>

          {/* Employee type */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Employee Type <span className={styles.req}>*</span></label>
            <div className={styles.typeToggle}>
              {EMPLOYEE_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`${styles.typeBtn} ${form.employeeType === t.value ? styles.typeBtnActive : ''}`}
                  onClick={() => set('employeeType', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* CNIC last 4 — management only */}
          {form.employeeType === 'management' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>CNIC Last 4 Digits</label>
              <input
                className={styles.input}
                placeholder="e.g. 4521"
                value={form.cnicLast4}
                onChange={e => set('cnicLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
              />
              <span className={styles.formHint}>Required for employee self-registration</span>
            </div>
          )}

          {/* Date of birth — management only */}
          {form.employeeType === 'management' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Date of Birth</label>
              <input
                className={styles.input}
                type="date"
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
              />
              <span className={styles.formHint}>Required for employee self-registration</span>
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              <i className="ti ti-alert-circle" /> {error}
            </div>
          )}
        </div>

        <div className={styles.drawerFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <><div className={styles.spinnerSmall} /> Saving…</>
              : <><i className="ti ti-user-plus" /> Add Employee</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Employee Detail Panel (slide-in)
// ─────────────────────────────────────────
const GRADES = ['MT1','MT2','MT3','MT4','MT5','MT6','M5','M6','M7','M8','M9','M9A','M10','M11','M11A','M12','M12A','M13'];
const RESIDENCE_TYPES = ['boq','moq','guest_house','a','b','b_modified','c','d_plus','d','e','e_modified'];

function EmployeeDetailPanel({ employee, isAdmin, onClose, onStatusChange }) {
  const { getToken } = useAuth();
  const [mode, setMode]       = useState('view'); // 'view' | 'edit'
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState('');

  const [form, setForm] = useState({
  grade:         employee.grade         || '',
  designation:   employee.designation   || '',
  department:    employee.department    || '',
  phoneNumber:   employee.phoneNumber   || '',
  houseNumber:   employee.houseNumber   || '',
  residenceType: employee.residenceType || '',
  cnicLast4:     employee.cnicLast4     || '',
  dateOfBirth:   employee.dateOfBirth   || '',
});

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      // Only send non-empty fields; send null to clear a field
      const updates = {};
      if (form.grade)         updates.grade         = form.grade;
      if (form.designation)   updates.designation   = form.designation;
      if (form.department)    updates.department    = form.department;
      if (form.phoneNumber)   updates.phoneNumber   = form.phoneNumber;
      if (form.houseNumber)   updates.houseNumber   = form.houseNumber;
      if (form.residenceType) updates.residenceType = form.residenceType;
      if (form.cnicLast4)     updates.cnicLast4     = form.cnicLast4;
      if (form.dateOfBirth)   updates.dateOfBirth   = form.dateOfBirth;
      await updateEmployee(employee.officialEmployeeNumber, updates, token);
      setSuccess('Saved.');
      setTimeout(() => setSuccess(''), 3000);
      setMode('view');
      onStatusChange(); // refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    setError(null);
    try {
      const token = await getToken();
      await setEmployeeStatus(employee.officialEmployeeNumber, !employee.isActive, token);
      onStatusChange();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  };

  const readFields = [
    { label: 'Employee No.',  value: employee.officialEmployeeNumber },
    { label: 'Type',          value: employee.employeeType === 'management' ? 'Management' : 'Contractual' },
  ];

  return (
    <div className={styles.drawerOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>
            {mode === 'edit' ? 'Edit Employee' : 'Employee Detail'}
          </span>
          <button className={styles.drawerClose} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className={styles.drawerBody}>
          {/* Avatar + name */}
          <div className={styles.detailHero}>
            <div className={styles.detailAvatar}>{initials(employee.fullName)}</div>
            <div>
              <h2 className={styles.detailName}>{employee.fullName}</h2>
              <span className={`${styles.badge} ${statusBadge(employee.isActive).cls}`}>
                {statusBadge(employee.isActive).text}
              </span>
            </div>
          </div>

          {/* Fixed read-only fields */}
          <div className={styles.detailGrid}>
            {readFields.map(({ label, value }) => (
              <div key={label} className={styles.detailRow}>
                <span className={styles.detailKey}>{label}</span>
                <span className={styles.detailVal}>{value}</span>
              </div>
            ))}
          </div>

          {/* Editable fields */}
          {mode === 'view' ? (
            <div className={styles.detailGrid}>
              {[
                { label: 'Grade',       value: form.grade         || '—' },
                { label: 'Designation', value: form.designation   || '—' },
                { label: 'Department',  value: form.department    || '—' },
                { label: 'Phone',       value: form.phoneNumber   || '—' },
                { label: 'House No.',   value: form.houseNumber   || '—' },
                { label: 'Residence',   value: form.residenceType || '—' },
                { label: 'CNIC Last 4', value: form.cnicLast4     || '—' },
                { label: 'Date of Birth', value: form.dateOfBirth || '—' },
              ].map(({ label, value }) => (
                <div key={label} className={styles.detailRow}>
                  <span className={styles.detailKey}>{label}</span>
                  <span className={styles.detailVal}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.editGrid}>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Grade</label>
                <select className={styles.input} value={form.grade} onChange={e => set('grade', e.target.value)}>
                  <option value="">— select —</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Designation</label>
                <input className={styles.input} value={form.designation}
                  onChange={e => set('designation', e.target.value)} placeholder="e.g. Engineer" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Department</label>
                <input className={styles.input} value={form.department}
                  onChange={e => set('department', e.target.value)} placeholder="e.g. Engineering" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phone</label>
                <input className={styles.input} value={form.phoneNumber}
                  onChange={e => set('phoneNumber', e.target.value)} placeholder="03001234567" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>House No.</label>
                <input className={styles.input} value={form.houseNumber}
                  onChange={e => set('houseNumber', e.target.value)} placeholder="e.g. A-14" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Residence Type</label>
                <select className={styles.input} value={form.residenceType} onChange={e => set('residenceType', e.target.value)}>
                  <option value="">— select —</option>
                  {RESIDENCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>CNIC Last 4</label>
                <input
                  className={styles.input}
                  value={form.cnicLast4}
                  onChange={e => set('cnicLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 4521"
                  maxLength={4}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date of Birth</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => set('dateOfBirth', e.target.value)}
                />
              </div>

            </div>
          )}

          {success && (
            <div className={styles.successBox}>
              <i className="ti ti-circle-check" /> {success}
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              <i className="ti ti-alert-circle" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'view' ? (
          <div className={styles.drawerFooter}>
            {isAdmin && (
              <button
                className={employee.isActive ? styles.deactivateBtn : styles.activateBtn}
                onClick={handleToggleStatus}
                disabled={toggling}
              >
                {toggling
                  ? <><div className={styles.spinnerSmall} /> Updating…</>
                  : employee.isActive
                    ? <><i className="ti ti-user-off" /> Deactivate</>
                    : <><i className="ti ti-user-check" /> Activate</>
                }
              </button>
            )}
            {isAdmin && (
              <button className={styles.submitBtn} onClick={() => { setError(null); setMode('edit'); }}>
                <i className="ti ti-edit" /> Edit
              </button>
            )}
            {!isAdmin && (
              <button className={styles.submitBtn} onClick={onClose}>Close</button>
            )}
          </div>
        ) : (
          <div className={styles.drawerFooter}>
            <button className={styles.cancelBtn} onClick={() => { setMode('view'); setError(null); }} disabled={saving}>
              Cancel
            </button>
            <button className={styles.submitBtn} onClick={handleSave} disabled={saving}>
              {saving
                ? <><div className={styles.spinnerSmall} /> Saving…</>
                : <><i className="ti ti-device-floppy" /> Save Changes</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main page
// ─────────────────────────────────────────
export default function EmployeeMasterPage() {
  const { getToken, userProfile } = useAuth();
  const role = userProfile?.user?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(''); // '' | 'management' | 'contractual'
  const [filterActive, setFilterActive] = useState(''); // '' | 'true' | 'false'

  // UI state
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await getEmployees({
        search: search || undefined,
        employeeType: filterType || undefined,
        isActive: filterActive !== '' ? filterActive === 'true' : undefined,
        limit: 200,
      }, token);
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, search, filterType, filterActive]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => loadEmployees(), 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Employee Master</h1>
          <p className={styles.pageSub}>
            {loading ? 'Loading…' : `${employees.length} employee${employees.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isAdmin && (
          <button className={styles.addBtn} onClick={() => setShowAddDrawer(true)}>
            <i className="ti ti-user-plus" /> Add Employee
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className={styles.filterBar}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <i className="ti ti-search" style={{ color: '#aac8bc', fontSize: 16 }} />
          <input
            className={styles.searchInput}
            placeholder="Search by name, number, department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className={styles.filterGroup}>
          {['', 'management', 'contractual'].map(val => (
            <button
              key={val}
              className={`${styles.filterBtn} ${filterType === val ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterType(val)}
            >
              {val === '' ? 'All Types' : val === 'management' ? 'Management' : 'Contractual'}
            </button>
          ))}
        </div>

        {/* Active filter */}
        <div className={styles.filterGroup}>
          {[['', 'All Status'], ['true', 'Active'], ['false', 'Inactive']].map(([val, label]) => (
            <button
              key={val}
              className={`${styles.filterBtn} ${filterActive === val ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterActive(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        {loading && (
          <div className={styles.loadingRow}>
            <div className={styles.spinner} />
            <span>Loading employees…</span>
          </div>
        )}

        {error && (
          <div className={styles.errorBox} style={{ margin: '20px' }}>
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}

        {!loading && !error && employees.length === 0 && (
          <div className={styles.emptyState}>
            <i className="ti ti-users-group" style={{ fontSize: 36, color: '#C6F0E5' }} />
            <p>No employees found</p>
            {search && <span>Try clearing the search filter</span>}
          </div>
        )}

        {!loading && !error && employees.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Number</th>
                <th>Type</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const sb = statusBadge(emp.isActive);
                const tb = typeBadge(emp.employeeType);
                return (
                  <tr
                    key={emp.officialEmployeeNumber}
                    className={styles.tableRow}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <td>
                      <div className={styles.empCell}>
                        <div className={styles.empAvatar}>{initials(emp.fullName)}</div>
                        <span className={styles.empName}>{emp.fullName}</span>
                      </div>
                    </td>
                    <td className={styles.empNum}>{emp.officialEmployeeNumber}</td>
                    <td>
                      <span className={`${styles.badge} ${tb.cls}`}>{tb.text}</span>
                    </td>
                    <td className={styles.muted}>{emp.designation || '—'}</td>
                    <td className={styles.muted}>{emp.department || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${sb.cls}`}>{sb.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Drawers ── */}
      {showAddDrawer && (
        <AddEmployeeDrawer
          onClose={() => setShowAddDrawer(false)}
          onAdded={loadEmployees}
        />
      )}

      {selectedEmployee && (
        <EmployeeDetailPanel
          employee={selectedEmployee}
          isAdmin={isAdmin}
          onClose={() => setSelectedEmployee(null)}
          onStatusChange={loadEmployees}
        />
      )}

    </div>
  );
}
