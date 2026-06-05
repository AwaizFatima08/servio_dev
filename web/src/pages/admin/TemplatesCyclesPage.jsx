// ─────────────────────────────────────────
// TemplatesCyclesPage.jsx — Screen 9
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getTemplates, getTemplate, createTemplate, updateTemplate,
  getCycles, getActiveCycle, createCycle, setCycleStatus,
  resolveMenus,
} from '../../services/templateService';
import { getMenuItems } from '../../services/menuService';
import styles from './TemplatesCyclesPage.module.css';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const DAY_FULL = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };

const MEALS = [
  { code: 'breakfast', label: 'Breakfast', icon: 'ti-sunrise',
    slots: [
      { key: 'combo1', label: 'Combo',     categories: ['bf_combo'] },
      { key: 'combo2', label: 'Ala Carte', categories: ['bf_alacarte'] },
    ]
  },
  { code: 'lunch', label: 'Lunch', icon: 'ti-sun',
    slots: [
      { key: 'combo1', label: 'Combo 1', categories: ['mess_combo', 'mess_alacarte'] },
      { key: 'combo2', label: 'Combo 2', categories: ['mess_combo', 'mess_alacarte'] },
    ]
  },
  { code: 'dinner', label: 'Dinner', icon: 'ti-moon',
    slots: [
      { key: 'combo1', label: 'Combo 1', categories: ['mess_combo', 'mess_alacarte'] },
      { key: 'combo2', label: 'Combo 2', categories: ['mess_combo', 'mess_alacarte'] },
    ]
  },
];

function emptySchedule() {
  const s = {};
  for (const day of DAYS) {
    s[day] = {
      breakfast: { combo1Id: null, combo1Name: null, combo2Id: null, combo2Name: null },
      lunch:     { combo1Id: null, combo1Name: null, combo2Id: null, combo2Name: null },
      dinner:    { combo1Id: null, combo1Name: null, combo2Id: null, combo2Name: null },
    };
  }
  return s;
}

function normalizeSchedule(raw) {
  const s = emptySchedule();
  if (!raw) return s;
  for (const day of DAYS) {
    if (!raw[day]) continue;
    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      if (!raw[day][meal]) continue;
      s[day][meal] = {
        combo1Id:   raw[day][meal].combo1Id   || null,
        combo1Name: raw[day][meal].combo1Name || null,
        combo2Id:   raw[day][meal].combo2Id   || null,
        combo2Name: raw[day][meal].combo2Name || null,
      };
    }
  }
  return s;
}

function cycleBadge(status) {
  if (status === 'active') return { text: 'Active',  cls: styles.badgeActive };
  if (status === 'draft')  return { text: 'Draft',   cls: styles.badgeDraft };
  return                          { text: 'Closed',  cls: styles.badgeClosed };
}

