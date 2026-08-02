// ────────────────────────────────────────────────────────
// Sidebar.jsx — Role-Based Navigation
// HomiLabs | Servio | Web
// Updated: Contact Us added to all employee-facing roles
// ────────────────────────────────────────────────────────
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

// ── Nav config per role ──
const NAV_CONFIG = {
  employee: [
    {
      section: 'My Space',
      items: [
        { label: 'Home',          icon: 'home',           to: '/dashboard' },
        { label: 'My Profile',    icon: 'user',           to: '/profile' },
        { label: 'My Family',     icon: 'users',          to: '/my-family' },
      ],
    },
    {
      section: 'Mess & Dining',
      items: [
        { label: 'Book a Meal',   icon: 'shopping-bag',   to: '/book-meal' },
        { label: 'My Bookings',   icon: 'history',        to: '/my-bookings' },
        { label: 'My Bill',       icon: 'receipt',        to: '/my-bill' },
        { label: 'Feedback',      icon: 'star',           to: '/feedback' },
      ],
    },
    {
      section: 'Café',
      items: [
        { label: 'Café',          icon: 'coffee',         to: '/cafe' },
        { label: 'My Café Orders', icon: 'receipt',       to: '/my-cafe-orders' },
      ],
    },
    {
      section: 'Tea Bar',
      items: [
        { label: 'Tea Bar',           icon: 'cup',     to: '/teabar-order' },
        { label: 'My Tea Bar Orders', icon: 'receipt', to: '/my-teabar-orders' },
      ],
    },
    {
      section: 'BBQ',
      items: [
        { label: 'BBQ Preorder',   icon: 'meat',      to: '/bbq-preorder' },
        { label: 'BBQ Live Order', icon: 'flame',     to: '/bbq-live-order' },
        { label: 'My BBQ Orders',  icon: 'receipt',   to: '/my-bbq-orders' },
        { label: 'Table Request',  icon: 'armchair',  to: '/bbq-table-request' },
      ],
    },
    {
      section: 'Club',
      items: [
        { label: 'Events',        icon: 'calendar-event', to: '/events' },
        { label: 'Notifications', icon: 'bell',           to: '/notifications' },
        { label: 'Contact Us',    icon: 'phone',          to: '/contact' },
      ],
    },
  ],

  mess_supervisor: [
    {
      section: 'Operations',
      items: [
        { label: 'Home',                  icon: 'home',           to: '/dashboard' },
        { label: 'Issuance Dashboard',    icon: 'check',          to: '/issuance' },
        { label: 'Kitchen Dashboard',     icon: 'chef-hat',       to: '/kitchen' },
        { label: 'Proxy Booking',         icon: 'users',          to: '/proxy-booking' },
        { label: 'Walk-in',               icon: 'door-enter',     to: '/walk-in' },
      ],
    },
    {
      section: 'View',
      items: [
        { label: 'Notifications', icon: 'bell',           to: '/notifications' },
      ],
    },
  ],

  accounts_supervisor: [
    {
      section: 'Billing',
      items: [
        { label: 'Home',                icon: 'home',           to: '/dashboard' },
        { label: 'Rate Entry',          icon: 'coin',           to: '/rate-entry' },
        { label: 'Billing Dashboard',   icon: 'file-invoice',   to: '/billing' },
        { label: 'Official Accounts',   icon: 'building-bank',  to: '/official-accounts' },
      ],
    },
    {
      section: 'Reports',
      items: [
        { label: 'Notifications', icon: 'bell',           to: '/notifications' },
      ],
    },
  ],

  cafe_supervisor: [
    {
      section: 'Café Operations',
      items: [
        { label: 'Home',          icon: 'home',     to: '/dashboard' },
        { label: 'Café Kitchen',  icon: 'coffee',   to: '/cafe-kitchen' },
        { label: 'Café History',  icon: 'history',  to: '/cafe-history' },
        { label: 'Proxy Order',   icon: 'shopping-bag', to: '/cafe-proxy-order' },
        { label: 'Official Order', icon: 'receipt',      to: '/cafe-official' },
      ],
    },
  ],

  teabar_attendant: [
    {
      section: 'Tea Bar Operations',
      items: [
        { label: 'Home',           icon: 'home',          to: '/dashboard' },
        { label: 'Dashboard',      icon: 'cup',            to: '/teabar-dashboard' },
        { label: 'Proxy Order',    icon: 'shopping-bag',   to: '/teabar-proxy-order' },
        { label: 'Official Order', icon: 'receipt',        to: '/teabar-official-order' },
      ],
    },
  ],

  bbq_supervisor: [
    {
      section: 'BBQ Operations',
      items: [
        { label: 'Home',              icon: 'home',     to: '/dashboard' },
        { label: 'Kitchen Dashboard', icon: 'chef-hat', to: '/bbq-kitchen' },
        { label: 'Live Item Counts',  icon: 'chart-bar', to: '/bbq-live-counts' },
        { label: 'Proxy Order',       icon: 'shopping-bag', to: '/bbq-proxy-order' },
        { label: 'Official Order',    icon: 'receipt',      to: '/bbq-official-order' },
        { label: 'History',           icon: 'history',      to: '/bbq-history' },
      ],
    },
  ],

  cafe_waiter: [
    {
      section: 'Café Operations',
      items: [
        { label: 'Home',          icon: 'home',     to: '/dashboard' },
        { label: 'Café Kitchen',  icon: 'coffee',   to: '/cafe-kitchen' },
        { label: 'Proxy Order',   icon: 'shopping-bag', to: '/cafe-proxy-order' },
      ],
    },
  ],

  // In Sidebar.jsx NAV_CONFIG, add alongside cafe_supervisor/cafe_waiter:
  cafe_bakery_tuckshop_supervisor: [
    {
      section: 'Café Operations',
      items: [
        { label: 'Home',          icon: 'home',     to: '/dashboard' },
        { label: 'Café Kitchen',  icon: 'coffee',   to: '/cafe-kitchen' },
        { label: 'Proxy Order',   icon: 'shopping-bag', to: '/cafe-proxy-order' },
        { label: 'Official Order', icon: 'receipt',      to: '/cafe-official' },
      ],
    },
  ],

  manager: [
    {
      section: 'Club Operations',
      items: [
        { label: 'Home',                  icon: 'home',           to: '/dashboard' },
        { label: 'Menu Management',       icon: 'tool',           to: '/menu' },
        { label: 'Templates & Cycles',    icon: 'calendar',       to: '/templates' },
        { label: 'Events',                icon: 'calendar-event', to: '/events' },
        { label: 'Café Kitchen',          icon: 'coffee',         to: '/cafe-kitchen' },
        { label: 'Café History',          icon: 'history',        to: '/cafe-history' },
        { label: 'Proxy Order',           icon: 'shopping-bag',   to: '/cafe-proxy-order' },
        { label: 'Official Order',        icon: 'receipt',        to: '/cafe-official' },
      ],
    },
    {
      section: 'Tea Bar',
      items: [
        { label: 'Locations', icon: 'map-pin', to: '/teabar-locations' },
        { label: 'History',   icon: 'history', to: '/teabar-history' },
      ],
    },
    {
      section: 'BBQ',
      items: [
        { label: 'Table Confirmation', icon: 'clipboard-check', to: '/bbq-table-confirmation' },
        { label: 'Exception Queue',    icon: 'alert-triangle',  to: '/bbq-exceptions' },
        { label: 'Proxy Order',        icon: 'shopping-bag',    to: '/bbq-proxy-order' },
        { label: 'Official Order',     icon: 'receipt',         to: '/bbq-official-order' },
        { label: 'History',            icon: 'history',         to: '/bbq-history' },
        { label: 'Menu Draft',         icon: 'meat',            to: '/bbq-menu-draft' },
      ],
    },
    {
      section: 'Reports & Admin',
      items: [
        { label: 'Reports',         icon: 'chart-bar',    to: '/reports' },
        { label: 'Notifications',   icon: 'bell',         to: '/notifications' },
        { label: 'Contact Us',      icon: 'phone',        to: '/contact' },
      ],
    },
  ],

  admin: [
    {
      section: 'Administration',
      items: [
        { label: 'Home',                  icon: 'home',         to: '/dashboard' },
        { label: 'Employee Master',       icon: 'users',        to: '/employees' },
        { label: 'User Management',       icon: 'user-check',   to: '/users' },
        { label: 'Menu Management',       icon: 'tool',         to: '/menu' },
        { label: 'Templates & Cycles',    icon: 'calendar',     to: '/templates' },
      ],
    },
    { 
      section: 'Tea Bar',
      items: [
        { label: 'Locations', icon: 'map-pin', to: '/teabar-locations' },
        { label: 'Approvals', icon: 'receipt-2', to: '/teabar-official-approvals' },
        { label: 'History',   icon: 'history', to: '/teabar-history' },
      ],
    },
    {
      section: 'BBQ',
      items: [
        { label: 'Table Approval',     icon: 'clipboard-check', to: '/bbq-table-approval' },
        { label: 'Official Approvals', icon: 'receipt-2',       to: '/bbq-official-pending' },
        { label: 'History',            icon: 'history',         to: '/bbq-history' },
        { label: 'Menu Approvals',     icon: 'meat',            to: '/bbq-menu-approve' },
      ],
    },
    {
      section: 'Operations',
      items: [
        { label: 'Events',          icon: 'calendar-event', to: '/events' },
        { label: 'Café History',    icon: 'history',        to: '/cafe-history' },
        { label: 'Reports',         icon: 'chart-bar',      to: '/reports' },
        { label: 'Feedback Review',      icon: 'message-dots',   to: '/feedback-admin' },
        { label: 'Guest Approvals',      icon: 'user-check',     to: '/guest-approvals' },
        { label: 'Café Approvals',        icon: 'receipt-2',      to: '/cafe-official-pending' },
        { label: 'App Settings',    icon: 'settings',       to: '/settings' },
        { label: 'Contact Us',      icon: 'phone',          to: '/contact' },
        { label: 'Notifications',   icon: 'bell',           to: '/notifications' },
      ],
    },
  ],

  super_admin: [
    {
      section: 'System',
      items: [
        { label: 'Home',              icon: 'home',       to: '/dashboard' },
        { label: 'Tenant Config',     icon: 'building',   to: '/tenant' },
        { label: 'All Users',         icon: 'users',      to: '/users' },
        { label: 'App Settings',      icon: 'settings',   to: '/settings' },
        { label: 'Deployment Config', icon: 'database',   to: '/deployment' },
      ],
    },
    { 
      section: 'Tea Bar',
      items: [
        { label: 'Locations', icon: 'map-pin', to: '/teabar-locations' },
        { label: 'Approvals', icon: 'receipt-2', to: '/teabar-official-approvals' },
        { label: 'History',   icon: 'history', to: '/teabar-history' },
      ],
    },
    {
      section: 'Platform',
      items: [
        { label: 'System Reports',  icon: 'chart-bar',  to: '/reports' },
        { label: 'Security Log',    icon: 'shield',     to: '/security' },
        { label: 'System Alerts',   icon: 'bell',       to: '/notifications' },
      ],
    },
  ],
};

