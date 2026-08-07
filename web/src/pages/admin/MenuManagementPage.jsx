// ─────────────────────────────────────────
// MenuManagementPage.jsx — Screen 8
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getFoodTypes, getMenuItems,
  addMenuItem, updateMenuItem, setMenuItemStatus,
} from '../../services/menuService';
import styles from './MenuManagementPage.module.css';

// ── Service category labels ──
// These map the controlled vocabulary values to display labels
const SERVICE_CATEGORY_OPTIONS = [
  { value: 'bf_combo',          label: 'Breakfast Combo' },
  { value: 'bf_alacarte',       label: 'Breakfast Ala Carte' },
  { value: 'mess_combo',        label: 'Mess Combo (Lunch/Dinner)' },
  { value: 'mess_alacarte',     label: 'Mess Ala Carte' },
  { value: 'cafe',              label: 'Café' },
  { value: 'tuckshop_fixed',    label: 'Tuck Shop (Fixed)' },
  { value: 'tuckshop_weekly',   label: 'Tuck Shop (Weekly)' },
  { value: 'bbq',               label: 'BBQ' },
  { value: 'bakery_scheduled',  label: 'Bakery (Scheduled)' },
  { value: 'bakery_preorder',   label: 'Bakery (Pre-order)' },
  { value: 'teabar',            label: 'Tea Bar' },
  { value: 'beverage',          label: 'Beverage' },
];

const BASE_UNIT_OPTIONS = [
  'portion', 'piece', 'glass', 'kg', 'litre', 'plate', 'cup', 'bowl',
];

// V1.4 BBQ — must match core/functions/src/constants.js BBQ_MENU_GROUPS
// exactly. Required by the backend whenever 'bbq' is in serviceCategories.
const BBQ_MENU_GROUP_OPTIONS = [
  { value: 'preorder',  label: 'Preorder' },
  { value: 'live_cook', label: 'Live Cook' },
  { value: 'kids',      label: 'Kids' },
  { value: 'beverage',  label: 'Beverage' },
  { value: 'bread',     label: 'Bread' },
  { value: 'dessert',   label: 'Dessert' },
];

// ── Helpers ──
function categoryLabel(value) {
  return SERVICE_CATEGORY_OPTIONS.find(o => o.value === value)?.label || value;
}

function statusBadge(isActive) {
  return isActive
    ? { text: 'Active',   cls: styles.badgeActive }
    : { text: 'Inactive', cls: styles.badgeInactive };
}