function ItemPicker({ value, valueId, categories, allItems, onChange, placeholder }) {
  const [open, setOpen] = useState(false);

  const filtered = allItems.filter(item =>
    item.isActive &&
    item.serviceCategories?.some(c => categories.includes(c))
  );

  const handleSelect = (item) => {
    onChange(item.itemId, item.itemName);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null, null);
  };

  return (
    <div className={styles.pickerWrap}>
      <button
        className={`${styles.pickerBtn} ${valueId ? styles.pickerBtnFilled : ''}`}
        onClick={() => setOpen(p => !p)}
        type="button"
      >
        <span className={styles.pickerValue}>
          {value || <span className={styles.pickerPlaceholder}>{placeholder}</span>}
        </span>
        <div className={styles.pickerIcons}>
          {valueId && (
            <span className={styles.pickerClear} onClick={handleClear}>
              <i className="ti ti-x" style={{ fontSize: 11 }} />
            </span>
          )}
          <i className="ti ti-chevron-down" style={{ fontSize: 12 }} />
        </div>
      </button>
      {open && (
        <div className={styles.pickerDropdown}>
          {filtered.length === 0 ? (
            <div className={styles.pickerEmpty}>
              No items — add items in Menu Management first
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={item.itemId}
                className={`${styles.pickerOption} ${item.itemId === valueId ? styles.pickerOptionActive : ''}`}
                onClick={() => handleSelect(item)}
                type="button"
              >
                {item.itemId === valueId && (
                  <i className="ti ti-check" style={{ color: '#0F6E56', fontSize: 12, marginRight: 6 }} />
                )}
                {item.itemName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleBuilder({ schedule, onChange, allItems }) {
  const updateSlot = (day, meal, slotKey, itemId, itemName) => {
    onChange({
      ...schedule,
      [day]: {
        ...schedule[day],
        [meal]: {
          ...schedule[day][meal],
          [`${slotKey}Id`]:   itemId,
          [`${slotKey}Name`]: itemName,
        },
      },
    });
  };

  return (
    <div className={styles.scheduleWrap}>
      <div className={styles.scheduleGrid}>
        {DAYS.map(day => (
          <div key={day} className={styles.dayCol}>
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{DAY_LABELS[day]}</span>
              <span className={styles.dayFull}>{DAY_FULL[day]}</span>
            </div>
            {MEALS.map(meal => (
              <div key={meal.code} className={styles.mealCell}>
                <div className={styles.mealCellHeader}>
                  <i className={`ti ${meal.icon}`} style={{ fontSize: 12, color: '#3DBFA0' }} />
                  <span className={styles.mealCellLabel}>{meal.label}</span>
                </div>
                {meal.slots.map(slot => (
                  <div key={slot.key} className={styles.slotRow}>
                    <span className={styles.slotLabel}>{slot.label}</span>
                    <ItemPicker
                      value={schedule[day][meal.code][`${slot.key}Name`]}
                      valueId={schedule[day][meal.code][`${slot.key}Id`]}
                      categories={slot.categories}
                      allItems={allItems}
                      onChange={(id, name) => updateSlot(day, meal.code, slot.key, id, name)}
                      placeholder="Select…"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateDrawer({ initial, allItems, onClose, onSaved }) {
  const { getToken } = useAuth();
  const isEdit = !!initial;

  const [name, setName]               = useState(initial?.templateName || '');
  const [description, setDescription] = useState(initial?.description  || '');
  const [schedule, setSchedule]       = useState(() =>
    isEdit ? normalizeSchedule(initial?.schedule) : emptySchedule()
  );
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!isEdit || initial?.schedule) return;
    getToken().then(token =>
      getTemplate(initial.templateId, token)
        .then(t => setSchedule(normalizeSchedule(t.schedule)))
        .catch(() => {})
    );
  }, [isEdit, initial, getToken]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Template name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const payload = { templateName: name.trim(), description: description.trim() || null, schedule };
      if (isEdit) {
        await updateTemplate(initial.templateId, payload, token);
      } else {
        await createTemplate(payload, token);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawerWide}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>{isEdit ? 'Edit Template' : 'New Template'}</span>
          <button className={styles.drawerClose} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className={styles.drawerScroll}>
          <div className={styles.drawerBody}>
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label className={styles.formLabel}>Template Name <span className={styles.req}>*</span></label>
                <input className={styles.input} placeholder="e.g. Summer 2026 Week A" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className={styles.formGroup} style={{ flex: 3 }}>
                <label className={styles.formLabel}>Notes (optional)</label>
                <input className={styles.input} placeholder="Any notes for the mess committee…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Weekly Schedule</label>
              <p className={styles.formHint}>Assign items to each meal slot for each day. Empty slots will not appear in the daily menu.</p>
              <ScheduleBuilder schedule={schedule} onChange={setSchedule} allItems={allItems} />
            </div>
            {error && <div className={styles.errorBox}><i className="ti ti-alert-circle" /> {error}</div>}
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting || !name.trim()}>
                {submitting ? <><div className={styles.spinnerSmall} /> Saving…</> : <><i className="ti ti-check" /> {isEdit ? 'Save Changes' : 'Create Template'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddCycleDrawer({ templates, onClose, onSaved }) {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    cycleName:      '',
    startDate:      new Date().toISOString().split('T')[0],
    weekTemplateId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.cycleName.trim() || !form.startDate || !form.weekTemplateId) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      await createCycle(form, token);
      onSaved();
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
          <span className={styles.drawerTitle}>New Cycle</span>
          <button className={styles.drawerClose} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.drawerScroll}>
          <div className={styles.drawerBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Cycle Name <span className={styles.req}>*</span></label>
              <input className={styles.input} placeholder="e.g. Summer 2026" value={form.cycleName} onChange={e => set('cycleName', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Start Date <span className={styles.req}>*</span></label>
              <input className={styles.input} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              <span className={styles.formHint}>The weekly template repeats from this date onwards until the cycle is closed.</span>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Template <span className={styles.req}>*</span></label>
              <select className={styles.select} value={form.weekTemplateId} onChange={e => set('weekTemplateId', e.target.value)}>
                <option value="">Select a template…</option>
                {templates.map(t => (
                  <option key={t.templateId} value={t.templateId}>{t.templateName}</option>
                ))}
              </select>
            </div>
            <div className={styles.infoBox}>
              <i className="ti ti-info-circle" style={{ color: '#D4960A', flexShrink: 0 }} />
              Cycle is created as <strong>Draft</strong>. Activate it separately when ready. Only one cycle can be active at a time.
            </div>
            {error && <div className={styles.errorBox}><i className="ti ti-alert-circle" /> {error}</div>}
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting || !form.cycleName.trim() || !form.weekTemplateId}>
                {submitting ? <><div className={styles.spinnerSmall} /> Creating…</> : <><i className="ti ti-plus" /> Create Cycle</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function TemplatesCyclesPage() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState('templates');

  const [templates, setTemplates]     = useState([]);
  const [loadingTpl, setLoadingTpl]   = useState(true);
  const [tplError, setTplError]       = useState(null);
  const [showAddTpl, setShowAddTpl]   = useState(false);
  const [editTpl, setEditTpl]         = useState(null);

  const [cycles, setCycles]           = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [loadingCyc, setLoadingCyc]   = useState(true);
  const [cycError, setCycError]       = useState(null);
  const [showAddCyc, setShowAddCyc]   = useState(false);
  const [toggling, setToggling]       = useState(null);

  // Resolve menu state
  const [resolving, setResolving]     = useState(false);
  const [resolveMsg, setResolveMsg]   = useState('');

  const [allItems, setAllItems]       = useState([]);

  useEffect(() => {
    getToken().then(token =>
      getMenuItems({ limit: 500 }, token)
        .then(data => setAllItems(data.items || []))
        .catch(() => setAllItems([]))
    );
  }, [getToken]);

  const loadTemplates = useCallback(async () => {
    setLoadingTpl(true);
    setTplError(null);
    try {
      const token = await getToken();
      setTemplates(await getTemplates(token));
    } catch (err) {
      setTplError(err.message);
    } finally {
      setLoadingTpl(false);
    }
  }, [getToken]);

  const loadCycles = useCallback(async () => {
    setLoadingCyc(true);
    setCycError(null);
    try {
      const token = await getToken();
      const [all, active] = await Promise.all([getCycles(token), getActiveCycle(token)]);
      setCycles(all);
      setActiveCycle(active);
    } catch (err) {
      setCycError(err.message);
    } finally {
      setLoadingCyc(false);
    }
  }, [getToken]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { loadCycles(); }, [loadCycles]);

  const handleResolve = async () => {
    setResolving(true);
    setResolveMsg('');
    try {
      const token = await getToken();
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
      let succeeded = 0;
      for (const date of dates) {
        try {
          await resolveMenus(date, token);
        succeeded++;
      } catch {
        // skip dates that fail — may already exist
      }
    }
    setResolveMsg(`✓ Menus resolved for ${succeeded} days (today + next 6 days). Employees can now book meals.`);
  } catch (err) {
    setResolveMsg(`✗ ${err.message}`);
  } finally {
    setResolving(false);
  }
};

  const handleCycleStatusChange = async (cycleId, newStatus) => {
    setToggling(cycleId);
    try {
      const token = await getToken();
      await setCycleStatus(cycleId, newStatus, token);
      await loadCycles();
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className={styles.page}>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Templates & Cycles</h1>
          <p className={styles.pageSub}>
            {activeCycle
              ? <><span className={styles.activeDot} /> Active cycle: <strong>{activeCycle.cycleName}</strong></>
              : 'No active cycle'
            }
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.resolveBtn}
            onClick={handleResolve}
            disabled={resolving || !activeCycle}
            title={!activeCycle ? 'No active cycle — activate a cycle first' : "Generate menus for the next 7 days"}
          >
            <i className={`ti ti-calendar-bolt${resolving ? ` ${styles.spinning}` : ''}`} />
            {resolving ? 'Resolving…' : "Resolve Menu"}
          </button>

          {tab === 'templates' && (
            <button className={styles.addBtn} onClick={() => setShowAddTpl(true)}>
              <i className="ti ti-plus" /> New Template
            </button>
          )}
          {tab === 'cycles' && (
            <button className={styles.addBtn} onClick={() => setShowAddCyc(true)}>
              <i className="ti ti-plus" /> New Cycle
            </button>
          )}
        </div>
      </div>

      {resolveMsg && (
        <div className={resolveMsg.startsWith('✓') ? styles.resolveSuccess : styles.resolveError}>
          {resolveMsg}
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'templates' ? styles.tabActive : ''}`} onClick={() => setTab('templates')}>
          <i className="ti ti-calendar-week" /> Templates
          <span className={styles.tabCount}>{templates.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'cycles' ? styles.tabActive : ''}`} onClick={() => setTab('cycles')}>
          <i className="ti ti-refresh" /> Cycles
          <span className={styles.tabCount}>{cycles.length}</span>
        </button>
      </div>

      {tab === 'templates' && (
        <div className={styles.tableWrap}>
          {loadingTpl && <div className={styles.loadingRow}><div className={styles.spinner} /> Loading…</div>}
          {tplError && <div className={styles.errorBox} style={{ margin: 20 }}><i className="ti ti-alert-circle" /> {tplError}</div>}
          {!loadingTpl && !tplError && templates.length === 0 && (
            <div className={styles.emptyState}>
              <i className="ti ti-calendar-week" style={{ fontSize: 36, color: '#C6F0E5' }} />
              <p>No templates yet</p>
              <span>Create a template to define your weekly menu structure</span>
            </div>
          )}
          {!loadingTpl && templates.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr><th>Template Name</th><th>Notes</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.templateId} className={styles.tableRow}>
                    <td className={styles.tplName}>{t.templateName}</td>
                    <td className={styles.muted}>{t.description || '—'}</td>
                    <td className={styles.muted}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => setEditTpl(t)}>
                        <i className="ti ti-edit" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'cycles' && (
        <div className={styles.tableWrap}>
          {loadingCyc && <div className={styles.loadingRow}><div className={styles.spinner} /> Loading…</div>}
          {cycError && <div className={styles.errorBox} style={{ margin: 20 }}><i className="ti ti-alert-circle" /> {cycError}</div>}
          {!loadingCyc && !cycError && cycles.length === 0 && (
            <div className={styles.emptyState}>
              <i className="ti ti-refresh" style={{ fontSize: 36, color: '#C6F0E5' }} />
              <p>No cycles yet</p>
              <span>Create a cycle to activate a template for a date range</span>
            </div>
          )}
          {!loadingCyc && cycles.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr><th>Cycle Name</th><th>Template</th><th>Start Date</th><th>End Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {cycles.map(c => {
                  const badge = cycleBadge(c.status);
                  const isToggling = toggling === c.cycleId;
                  return (
                    <tr key={c.cycleId} className={styles.tableRow}>
                      <td className={styles.tplName}>{c.cycleName}</td>
                      <td className={styles.muted}>
                        {templates.find(t => t.templateId === c.weekTemplateId)?.templateName || c.weekTemplateId}
                      </td>
                      <td className={styles.muted}>{c.startDate}</td>
                      <td className={styles.muted}>{c.endDate || '—'}</td>
                      <td><span className={`${styles.badge} ${badge.cls}`}>{badge.text}</span></td>
                      <td>
                        <div className={styles.actionBtns}>
                          {c.status === 'draft' && (
                            <button className={styles.activateBtn} onClick={() => handleCycleStatusChange(c.cycleId, 'active')} disabled={isToggling}>
                              {isToggling ? <div className={styles.spinnerTiny} /> : <i className="ti ti-player-play" />} Activate
                            </button>
                          )}
                          {c.status === 'active' && (
                            <button className={styles.closeBtn}
                              onClick={() => { if (window.confirm(`Close cycle "${c.cycleName}"? This will stop daily menu generation.`)) handleCycleStatusChange(c.cycleId, 'closed'); }}
                              disabled={isToggling}
                            >
                              {isToggling ? <div className={styles.spinnerTiny} /> : <i className="ti ti-player-stop" />} Close
                            </button>
                          )}
                          {c.status === 'closed' && <span className={styles.muted} style={{ fontSize: 12 }}>Closed</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showAddTpl && <TemplateDrawer allItems={allItems} onClose={() => setShowAddTpl(false)} onSaved={loadTemplates} />}
      {editTpl    && <TemplateDrawer initial={editTpl} allItems={allItems} onClose={() => setEditTpl(null)} onSaved={loadTemplates} />}
      {showAddCyc && <AddCycleDrawer templates={templates} onClose={() => setShowAddCyc(false)} onSaved={loadCycles} />}

    </div>
  );
}