function getNav(role) {
  return NAV_CONFIG[role] || NAV_CONFIG['employee'];
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function roleLabel(role) {
  if (!role) return '';
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Sidebar({ collapsed }) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const role     = userProfile?.user?.role || 'employee';
  const fullName = userProfile?.employee?.fullName || userProfile?.user?.officialEmployeeNumber || '–';
  const empNum   = userProfile?.user?.officialEmployeeNumber || '';
  const sections = getNav(role);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

      {/* ── User block ── */}
      <div className={styles.userBlock}>
        <div className={styles.avatar}>
          {getInitials(fullName)}
        </div>
        {!collapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{fullName}</span>
            <span className={styles.empNum}>{empNum}</span>
            <span className={styles.roleBadge}>{roleLabel(role)}</span>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={styles.nav}>
        {sections.map(({ section, items }) => (
          <div key={section} className={styles.navSection}>
            {!collapsed && (
              <span className={styles.sectionLabel}>{section}</span>
            )}
            {items.map(({ label, icon, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navActive : ''}`
                }
                title={collapsed ? label : undefined}
              >
                <i className={`ti ti-${icon} ${styles.navIcon}`} />
                {!collapsed && <span className={styles.navLabel}>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Bottom logout ── */}
      <div className={styles.sidebarFooter}>
        <button
          className={styles.logoutLink}
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
        >
          <i className="ti ti-logout" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

    </aside>
  );
}