// ─────────────────────────────────────────
// Item Form — used for both Add and Edit
// ─────────────────────────────────────────
function ItemForm({ initial, foodTypes, onSubmit, onCancel, submitting, error }) {
  const [form, setForm] = useState({
    itemName:          initial?.itemName          || '',
    foodTypeCode:      initial?.foodTypeCode      || '',
    baseUnit:          initial?.baseUnit          || 'portion',
    serviceCategories: initial?.serviceCategories || [],
    supportsFeedback:  initial?.supportsFeedback  !== false,
    supportsRate:      initial?.supportsRate       !== false,
    sortOrder:         initial?.sortOrder          ?? 0,
    bbqMenuGroup:      initial?.bbqMenuGroup        || '',
  });

  const isBbqSelected = form.serviceCategories.includes('bbq');

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const toggleCategory = (val) => {
    setForm(p => ({
      ...p,
      serviceCategories: p.serviceCategories.includes(val)
        ? p.serviceCategories.filter(v => v !== val)
        : [...p.serviceCategories, val],
    }));
  };

  const handleSubmit = () => {
    if (!form.itemName.trim()) return;
    if (!form.foodTypeCode) return;
    if (isBbqSelected && !form.bbqMenuGroup) return;

    // Only include bbqMenuGroup in the payload for BBQ items. The backend
    // treats the mere presence of this key as "please validate/set it" —
    // sending it (even as '') on a non-BBQ item's edit gets rejected.
    const payload = { ...form };
    if (!isBbqSelected) {
      if (initial?.bbqMenuGroup) {
        payload.bbqMenuGroup = null;
      } else {
        delete payload.bbqMenuGroup;
      }
    }
    onSubmit(payload);
  };

  return (
    <div className={styles.formBody}>

      {/* Item name */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Item Name <span className={styles.req}>*</span>
        </label>
        <input
          className={styles.input}
          placeholder="e.g. Chicken Karahi + Naan + Raita"
          value={form.itemName}
          onChange={e => set('itemName', e.target.value)}
        />
        <span className={styles.formHint}>
          Include all components in the name — no separate combo builder needed.
        </span>
      </div>

      {/* Food type */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Food Type <span className={styles.req}>*</span>
        </label>
        <select
          className={styles.select}
          value={form.foodTypeCode}
          onChange={e => set('foodTypeCode', e.target.value)}
        >
          <option value="">Select food type…</option>
          {foodTypes.map(ft => (
            <option key={ft.foodTypeCode} value={ft.foodTypeCode}>
              {ft.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Base unit */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Base Unit <span className={styles.req}>*</span>
        </label>
        <div className={styles.unitGrid}>
          {BASE_UNIT_OPTIONS.map(unit => (
            <button
              key={unit}
              type="button"
              className={`${styles.unitBtn} ${form.baseUnit === unit ? styles.unitBtnActive : ''}`}
              onClick={() => set('baseUnit', unit)}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Service categories */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Service Categories</label>
        <span className={styles.formHint}>Select all services this item appears in.</span>
        <div className={styles.categoryGrid}>
          {SERVICE_CATEGORY_OPTIONS.map(opt => {
            const selected = form.serviceCategories.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={`${styles.categoryChip} ${selected ? styles.categoryChipActive : ''}`}
                onClick={() => toggleCategory(opt.value)}
              >
                {selected && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BBQ menu group — required only when BBQ is selected above */}
      {isBbqSelected && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            BBQ Menu Group <span className={styles.req}>*</span>
          </label>
          <span className={styles.formHint}>
            Which part of the Friday BBQ menu this item belongs to. Required because BBQ is selected above.
          </span>
          <select
            className={styles.select}
            value={form.bbqMenuGroup}
            onChange={e => set('bbqMenuGroup', e.target.value)}
          >
            <option value="">Select BBQ menu group…</option>
            {BBQ_MENU_GROUP_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Flags row */}
      <div className={styles.flagsRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={form.supportsFeedback}
            onChange={e => set('supportsFeedback', e.target.checked)}
          />
          <span>Supports Feedback</span>
        </label>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={form.supportsRate}
            onChange={e => set('supportsRate', e.target.checked)}
          />
          <span>Supports Rate</span>
        </label>
      </div>

      {/* Sort order */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Sort Order</label>
        <input
          className={`${styles.input} ${styles.inputNarrow}`}
          type="number"
          min="0"
          value={form.sortOrder}
          onChange={e => set('sortOrder', parseInt(e.target.value) || 0)}
        />
        <span className={styles.formHint}>Lower numbers appear first.</span>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <div className={styles.formActions}>
        <button className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={
            submitting ||
            !form.itemName.trim() ||
            !form.foodTypeCode ||
            (isBbqSelected && !form.bbqMenuGroup)
          }
        >
          {submitting
            ? <><div className={styles.spinnerSmall} /> Saving…</>
            : <><i className="ti ti-check" /> {initial ? 'Save Changes' : 'Add Item'}</>
          }
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Add Drawer
// ─────────────────────────────────────────
function AddItemDrawer({ foodTypes, onClose, onAdded }) {
  const { getToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (form) => {
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      await addMenuItem(form, token);
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
          <span className={styles.drawerTitle}>Add Menu Item</span>
          <button className={styles.drawerClose} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className={styles.drawerScroll}>
          <ItemForm
            foodTypes={foodTypes}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitting={submitting}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Detail / Edit Drawer
// ─────────────────────────────────────────
function ItemDetailDrawer({ item, foodTypes, onClose, onUpdated }) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling]   = useState(false);
  const [error, setError]         = useState(null);

  const handleEdit = async (form) => {
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      await updateMenuItem(item.itemId, form, token);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    setError(null);
    try {
      const token = await getToken();
      await setMenuItemStatus(item.itemId, !item.isActive, token);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  };

  const foodTypeName = foodTypes.find(ft => ft.foodTypeCode === item.foodTypeCode)?.displayName
    || item.foodTypeCode;

  return (
    <div className={styles.drawerOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>
            {mode === 'edit' ? 'Edit Item' : 'Item Detail'}
          </span>
          <button className={styles.drawerClose} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className={styles.drawerScroll}>
          {mode === 'view' ? (
            <div className={styles.formBody}>

              {/* Item hero */}
              <div className={styles.detailHero}>
                <div className={styles.detailIcon}>
                  <i className="ti ti-tool" />
                </div>
                <div>
                  <h2 className={styles.detailName}>{item.itemName}</h2>
                  <span className={`${styles.badge} ${statusBadge(item.isActive).cls}`}>
                    {statusBadge(item.isActive).text}
                  </span>
                </div>
              </div>

              {/* Fields */}
              <div className={styles.detailGrid}>
                {[
                  { label: 'Food Type',  value: foodTypeName },
                  { label: 'Base Unit',  value: item.baseUnit },
                  { label: 'Sort Order', value: item.sortOrder ?? 0 },
                  { label: 'Feedback',   value: item.supportsFeedback ? 'Yes' : 'No' },
                  { label: 'Rate',       value: item.supportsRate ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label} className={styles.detailRow}>
                    <span className={styles.detailKey}>{label}</span>
                    <span className={styles.detailVal}>{value}</span>
                  </div>
                ))}

                {/* Service categories */}
                <div className={styles.detailRow} style={{ alignItems: 'flex-start' }}>
                  <span className={styles.detailKey}>Services</span>
                  <div className={styles.chipWrap}>
                    {item.serviceCategories?.length > 0
                      ? item.serviceCategories.map(c => (
                          <span key={c} className={styles.detailChip}>{categoryLabel(c)}</span>
                        ))
                      : <span className={styles.muted}>None assigned</span>
                    }
                  </div>
                </div>
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <i className="ti ti-alert-circle" /> {error}
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  className={item.isActive ? styles.deactivateBtn : styles.activateBtn}
                  onClick={handleToggleStatus}
                  disabled={toggling}
                >
                  {toggling
                    ? <><div className={styles.spinnerSmall} /> Updating…</>
                    : item.isActive
                      ? <><i className="ti ti-eye-off" /> Deactivate</>
                      : <><i className="ti ti-eye" /> Activate</>
                  }
                </button>
                <button className={styles.submitBtn} onClick={() => setMode('edit')}>
                  <i className="ti ti-edit" /> Edit
                </button>
              </div>
            </div>
          ) : (
            <ItemForm
              initial={item}
              foodTypes={foodTypes}
              onSubmit={handleEdit}
              onCancel={() => setMode('view')}
              submitting={submitting}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main page
// ─────────────────────────────────────────
export default function MenuManagementPage() {
  const { getToken } = useAuth();

  const [items, setItems]           = useState([]);
  const [foodTypes, setFoodTypes]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Filters
  const [search, setSearch]               = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive]   = useState('true'); // default show active

  // UI state
  const [showAddDrawer, setShowAddDrawer]     = useState(false);
  const [selectedItem, setSelectedItem]       = useState(null);

  // Load food types once
  useEffect(() => {
    getToken().then(token =>
      getFoodTypes(token)
        .then(setFoodTypes)
        .catch(() => setFoodTypes([]))
    );
  }, [getToken]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await getMenuItems({
        search:          search || undefined,
        serviceCategory: filterCategory || undefined,
        isActive:        filterActive !== '' ? filterActive === 'true' : undefined,
        limit:           300,
      }, token);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, search, filterCategory, filterActive]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => loadItems(), 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Menu Management</h1>
          <p className={styles.pageSub}>
            {loading ? 'Loading…' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowAddDrawer(true)}>
          <i className="ti ti-plus" /> Add Item
        </button>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filterBar}>

        {/* Search */}
        <div className={styles.searchWrap}>
          <i className="ti ti-search" style={{ color: '#aac8bc', fontSize: 16 }} />
          <input
            className={styles.searchInput}
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {/* Service category filter */}
        <select
          className={styles.selectFilter}
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {SERVICE_CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Active filter */}
        <div className={styles.filterGroup}>
          {[['true', 'Active'], ['false', 'Inactive'], ['', 'All']].map(([val, label]) => (
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
            <span>Loading items…</span>
          </div>
        )}

        {error && (
          <div className={styles.errorBox} style={{ margin: 20 }}>
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className={styles.emptyState}>
            <i className="ti ti-tools" style={{ fontSize: 36, color: '#C6F0E5' }} />
            <p>No menu items found</p>
            {(search || filterCategory) && (
              <span>Try clearing the filters</span>
            )}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Food Type</th>
                <th>Unit</th>
                <th>Services</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const sb = statusBadge(item.isActive);
                const ftName = foodTypes.find(ft => ft.foodTypeCode === item.foodTypeCode)?.displayName
                  || item.foodTypeCode;
                return (
                  <tr
                    key={item.itemId}
                    className={styles.tableRow}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className={styles.itemNameCell}>{item.itemName}</td>
                    <td className={styles.muted}>{ftName}</td>
                    <td className={styles.muted}>{item.baseUnit}</td>
                    <td>
                      <div className={styles.chipWrap}>
                        {item.serviceCategories?.slice(0, 2).map(c => (
                          <span key={c} className={styles.categoryTagSmall}>
                            {categoryLabel(c)}
                          </span>
                        ))}
                        {item.serviceCategories?.length > 2 && (
                          <span className={styles.categoryTagMore}>
                            +{item.serviceCategories.length - 2}
                          </span>
                        )}
                        {(!item.serviceCategories || item.serviceCategories.length === 0) && (
                          <span className={styles.muted}>—</span>
                        )}
                      </div>
                    </td>
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
        <AddItemDrawer
          foodTypes={foodTypes}
          onClose={() => setShowAddDrawer(false)}
          onAdded={loadItems}
        />
      )}

      {selectedItem && (
        <ItemDetailDrawer
          item={selectedItem}
          foodTypes={foodTypes}
          onClose={() => setSelectedItem(null)}
          onUpdated={loadItems}
        />
      )}

    </div>
  );
}
