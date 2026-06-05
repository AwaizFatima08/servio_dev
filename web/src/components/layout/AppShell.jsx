// ─────────────────────────────────────────
// AppShell.jsx — Authenticated Layout Wrapper
// HomiLabs | Servio | Web
// ─────────────────────────────────────────
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomStrip from '../common/BottomStrip';
import styles from './AppShell.module.css';

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={styles.shell}>
      <TopBar onMenuToggle={() => setSidebarCollapsed(p => !p)} />
      <div className={styles.body}>
        <Sidebar collapsed={sidebarCollapsed} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <BottomStrip />
    </div>
  );
}
