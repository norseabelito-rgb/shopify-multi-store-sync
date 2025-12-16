// ui/dashboardPage.js

function dashboardPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Multi-Store Hub</title>
  <style>
    :root {
      --bg: #020617;
      --bg-deep: #020617;
      --sidebar: #020617;
      --panel: rgba(11, 15, 25, 0.96);
      --panel-soft: rgba(15, 23, 42, 0.96);
      --border: rgba(148, 163, 184, 0.2);
      --border-soft: rgba(148, 163, 184, 0.12);
      --text: #e5e7eb;
      --muted: #9ca3af;
      --accent: #4f8cff;
      --accent-soft: rgba(79, 140, 255, 0.18);
      --danger: #fb7185;
      --success: #22c55e;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
        "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.25), transparent 55%),
        radial-gradient(circle at 130% -10%, rgba(45, 212, 191, 0.18), transparent 55%),
        linear-gradient(150deg, #020617, #020617 40%, #020617);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
    }

    .app-shell {
      display: flex;
      min-height: 100vh;
      height: 100vh;
      overflow: hidden;
    }

    /* SIDEBAR */

    .sidebar {
      width: 260px;
      padding: 18px 18px 14px;
      background:
        radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.36), transparent 60%),
        linear-gradient(180deg, #020617, #030712 50%, #020617);
      border-right: 1px solid rgba(15, 23, 42, 0.9);
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .brand-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .brand-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .beta-pill {
      font-size: 10px;
      padding: 3px 6px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 23, 42, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .sidebar-section-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin: 10px 0 4px;
    }

    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      border-radius: 10px;
      border: 1px solid transparent;
      padding: 7px 9px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e5e7eb;
      cursor: pointer;
      background: transparent;
      text-align: left;
    }

    .nav-item span {
      flex: 1;
    }

    .nav-item small {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
    }

    .nav-item.active {
      border-color: rgba(79, 140, 255, 0.7);
      background: radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.3), rgba(15, 23, 42, 0.96));
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.9);
    }

    .nav-action {
      border-color: rgba(148, 163, 184, 0.25);
      background: rgba(15, 23, 42, 0.8);
      color: #cbd5e1;
      font-size: 12px;
    }

    .nav-action:hover {
      border-color: rgba(79, 140, 255, 0.45);
    }

    .nav-action.is-loading {
      opacity: 0.6;
      cursor: wait;
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid rgba(15, 23, 42, 0.9);
    }

    .sidebar-footer-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .context-select {
      width: 100%;
      padding: 7px 9px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.96);
      color: var(--text);
      font-size: 12px;
    }

    .sidebar-footer-hint {
      margin-top: 4px;
      font-size: 10px;
      color: var(--muted);
    }

    .sidebar-footer-env {
      margin-top: 8px;
      font-size: 10px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }

    /* MAIN */

    .main {
      flex: 1;
      padding: 20px 26px 26px;
      height: 100vh;
      overflow-y: auto;
    }

    .main-inner {
      max-width: 1600px; /* mai întins, mai puțin spațiu mort */
      margin: 0 auto;
    }

    .top-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .top-title-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 10px;
      color: var(--muted);
    }

    .page-title {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .page-subtitle {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }

    .context-pill {
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.2), transparent 55%);
      color: #e5e7eb;
    }

    .context-pill span:first-child {
      opacity: 0.6;
      margin-right: 6px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 9px;
    }

    .sync-status {
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-soft);
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sync-label {
      opacity: 0.7;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sync-time {
      color: var(--text);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    /* REFRESH BUTTON */
    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.6);
      color: var(--text);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      background: rgba(15, 23, 42, 0.8);
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    .refresh-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .refresh-btn svg {
      transition: transform 0.6s ease;
    }

    .refresh-btn.refreshing svg {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .refresh-status {
      font-size: 11px;
      color: var(--muted);
      font-weight: 400;
    }

    .refresh-status.success {
      color: var(--success, #10b981);
    }

    .refresh-status.error {
      color: var(--danger, #ef4444);
    }

    /* STAT CARDS (top) */

    .grid-top {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: var(--panel);
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 11px 12px;
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .stat-main {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .stat-chip {
      align-self: flex-start;
      padding: 3px 7px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.9);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .stat-desc {
      margin-top: 4px;
      font-size: 11px;
      color: var(--muted);
    }

    /* PANELS */

    .panel {
      background: var(--panel-soft);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 14px 16px 12px;
      margin-bottom: 16px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .panel-title-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #cbd5f5;
    }

    .panel-subtitle {
      font-size: 11px;
      color: var(--muted);
    }

    .badge-soft {
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.9);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    /* TABLE HOME */

    .table-wrapper {
      border-radius: 12px;
      border: 1px solid rgba(15, 23, 42, 0.9);
      overflow: hidden;
      background: radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.98));
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      color: #e5e7eb;
    }

    thead {
      background: rgba(15, 23, 42, 0.98);
    }

    th,
    td {
      padding: 9px 10px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.9);
    }

    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9ca3af;
      text-align: left;
    }

    th.numeric,
    td.numeric {
      text-align: center; /* cifre centrate */
    }

    tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.9);
    }

    tbody tr:hover {
      background: rgba(30, 64, 175, 0.55);
    }

    .store-name-cell {
      font-weight: 500;
    }

    .muted {
      color: var(--muted);
      font-size: 11px;
    }

    .empty-state {
      text-align: center;
      padding: 30px 12px 32px;
      color: var(--muted);
      font-size: 13px;
    }

    .empty-state strong {
      display: block;
      margin-bottom: 4px;
      color: #e5e7eb;
      font-size: 14px;
    }

    /* MY STORES – cards */

    .stores-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    @media (max-width: 1200px) {
      .stores-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 900px) {
      .stores-grid { grid-template-columns: minmax(0, 1fr); }
    }

    .store-card {
      border-radius: 14px;
      border: 1px solid var(--border-soft);
      background: radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.98));
      padding: 12px 13px 11px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .store-card-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
    }

    .store-name {
      font-size: 13px;
      font-weight: 600;
    }

    .store-domain {
      font-size: 11px;
      color: var(--muted);
    }

    .store-stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .stat-chip-store {
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 23, 42, 0.96);
      padding: 6px 7px;
    }

    .stat-chip-label {
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 3px;
    }

    .stat-chip-value {
      font-size: 13px;
      font-weight: 600;
      text-align: center;
    }

    /* EXEC header single store */

    .exec-store-header {
      display: none;
      justify-content: space-between;
      align-items: center;
      border-radius: 16px;
      border: 1px solid var(--border);
      background:
        radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.4), rgba(15, 23, 42, 0.98));
      padding: 14px 16px;
      margin-bottom: 12px;
    }

    .exec-left h2 {
      margin: 0 0 4px;
      font-size: 18px;
    }

    .exec-left p {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }

    .exec-right {
      display: flex;
      gap: 10px;
    }

    .exec-kpi {
      min-width: 100px;
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--border-soft);
      text-align: center;
    }

    .exec-kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 3px;
    }

    .exec-kpi-value {
      font-size: 15px;
      font-weight: 600;
    }

    /* BUTTONS */

    .btn {
      border-radius: 999px;
      border: 1px solid var(--border);
      padding: 7px 14px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      background: rgba(15, 23, 42, 0.92);
      color: #e5e7eb;
      cursor: pointer;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent), #22c1c3);
      color: #020617;
      border-color: transparent;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* VIEWS */

    .view {
      display: none;
    }
    .view.active {
      display: block;
    }

    /* ORDERS */

    .orders-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      position: sticky;
      top: 0;
      z-index: 3;
      background: var(--panel-soft);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 10px 30px rgba(2,6,23,0.45);
    }

    .orders-search {
      flex: 1;
      min-width: 220px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.9);
    }

    .orders-search input {
      flex: 1;
      background: transparent;
      border: 0;
      outline: none;
      color: var(--text);
      font-size: 12px;
    }

    .filter-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.92);
      color: var(--muted);
      font-size: 11px;
    }

    .filter-chip input,
    .filter-chip select {
      background: transparent;
      border: 0;
      outline: none;
      color: var(--text);
      font-size: 12px;
    }

    .filter-chip select option {
      background: #0b0f19;
      color: #e5e7eb;
    }

    .orders-meta {
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .orders-table-wrapper {
      position: relative;
      max-height: calc(100vh - 360px);
      overflow: auto;
      border-radius: 12px;
      border: 1px solid rgba(15, 23, 42, 0.9);
      background: radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.98));
      min-height: 180px;
    }

    .orders-table-wrapper table tbody tr {
      cursor: pointer;
    }

    .orders-table-wrapper table tbody tr:active {
      background: rgba(79, 140, 255, 0.3);
    }

    .orders-table-shell {
      display: none;
    }

    .order-customer {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .order-sub {
      color: var(--muted);
      font-size: 11px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.85);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .status-pill.status-paid,
    .status-pill.status-fulfilled,
    .status-pill.status-success {
      border-color: rgba(34, 197, 94, 0.5);
      background: rgba(34, 197, 94, 0.12);
      color: #bbf7d0;
    }

    .status-pill.status-open {
      border-color: rgba(79, 140, 255, 0.5);
      background: rgba(79, 140, 255, 0.12);
      color: #bfdbfe;
    }

    .status-pill.status-cancelled,
    .status-pill.status-voided {
      border-color: rgba(251, 113, 133, 0.5);
      background: rgba(251, 113, 133, 0.16);
      color: #fecdd3;
    }

    .status-pill.status-pending {
      border-color: rgba(234, 179, 8, 0.5);
      background: rgba(234, 179, 8, 0.12);
      color: #fef3c7;
    }

    .orders-empty-inline {
      text-align: center;
      padding: 20px 10px;
      color: var(--muted);
    }

    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.6);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      z-index: 20;
    }

    .drawer-backdrop.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .drawer-stack {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 500px;
      max-width: 95vw;
      pointer-events: none;
      z-index: 30;
      padding: 10px;
      box-sizing: border-box;
    }

    .drawer-panel {
      height: 100%;
      width: 100%;
      background: rgba(11, 15, 25, 0.98);
      border-left: 1px solid var(--border);
      box-shadow: -12px 0 40px rgba(0, 0, 0, 0.45);
      transform: translateX(100%);
      transition: transform 0.28s ease, opacity 0.28s ease;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      opacity: 0;
      border-radius: 12px 0 0 12px;
      overflow: hidden;
    }

    .drawer-panel.open {
      transform: translateX(0);
      opacity: 1;
    }

    @media (max-width: 1100px) {
      .drawer-stack { width: 420px; }
    }

    .drawer-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .drawer-tabs {
      display: flex;
      gap: 8px;
      padding: 10px 16px 6px;
    }

    .drawer-tab {
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.9);
      color: #e5e7eb;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
    }

    .drawer-tab.active {
      border-color: rgba(79, 140, 255, 0.7);
      background: radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.25), rgba(15, 23, 42, 0.96));
    }

    .drawer-tab:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .drawer-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-soft);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      position: relative;
    }

    .drawer-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .drawer-body {
      padding: 14px 16px 18px;
      overflow-y: auto;
      flex: 1;
    }

    .drawer-section {
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-soft);
    }

    .drawer-section:last-child {
      border-bottom: 0;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .drawer-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border-soft);
      background: rgba(11, 15, 25, 0.96);
      position: sticky;
      bottom: 0;
    }

    .drawer-close {
      position: absolute;
      top: 10px;
      right: 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(15,23,42,0.95);
      color: #e5e7eb;
      padding: 6px 8px;
      font-size: 11px;
      cursor: pointer;
    }

    .section-heading {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .kv-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      margin-bottom: 6px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 7px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.9);
      font-size: 11px;
    }

    .product-choice.active {
      border-color: rgba(79, 140, 255, 0.7);
      background: rgba(79, 140, 255, 0.18);
    }

    .product-choice {
      color: var(--text);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.9);
      justify-content: flex-start;
      text-align: left;
      white-space: normal;
      line-height: 1.3;
    }

    .line-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-soft);
    }

    .line-item:last-child {
      border-bottom: 0;
    }

    .line-item-left {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      flex: 1;
      min-width: 0;
    }

    .line-thumb {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid var(--border-soft);
      background: radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.22), rgba(15, 23, 42, 0.9));
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }

    .line-item-title {
      font-weight: 500;
      font-size: 12px;
      text-align: left;
      display: block;
    }

    .line-item-title .link-inline {
      display: block;
      text-align: left;
      white-space: normal;
    }

    .line-item-left > div {
      min-width: 0;
    }

    .line-item-right {
      text-align: right;
      flex-shrink: 0;
    }

    .link-inline {
      background: none;
      border: 0;
      padding: 0;
      color: #93c5fd;
      cursor: pointer;
      font-size: 12px;
    }

    .drawer-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }

    .stat-card-mini {
      border: 1px solid var(--border-soft);
      border-radius: 12px;
      padding: 8px 9px;
      background: rgba(15, 23, 42, 0.92);
    }

    .stat-card-mini .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 4px;
      display: block;
    }

    .stat-card-mini .value {
      font-size: 14px;
      font-weight: 600;
    }

    .btn-ghost {
      border-color: var(--border);
      background: rgba(15, 23, 42, 0.82);
      color: #e5e7eb;
    }

    .btn-shopify {
      background: linear-gradient(135deg, #0b9b6b, #008060);
      color: #f8fafc;
      border: 1px solid rgba(0, 128, 96, 0.7);
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      box-shadow: 0 10px 24px rgba(34, 197, 94, 0.35);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }

    .btn-shopify:hover {
      filter: brightness(1.08);
    }

    .orders-pagination {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
    }

    .pagination-btn {
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(15,23,42,0.92);
      color: #e5e7eb;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
    }

    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination-page {
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      background: rgba(15,23,42,0.9);
      color: #e5e7eb;
      padding: 6px 10px;
      cursor: pointer;
      min-width: 34px;
      text-align: center;
    }

    .pagination-page.active {
      border-color: rgba(79, 140, 255, 0.6);
      background: rgba(79, 140, 255, 0.18);
      color: #e5e7eb;
    }

    .pagination-ellipsis {
      padding: 0 6px;
      color: var(--muted);
    }

    /* DAILY REPORTS */

    .reports-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .reports-month-selector {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      justify-content: center;
    }

    #reports-current-month {
      font-size: 14px;
      font-weight: 600;
      min-width: 150px;
      text-align: center;
    }

    .reports-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      margin-bottom: 24px;
      padding: 16px;
      background: var(--panel-soft);
      border-radius: 12px;
      border: 1px solid var(--border-soft);
    }

    .reports-calendar-cell {
      aspect-ratio: 1;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      background: var(--panel);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .reports-calendar-cell:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .reports-calendar-cell.selected {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .reports-calendar-cell.today {
      border-color: var(--success);
    }

    .reports-calendar-cell.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .reports-calendar-day {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .reports-calendar-count {
      font-size: 10px;
      color: var(--muted);
    }

    .reports-main-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 16px;
    }

    .reports-people-panel,
    .reports-editor-panel {
      background: var(--panel-soft);
      border-radius: 12px;
      border: 1px solid var(--border-soft);
      padding: 16px;
    }

    .reports-search-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 12px;
      margin-top: 8px;
    }

    .reports-people-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reports-person-item {
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      background: var(--panel);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .reports-person-item:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .reports-person-item.selected {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .reports-person-name {
      font-size: 13px;
      font-weight: 500;
    }

    .reports-person-status {
      font-size: 16px;
    }

    .reports-editor-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .reports-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reports-form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
    }

    .reports-form-textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
    }

    .reports-form-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
    }

    .reports-items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reports-item-card {
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      background: var(--panel);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reports-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .reports-item-remove {
      background: var(--danger);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
    }

    .btn-primary {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #3d7ae5;
    }

    .btn-secondary {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .btn-icon {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    /* ==================== DAILY REPORTS (DAY-CENTRIC) ==================== */

    .reports-container {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
      height: calc(100vh - 120px);
    }

    /* Left Panel: Calendar + Filters */
    .reports-left-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .reports-calendar-section {
      background: var(--panel);
      border-radius: 12px;
      border: 1px solid var(--border);
      padding: 16px;
      overflow: hidden;
    }

    .reports-month-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .reports-month-label {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      flex: 1;
      text-align: center;
    }

    .reports-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      width: 100%;
    }

    .reports-calendar-cell {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-soft);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 0;
      font-size: 11px;
    }

    .reports-calendar-cell.empty {
      background: transparent;
      border: none;
      cursor: default;
    }

    .reports-calendar-cell:not(.empty):hover {
      background: rgba(79, 140, 255, 0.15);
      border-color: var(--accent);
    }

    .reports-calendar-cell.today {
      border-color: var(--accent);
      background: rgba(79, 140, 255, 0.2);
    }

    .reports-calendar-cell.selected {
      background: var(--accent);
      border-color: var(--accent);
    }

    .reports-calendar-cell.has-reports {
      background: rgba(34, 197, 94, 0.15);
    }

    .reports-calendar-day {
      font-size: 13px;
      font-weight: 600;
    }

    .reports-calendar-count {
      font-size: 9px;
      color: var(--muted);
      margin-top: 2px;
    }

    .reports-filters-section {
      background: var(--panel);
      border-radius: 12px;
      border: 1px solid var(--border);
      padding: 16px;
    }

    .reports-section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin: 0 0 12px 0;
    }

    .reports-filter-group {
      margin-bottom: 12px;
    }

    .reports-filter-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .reports-filter-input,
    .reports-filter-select {
      width: 100%;
      padding: 8px 10px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 13px;
    }

    .reports-filter-input:focus,
    .reports-filter-select:focus {
      outline: none;
      border-color: var(--accent);
    }

    /* Right Panel: Summary + Cards */
    .reports-right-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .reports-summary {
      background: var(--panel);
      border-radius: 12px;
      border: 1px solid var(--border);
      padding: 20px;
    }

    .reports-summary-prompt {
      text-align: center;
      color: var(--muted);
      margin: 0;
      font-size: 14px;
    }

    .reports-error-banner {
      background: rgba(251, 113, 133, 0.15);
      border: 1px solid var(--danger);
      border-radius: 10px;
      padding: 16px;
      color: var(--danger);
    }

    .reports-error-banner strong {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
    }

    .reports-summary-header h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .reports-summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .reports-stat-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-soft);
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }

    .reports-stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .reports-stat-value {
      font-size: 26px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .reports-cards-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 16px;
    }

    .reports-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
    }

    .reports-card:hover {
      border-color: var(--accent);
      box-shadow: 0 4px 16px rgba(79, 140, 255, 0.15);
    }

    .reports-card-empty {
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed var(--border);
    }

    .reports-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-soft);
    }

    .reports-card-person {
      flex: 1;
    }

    .reports-card-name {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .reports-card-email {
      font-size: 11px;
      color: var(--muted);
    }

    .reports-card-actions {
      display: flex;
      gap: 6px;
    }

    .reports-card-action-btn {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .reports-card-action-btn:hover {
      background: var(--accent);
      border-color: var(--accent);
    }

    .reports-card-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reports-card-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reports-card-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-weight: 600;
    }

    .reports-card-text {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
    }

    .reports-card-projects {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .reports-project-tag {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .reports-card-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-soft);
      font-size: 11px;
      color: var(--muted);
      text-align: right;
    }

    /* Modals */
    .reports-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .reports-modal-content {
      background: var(--panel);
      border-radius: 12px;
      border: 1px solid var(--border);
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .reports-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-soft);
      position: sticky;
      top: 0;
      background: var(--panel);
      z-index: 1;
    }

    .reports-modal-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .reports-modal-body {
      padding: 20px;
    }

    /* Forms */
    .reports-form-group {
      margin-bottom: 16px;
    }

    .reports-form-label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 8px;
      font-weight: 600;
    }

    .reports-form-input,
    .reports-form-textarea {
      width: 100%;
      padding: 10px 12px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
    }

    .reports-form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .reports-form-input:focus,
    .reports-form-textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    .reports-form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }

    .reports-save-indicator {
      color: var(--success);
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      padding: 10px;
      margin-top: 10px;
      background: rgba(34, 197, 94, 0.15);
      border-radius: 8px;
      border: 1px solid var(--success);
    }

    .reports-projects-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reports-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-soft);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .reports-checkbox-label:hover {
      background: rgba(79, 140, 255, 0.1);
      border-color: var(--accent);
    }

    .reports-checkbox-label input[type="checkbox"] {
      cursor: pointer;
    }

    .reports-checkbox-label span {
      font-size: 13px;
    }

    /* People & Projects Management Lists */
    .reports-people-management-list,
    .reports-projects-management-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }

    .reports-person-mgmt-item,
    .reports-project-mgmt-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-soft);
      border-radius: 8px;
    }

    .reports-person-name,
    .reports-project-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .reports-person-actions,
    .reports-project-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reports-person-status-badge,
    .reports-project-status-badge {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }

    .reports-project-color-box {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* History */
    .reports-history-item {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-soft);
    }

    .reports-history-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .reports-history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .reports-history-body {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-soft);
      border-radius: 8px;
      padding: 12px;
    }

    .reports-history-json {
      margin: 0;
      font-size: 11px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace;
      color: #a3e635;
      overflow-x: auto;
      white-space: pre;
    }

    /* Responsive adjustments */
    @media (max-width: 1200px) {
      .reports-container {
        grid-template-columns: 280px 1fr;
      }

      .reports-cards-container {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 900px) {
      .reports-container {
        grid-template-columns: 1fr;
        height: auto;
      }

      .reports-left-panel {
        max-height: 60vh;
      }

      .reports-summary-stats {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* ==================== AI INSIGHTS SECTION ==================== */

    .ai-insights-section {
      background: var(--panel-soft);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 14px 16px 14px;
      margin-bottom: 16px;
      position: relative;
    }

    .ai-insights-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .ai-insights-title-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ai-insights-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #cbd5f5;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ai-insights-title .ai-icon {
      width: 16px;
      height: 16px;
      opacity: 0.8;
    }

    .ai-insights-subtitle {
      font-size: 11px;
      color: var(--muted);
    }

    .ai-insights-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ai-regenerate-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.9);
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .ai-regenerate-btn:hover:not(:disabled) {
      background: rgba(79, 140, 255, 0.15);
      border-color: var(--accent);
      color: var(--accent);
    }

    .ai-regenerate-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .ai-regenerate-btn.loading svg {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .ai-cache-badge {
      padding: 3px 7px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.9);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .ai-cache-badge.hit {
      border-color: rgba(34, 197, 94, 0.3);
      color: var(--success);
    }

    .ai-insights-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .ai-insights-main {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ai-insight-summary {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text);
    }

    .ai-insight-bullets {
      margin: 0;
      padding-left: 16px;
      font-size: 12px;
      line-height: 1.6;
      color: #d1d5db;
    }

    .ai-insight-bullets li {
      margin-bottom: 4px;
    }

    .ai-insights-sidebar {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ai-insight-actions-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .ai-insight-actions-list {
      margin: 0;
      padding-left: 16px;
      font-size: 11px;
      line-height: 1.6;
      color: #93c5fd;
    }

    .ai-insight-actions-list li {
      margin-bottom: 4px;
    }

    .ai-insight-numbers {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ai-number-chip {
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.8);
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ai-number-chip .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
    }

    .ai-number-chip .value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }

    .ai-number-chip.warning .value {
      color: #fbbf24;
    }

    .ai-number-chip.danger .value {
      color: var(--danger);
    }

    .ai-insights-footer {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border-soft);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: var(--muted);
    }

    .ai-confidence {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ai-confidence-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .ai-confidence-badge.high,
    .ai-confidence-badge.ridicata {
      background: rgba(34, 197, 94, 0.15);
      color: var(--success);
    }

    .ai-confidence-badge.medium,
    .ai-confidence-badge.medie {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    .ai-confidence-badge.low,
    .ai-confidence-badge.scazuta {
      background: rgba(251, 113, 133, 0.15);
      color: var(--danger);
    }

    /* Product Sales specific styles */
    .ai-insights-sales {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .ai-insights-sales .ai-insights-main {
      flex: 1;
    }

    .ai-insights-sales .ai-insights-sidebar {
      flex-shrink: 0;
    }

    .ai-insights-header-summary {
      margin-bottom: 4px;
    }

    .ai-insight-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
    }

    .ai-season-context {
      margin-top: 6px;
      padding: 6px 10px;
      background: rgba(96, 165, 250, 0.1);
      border: 1px solid rgba(96, 165, 250, 0.2);
      border-radius: 6px;
      font-size: 11px;
      color: #93c5fd;
    }

    .ai-section {
      margin-bottom: 12px;
    }

    .ai-section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-bottom: 8px;
      font-weight: 600;
    }

    .ai-section-compact {
      margin-bottom: 8px;
    }

    .ai-products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }

    .ai-product-card {
      padding: 10px 12px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--border-soft);
      border-radius: 10px;
    }

    .ai-product-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
    }

    .ai-sku {
      font-size: 10px;
      color: var(--muted);
      font-weight: 400;
    }

    .ai-product-why {
      font-size: 11px;
      color: #93c5fd;
      margin-bottom: 4px;
    }

    .ai-product-metrics {
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .ai-product-stores {
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .ai-product-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .ai-action-tag {
      padding: 2px 6px;
      background: rgba(34, 197, 94, 0.15);
      border-radius: 4px;
      font-size: 9px;
      color: var(--success);
    }

    .ai-momentum-list,
    .ai-bestsellers-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ai-momentum-item,
    .ai-bestseller-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-soft);
      border-radius: 6px;
      font-size: 11px;
    }

    .ai-momentum-name,
    .ai-bestseller-name {
      font-weight: 500;
      color: var(--text);
      flex: 1;
    }

    .ai-momentum-trend {
      color: var(--success);
      font-size: 10px;
    }

    .ai-momentum-action {
      color: var(--muted);
      font-size: 10px;
    }

    .ai-bestseller-consistency {
      color: var(--muted);
      font-size: 10px;
    }

    .ai-insights-secondary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .ai-number-chip.positive .value {
      color: var(--success);
    }

    .ai-number-chip.negative .value {
      color: var(--danger);
    }

    @media (max-width: 700px) {
      .ai-insights-secondary {
        grid-template-columns: 1fr;
      }
      .ai-products-grid {
        grid-template-columns: 1fr;
      }
    }

    .ai-insights-skeleton {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-line {
      height: 14px;
      background: linear-gradient(90deg, rgba(148, 163, 184, 0.1) 25%, rgba(148, 163, 184, 0.2) 50%, rgba(148, 163, 184, 0.1) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-line.short { width: 40%; }
    .skeleton-line.medium { width: 70%; }
    .skeleton-line.long { width: 90%; }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .ai-insights-error {
      padding: 16px;
      background: rgba(251, 113, 133, 0.1);
      border: 1px solid rgba(251, 113, 133, 0.2);
      border-radius: 8px;
      color: #fecaca;
      font-size: 12px;
    }

    .ai-data-gaps {
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 6px;
      font-size: 11px;
      color: #fef3c7;
    }

    .ai-data-gaps-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    @media (max-width: 900px) {
      .ai-insights-content {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <header class="sidebar-header">
        <div class="brand">
          <div class="brand-title">Multi-Store Hub</div>
          <div class="brand-sub">Sync · Ads · Ops</div>
        </div>
        <div class="beta-pill">Beta</div>
      </header>

      <div>
        <div class="sidebar-section-label">Main</div>
        <div class="nav-list">
          <button class="nav-item" data-view="home">
            <span>Home</span>
          </button>
          <button class="nav-item" data-view="stores">
            <span>My Stores</span>
          </button>
        </div>
      </div>

      <div>
        <div class="sidebar-section-label">Marketing</div>
        <div class="nav-list">
          <button class="nav-item" data-view="ads-overview">
            <span>Ads Overview</span>
            <small>Coming soon</small>
          </button>
          <button class="nav-item" data-view="tiktok">
            <span>TikTok Ads</span>
          </button>
          <button class="nav-item" data-view="meta">
            <span>Meta Ads</span>
          </button>
          <button class="nav-item" data-view="google">
            <span>Google Ads</span>
          </button>
        </div>
      </div>

      <div>
        <div class="sidebar-section-label">Ops</div>
        <div class="nav-list">
          <a href="/products/ui" class="nav-item" style="text-decoration: none;">
            <span>Products</span>
            <small>Master</small>
          </a>
          <button class="nav-item" data-view="orders">
            <span>Orders</span>
          </button>
          <button class="nav-item" data-view="customers">
            <span>Customers</span>
          </button>
          <button class="nav-item" data-view="daily-reports">
            <span>Daily Reports</span>
          </button>
          <button class="nav-item" data-view="shipping">
            <span>Shipping</span>
          </button>
          <button class="nav-item" data-view="inventory">
            <span>Inventory</span>
          </button>
        </div>
      </div>

      <div>
        <div class="sidebar-section-label">Support</div>
        <div class="nav-list">
          <button class="nav-item" data-view="helpdesk">
            <span>Helpdesk</span>
          </button>
          <button class="nav-item" data-view="settings">
            <span>Settings</span>
          </button>
        </div>
      </div>

      <footer class="sidebar-footer">
        <div class="sidebar-footer-label">Store context</div>
        <select id="store-context-select" class="context-select">
          <option value="all">All stores</option>
        </select>
        <p class="sidebar-footer-hint">
          Orice view (Home, My Stores, Ads etc.) va afișa date doar pentru magazinul ales aici.
        </p>
        <div class="sidebar-footer-env">
          <span>Env: Railway</span>
          <span id="store-context-live">All stores</span>
        </div>
      </footer>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main">
      <div class="main-inner">
        <header class="top-line">
          <div class="top-title-block">
            <div class="eyebrow">Operational overview</div>
            <h1 class="page-title" id="page-title">Home</h1>
            <p class="page-subtitle" id="page-subtitle">
              Acum vezi date pentru <strong>toate magazinele</strong>.
            </p>
          </div>
          <div class="context-pill">
            <span>Context</span>
            <span id="context-label">All stores</span>
          </div>
          <div class="sync-status" id="sync-status-display" style="display:none;">
            <span class="sync-label">Last sync:</span>
            <span class="sync-time" id="sync-time">–</span>
          </div>
          <button class="refresh-btn" id="refresh-metrics-btn" title="Refresh metrics">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.65 2.35C12.2 0.9 10.21 0 8 0 3.58 0 0.01 3.58 0.01 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z" fill="currentColor"/>
            </svg>
            <span class="refresh-text">Refresh</span>
            <span class="refresh-status" id="refresh-status"></span>
          </button>
        </header>

        <!-- HOME VIEW -->
        <section id="view-home" class="view active">
          <section class="grid-top">
            <article class="stat-card">
              <div class="stat-label">Comenzi azi</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-today-home">–</div>
                <div class="stat-chip">Azi</div>
              </div>
              <p class="stat-desc">
                Comenzi înregistrate astăzi (Europe/Bucharest timezone).
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Comenzi săptămâna</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-week-home">–</div>
                <div class="stat-chip">Săptămână</div>
              </div>
              <p class="stat-desc">
                Comenzi din săptămâna curentă (luni - astăzi).
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Comenzi luna</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-month-home">–</div>
                <div class="stat-chip">Lună</div>
              </div>
              <p class="stat-desc">
                Comenzi în luna curentă (început lună - astăzi).
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Comenzi în acest an</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-year-home">–</div>
                <div class="stat-chip">YTD</div>
              </div>
              <p class="stat-desc">
                Total comenzi cumulate în anul curent.
              </p>
            </article>
          </section>

          <!-- AI INSIGHTS SECTION - Product Sales (Romanian) -->
          <section class="ai-insights-section" id="ai-insights-section">
            <div class="ai-insights-header">
              <div class="ai-insights-title-block">
                <div class="ai-insights-title">
                  <svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  Produse de Promovat
                </div>
                <div class="ai-insights-subtitle">Analiză AI - Ce să promovezi acum</div>
              </div>
              <div class="ai-insights-actions">
                <span class="ai-cache-badge" id="ai-cache-badge" style="display:none;">cached</span>
                <button class="ai-regenerate-btn" id="ai-regenerate-btn" title="Regenerează analiza">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M13.65 2.35C12.2 0.9 10.21 0 8 0 3.58 0 0.01 3.58 0.01 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z" fill="currentColor"/>
                  </svg>
                  <span>Regenerează</span>
                </button>
              </div>
            </div>
            <div id="ai-insights-body">
              <!-- Content loaded dynamically -->
              <div class="ai-insights-skeleton">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line long"></div>
                <div class="skeleton-line medium"></div>
                <div class="skeleton-line long"></div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Stores snapshot</div>
                <p class="panel-subtitle">
                  Detalii rapide pentru fiecare magazin din context.
                </p>
              </div>
              <div class="badge-soft" id="stores-count-home">0 stores</div>
            </div>

            <div id="home-table-wrapper" class="table-wrapper">
              <div class="empty-state" id="home-empty">
                <strong>Nu sunt magazine încărcate.</strong>
                Adaugă magazine în foaia <code>Stores</code> și verifică endpoint-ul
                <code>/stores</code>.
              </div>
            </div>
          </section>
        </section>

        <!-- MY STORES VIEW -->
        <section id="view-stores" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">General overview</div>
                <p class="panel-subtitle">
                  Sumare pentru toate magazinele conectate (în context).
                </p>
              </div>
              <div class="badge-soft" id="stores-count-mystores">0 stores</div>
            </div>

            <div id="exec-store-header" class="exec-store-header"></div>

            <div id="mystores-grid-wrapper">
              <div class="empty-state" id="mystores-empty">
                <strong>Nu sunt magazine încărcate.</strong>
                Adaugă magazine în foaia <code>Stores</code>.
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Shopify Multi-Store Sync</div>
                <p class="panel-subtitle">
                  Funcționalitatea de sincronizare Shopify existentă, reutilizată aici (fără iframe).
                </p>
              </div>
              <div class="badge-soft" id="sync-context-label">
                Context: toate magazinele
              </div>
            </div>
            <div>
              <p class="muted">
                De aici vei putea rula verificări și sincronizări pentru produse (create / update / delete)
                pe baza datelor din Google Sheets + Shopify.
              </p>
              <p class="muted">
                Momentan, consola completă este disponibilă într-o pagină dedicată.
                Poți deschide consola veche într-un tab nou; ulterior o putem integra nativ aici.
              </p>
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                <a href="/shopify" target="_blank" rel="noopener" class="btn btn-primary">
                  Deschide consola de sincronizare
                </a>
                <button class="btn" type="button" disabled>
                  Preview & sync direct aici (coming soon)
                </button>
              </div>
            </div>
          </section>
        </section>

        <!-- PLACEHOLDER VIEWS pentru restul meniului (deocamdată) -->
        <section id="view-ads-overview" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Ads Overview</div>
                <p class="panel-subtitle">
                  Rezumat cross-channel (TikTok / Meta / Google) – în curând.
                </p>
              </div>
            </div>
            <div class="empty-state">
              <strong>Coming soon.</strong>
              Acest view va centraliza KPI de marketing din toate conturile conectate.
            </div>
          </section>
        </section>

        <section id="view-tiktok" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">TikTok Ads</div>
                <p class="panel-subtitle">
                  Modulul detaliat de TikTok Ads trăiește în prezent pe ruta <code>/marketing</code>.
                </p>
              </div>
            </div>
            <div class="empty-state">
              <strong>Redirect manual pentru moment.</strong>
              <a href="/marketing" target="_blank" rel="noopener" style="color:#93c5fd;text-decoration:none;">
                Deschide pagina de TikTok Ads
              </a>
            </div>
          </section>
        </section>

        <!-- celelalte view-uri (meta, google, orders etc.) pot fi umplute ulterior -->
        <section id="view-meta" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Meta Ads</div>
                <p class="panel-subtitle">Integrare viitoare cu Meta Ads Manager.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-google" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Google Ads</div>
                <p class="panel-subtitle">Integrare viitoare cu Google Ads.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-orders" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Orders</div>
                <p class="panel-subtitle">
                  Centralizează și filtrează comenzile Shopify pentru contextul selectat.
                  Click pe un rând pentru detalii în panoul din dreapta.
                </p>
              </div>
              <div class="badge-soft" id="orders-count-label">0 orders</div>
            </div>

            <div class="orders-toolbar">
              <div class="orders-search">
                <span class="muted" aria-hidden="true" style="font-size:12px;">🔎</span>
                <input
                  id="orders-search"
                  type="search"
                  placeholder="Search orders, products, customers"
                  autocomplete="off"
                />
              </div>
              <div class="filter-group">
                <label class="filter-chip">
                  <span>Status</span>
                  <select id="orders-status">
                    <option value="all">All</option>
                    <option value="open">Open</option>
                    <option value="paid">Paid</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="orders-meta" id="orders-meta">
              Afișăm ultimele comenzi pentru contextul curent.
            </div>

            <div class="orders-table-wrapper">
              <div id="orders-loading" class="empty-state" style="display:none;">
                <strong>Se încarcă...</strong>
                Pregătim lista de comenzi.
              </div>
              <div id="orders-empty" class="empty-state" style="display:none;">
                <strong>Nicio comandă găsită.</strong>
                Ajustează filtrele sau schimbă contextul.
              </div>
              <div id="orders-table-shell" class="orders-table-shell">
                <table class="orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Store</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th class="numeric">Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody id="orders-tbody"></tbody>
                </table>
              </div>
            </div>
            <div id="orders-pagination" class="orders-pagination"></div>
          </section>
        </section>

        <section id="view-customers" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Customers</div>
                <p class="panel-subtitle">
                  Clienți centralizați pentru contextul selectat. Click pe un rând pentru detalii.
                </p>
              </div>
              <div class="badge-soft" id="customers-count-label">0 customers</div>
            </div>

            <div class="orders-toolbar">
              <div class="orders-search">
                <span class="muted" aria-hidden="true" style="font-size:12px;">🔎</span>
                <input
                  id="customers-search"
                  type="search"
                  placeholder="Search customers (name, email)"
                  autocomplete="off"
                />
              </div>
            </div>

            <div class="orders-meta" id="customers-meta">
              Afișăm clienții pentru contextul curent.
            </div>

            <div class="orders-table-wrapper">
              <div id="customers-loading" class="empty-state" style="display:none;">
                <strong>Se încarcă...</strong>
                Pregătim lista de clienți.
              </div>
              <div id="customers-empty" class="empty-state" style="display:none;">
                <strong>Niciun client găsit.</strong>
                Ajustează filtrele sau schimbă contextul.
              </div>
              <div id="customers-table-shell" class="orders-table-shell">
                <table class="orders-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Total orders</th>
                      <th class="numeric">Total spent</th>
                      <th>Last order</th>
                      <th>Store</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody id="customers-tbody"></tbody>
                </table>
              </div>
            </div>
            <div id="customers-pagination" class="orders-pagination"></div>
          </section>
        </section>

        <section id="view-daily-reports" class="view">
          <!-- Day-centric team view for daily reports -->
          <div class="reports-container">
            <!-- Left Panel: Calendar + Filters -->
            <div class="reports-left-panel">
              <div class="reports-calendar-section">
                <div class="reports-month-selector">
                  <button id="reports-prev-month" class="btn-icon">&larr;</button>
                  <span id="reports-current-month" class="reports-month-label">Loading...</span>
                  <button id="reports-next-month" class="btn-icon">&rarr;</button>
                </div>
                <div id="reports-calendar-grid" class="reports-calendar-grid"></div>
              </div>

              <div class="reports-filters-section">
                <h3 class="reports-section-title">Filters</h3>
                <div class="reports-filter-group">
                  <label class="reports-filter-label">People</label>
                  <input
                    id="reports-people-filter"
                    type="search"
                    placeholder="Search people..."
                    class="reports-filter-input"
                  />
                </div>
                <div class="reports-filter-group">
                  <label class="reports-filter-label">Project</label>
                  <select id="reports-project-filter" class="reports-filter-select">
                    <option value="">All projects</option>
                  </select>
                </div>
                <button id="reports-manage-people-btn" class="btn-secondary" style="width: 100%; margin-top: 12px;">Manage People</button>
                <button id="reports-manage-projects-btn" class="btn-secondary" style="width: 100%; margin-top: 8px;">Manage Projects</button>
              </div>
            </div>

            <!-- Right Panel: Summary + Report Cards -->
            <div class="reports-right-panel">
              <div id="reports-summary" class="reports-summary">
                <p class="reports-summary-prompt">← Select a date to view team reports</p>
              </div>

              <div id="reports-cards-container" class="reports-cards-container"></div>
            </div>
          </div>

          <!-- Manage People Modal -->
          <div id="reports-people-modal" class="reports-modal" style="display:none;">
            <div class="reports-modal-content">
              <div class="reports-modal-header">
                <h3>Manage People</h3>
                <button id="reports-people-modal-close" class="btn-icon">&times;</button>
              </div>
              <div class="reports-modal-body">
                <button id="reports-add-person-btn" class="btn-primary">Add New Person</button>
                <div id="reports-people-list" class="reports-people-management-list"></div>
              </div>
            </div>
          </div>

          <!-- Add/Edit Person Modal -->
          <div id="reports-person-form-modal" class="reports-modal" style="display:none;">
            <div class="reports-modal-content" style="max-width: 500px;">
              <div class="reports-modal-header">
                <h3 id="reports-person-form-title">Add Person</h3>
                <button id="reports-person-form-close" class="btn-icon">&times;</button>
              </div>
              <div class="reports-modal-body">
                <form id="reports-person-form">
                  <input type="hidden" id="person-form-id" />
                  <div class="reports-form-group">
                    <label class="reports-form-label">Display Name *</label>
                    <input type="text" id="person-form-name" class="reports-form-input" required />
                  </div>
                  <div class="reports-form-group">
                    <label class="reports-form-label">Email</label>
                    <input type="email" id="person-form-email" class="reports-form-input" />
                  </div>
                  <div class="reports-form-group">
                    <label class="reports-form-label">Phone</label>
                    <input type="tel" id="person-form-phone" class="reports-form-input" />
                  </div>
                  <div class="reports-form-actions">
                    <button type="submit" class="btn-primary">Save</button>
                    <button type="button" id="person-form-cancel" class="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- Manage Projects Modal -->
          <div id="reports-projects-modal" class="reports-modal" style="display:none;">
            <div class="reports-modal-content">
              <div class="reports-modal-header">
                <h3>Manage Projects</h3>
                <button id="reports-projects-modal-close" class="btn-icon">&times;</button>
              </div>
              <div class="reports-modal-body">
                <button id="reports-add-project-btn" class="btn-primary">Add New Project</button>
                <div id="reports-projects-list" class="reports-projects-management-list"></div>
              </div>
            </div>
          </div>

          <!-- Add/Edit Project Modal -->
          <div id="reports-project-form-modal" class="reports-modal" style="display:none;">
            <div class="reports-modal-content" style="max-width: 500px;">
              <div class="reports-modal-header">
                <h3 id="reports-project-form-title">Add Project</h3>
                <button id="reports-project-form-close" class="btn-icon">&times;</button>
              </div>
              <div class="reports-modal-body">
                <form id="reports-project-form">
                  <input type="hidden" id="project-form-id" />
                  <div class="reports-form-group">
                    <label class="reports-form-label">Project Name *</label>
                    <input type="text" id="project-form-name" class="reports-form-input" required />
                  </div>
                  <div class="reports-form-group">
                    <label class="reports-form-label">Color (hex)</label>
                    <input type="text" id="project-form-color" class="reports-form-input" placeholder="#3498db" />
                  </div>
                  <div class="reports-form-actions">
                    <button type="submit" class="btn-primary">Save</button>
                    <button type="button" id="project-form-cancel" class="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- History Modal -->
          <div id="reports-history-modal" class="reports-modal" style="display:none;">
            <div class="reports-modal-content" style="max-width: 700px;">
              <div class="reports-modal-header">
                <h3>Report History</h3>
                <button id="reports-history-modal-close" class="btn-icon">&times;</button>
              </div>
              <div class="reports-modal-body">
                <div id="reports-history-content"></div>
              </div>
            </div>
          </div>
        </section>

        <section id="view-shipping" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Shipping</div>
                <p class="panel-subtitle">Integrare viitoare cu curieri.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-inventory" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Inventory</div>
                <p class="panel-subtitle">Stocuri cross-store – modul viitor.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-helpdesk" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Helpdesk</div>
                <p class="panel-subtitle">Centralizare tichete suport – în curând.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-settings" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Settings</div>
                <p class="panel-subtitle">Configurări generale pentru hub.</p>
              </div>
            </div>
            <div class="empty-state">
              <strong>Settings framework.</strong>
              Aici vom adăuga editor pentru variabile (inclusiv ENV mirror), parole etc.
            </div>
          </section>
        </section>

      </div>
    </main>
  </div>

  <div id="drawer-backdrop" class="drawer-backdrop"></div>
  <div id="drawer-stack" class="drawer-stack" aria-hidden="true"></div>

  <script>
    (function () {
      const params = new URLSearchParams(window.location.search);
      let currentView = params.get('view') || 'home';
      let selectedStoreId = params.get('store_id') || 'all';

      const contextLabelEl = document.getElementById('context-label');
      const pageTitleEl = document.getElementById('page-title');
      const pageSubtitleEl = document.getElementById('page-subtitle');
      const storeContextSelect = document.getElementById('store-context-select');
      const storeContextLive = document.getElementById('store-context-live');

      const navItems = document.querySelectorAll('.nav-item[data-view]');
      const views = document.querySelectorAll('.view');

      const statTodayHome = document.getElementById('stat-today-home');
      const statWeekHome = document.getElementById('stat-week-home');
      const statMonthHome = document.getElementById('stat-month-home');
      const statYearHome = document.getElementById('stat-year-home');
      const refreshMetricsBtn = document.getElementById('refresh-metrics-btn');
      const refreshStatus = document.getElementById('refresh-status');
      const storesCountHome = document.getElementById('stores-count-home');
      const homeTableWrapper = document.getElementById('home-table-wrapper');
      const homeEmpty = document.getElementById('home-empty');

      // AI Insights elements
      const aiInsightsSection = document.getElementById('ai-insights-section');
      const aiInsightsBody = document.getElementById('ai-insights-body');
      const aiRegenerateBtn = document.getElementById('ai-regenerate-btn');
      const aiCacheBadge = document.getElementById('ai-cache-badge');

      const storesCountMy = document.getElementById('stores-count-mystores');
      const myGridWrapper = document.getElementById('mystores-grid-wrapper');
      const myEmpty = document.getElementById('mystores-empty');
      const execHeader = document.getElementById('exec-store-header');
      const syncContextLabel = document.getElementById('sync-context-label');
      const ordersCountLabel = document.getElementById('orders-count-label');
      const ordersSearchInput = document.getElementById('orders-search');
      const ordersStatusSelect = document.getElementById('orders-status');
      const ordersMeta = document.getElementById('orders-meta');
      const ordersLoading = document.getElementById('orders-loading');
      const ordersEmpty = document.getElementById('orders-empty');
      const ordersTableShell = document.getElementById('orders-table-shell');
      const ordersTableBody = document.getElementById('orders-tbody');
      const defaultOrdersEmptyHTML = ordersEmpty ? ordersEmpty.innerHTML : '';
      const ordersPagination = document.getElementById('orders-pagination');
      const customersCountLabel = document.getElementById('customers-count-label');
      const customersSearchInput = document.getElementById('customers-search');
      const customersMeta = document.getElementById('customers-meta');
      const customersLoading = document.getElementById('customers-loading');
      const customersEmpty = document.getElementById('customers-empty');
      const customersTableShell = document.getElementById('customers-table-shell');
      const customersTableBody = document.getElementById('customers-tbody');
      const customersPagination = document.getElementById('customers-pagination');

      const drawerStackEl = document.getElementById('drawer-stack');
      const drawerBackdrop = document.getElementById('drawer-backdrop');

      const todayStr = new Date().toISOString().slice(0, 10);

      const ORDER_PAGE_SIZE = 100;
      const ordersState = {
        items: [],
        loading: false,
        filters: {
          q: '',
          status: 'all',
          limit: ORDER_PAGE_SIZE,
        },
        error: '',
        page: 1,
        total: 0,
        hasNext: false,
        hasPrev: false,
        sort: { by: 'created_at', dir: 'desc' },
      };
      const customersState = {
        items: [],
        loading: false,
        filters: {
          q: '',
          limit: 1000,
        },
        error: '',
        total: 0,
        sort: { by: 'updated_at', dir: 'desc' },
      };
      let ordersDirty = true;
      let customersDirty = true;
      const orderDetailsCache = new Map();
      const drawerState = {
        open: false,
        mode: 'order',
        order: null,
        product: null,
        customer: null,
      };

      // Daily Reports State (Day-centric)
      const reportsState = {
        currentMonth: new Date(),
        selectedDate: null,
        people: [],
        projects: [],
        reports: [],
        summary: null,
        calendarStats: [],
        filters: {
          peopleSearch: '',
          projectId: '',
        },
        loading: false,
        error: null,
      };

      function formatNumber(n) {
        if (n == null || isNaN(n)) return '–';
        return n.toLocaleString('ro-RO');
      }

      function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function formatMoney(amount, currency) {
        const num = Number(amount);
        if (Number.isNaN(num)) return '–';
        const curr = currency || 'RON';
        try {
          return new Intl.NumberFormat('ro-RO', {
            style: 'currency',
            currency: curr,
            minimumFractionDigits: 2,
          }).format(num);
        } catch (err) {
          return num.toFixed(2) + ' ' + curr;
        }
      }

      function formatDateTime(value) {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString('ro-RO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      function statusClass(value) {
        if (!value) return '';
        return (
          'status-' +
          String(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
        );
      }

      function statusPill(value) {
        if (!value) return '<span class="muted">–</span>';
        const cls = 'status-pill ' + statusClass(value);
        const label = escapeHtml(String(value).replace(/_/g, ' '));
        return '<span class="' + cls + '">' + label + '</span>';
      }

      function formatAddress(address) {
        if (!address) return '—';
        const parts = [
          address.name || '',
          address.address1 || '',
          address.address2 || '',
          address.city || '',
          address.country || '',
        ]
          .filter(Boolean)
          .join(', ');
        return parts || '—';
      }

      function ordersContainingProduct(productId, title) {
        const needle = title ? String(title).toLowerCase() : '';
        return ordersState.items.filter((o) => {
          const list = Array.isArray(o.line_items) ? o.line_items : [];
          return list.some((li) => {
            const byId = productId && li.product_id && String(li.product_id) === String(productId);
            const byTitle =
              needle && String(li.title || '').toLowerCase().includes(needle.toLowerCase());
            return byId || byTitle;
          });
        });
      }

      function ordersForCustomer(customer) {
        if (!customer) return [];
        const email = customer.email ? String(customer.email).toLowerCase() : '';
        const customerId = customer.id ? String(customer.id) : null;
        return ordersState.items.filter((o) => {
          const oEmail = o.customer_email ? String(o.customer_email).toLowerCase() : '';
          const sameEmail = email && oEmail === email;
          const sameId =
            customerId && o.customer_id && String(o.customer_id) === String(customerId);
          return sameEmail || sameId;
        });
      }

      function applySort(items) {
        const { by, dir } = ordersState.sort || { by: 'created_at', dir: 'desc' };
        const sorted = [...items];
        const sign = dir === 'asc' ? 1 : -1;
        sorted.sort((a, b) => {
          const va = a ? a[by] : null;
          const vb = b ? b[by] : null;
          if (by === 'total_price' || by === 'items_count') {
            const na = Number(va) || 0;
            const nb = Number(vb) || 0;
            return (na - nb) * sign;
          }
          if (by === 'created_at') {
            const na = Date.parse(va || 0);
            const nb = Date.parse(vb || 0);
            if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
            if (Number.isNaN(na)) return -1 * sign;
            if (Number.isNaN(nb)) return 1 * sign;
            return (na - nb) * sign;
          }
          const sa = (va || '').toString().toLowerCase();
          const sb = (vb || '').toString().toLowerCase();
          if (sa === sb) return 0;
          return sa > sb ? sign : -sign;
        });
        return sorted;
      }

      function setView(view) {
        currentView = view;
        views.forEach((v) => v.classList.remove('active'));
        const activeView = document.getElementById('view-' + view);
        if (activeView) activeView.classList.add('active');

        navItems.forEach((n) =>
          n.classList.toggle('active', n.getAttribute('data-view') === view)
        );

        if (view === 'home') {
          pageTitleEl.textContent = 'Home';
        } else if (view === 'stores') {
          pageTitleEl.textContent = 'My Stores';
        } else if (view === 'tiktok') {
          pageTitleEl.textContent = 'TikTok Ads';
        } else if (view === 'daily-reports') {
          pageTitleEl.textContent = 'Daily Reports';
        } else {
          pageTitleEl.textContent = view.charAt(0).toUpperCase() + view.slice(1);
        }

        const label =
          selectedStoreId === 'all' ? 'toate magazinele' : 'store-ul selectat';
        pageSubtitleEl.innerHTML =
          'Acum vezi date pentru <strong>' + label + '</strong>.';

        const contextText =
          selectedStoreId === 'all' ? 'All stores' : selectedStoreId;
        contextLabelEl.textContent = contextText;
        storeContextLive.textContent = contextText;

        if (view !== 'orders') {
          closeAllPanels();
        }

        if (view === 'orders' && ordersDirty) {
          loadOrders();
        }
        if (view === 'customers' && customersDirty) {
          loadCustomers();
        }
        if (view === 'daily-reports') {
          initDailyReports();
        }

        params.set('view', view);
        params.set('store_id', selectedStoreId);
        const newUrl =
          window.location.pathname + '?' + params.toString() + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }

      navItems.forEach((btn) => {
        btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-view');
          setView(v);
        });
      });

      // "Refresh data" button and syncLogs removed - Orders/Customers now use live Shopify data

      function buildHomeTable(stores) {
        if (!stores.length) {
          homeEmpty.style.display = 'block';
          homeTableWrapper.innerHTML = '';
          homeTableWrapper.appendChild(homeEmpty);
          return;
        }
        homeEmpty.style.display = 'none';

        const rowsHtml = stores
          .map((s) => {
            return (
              '<tr>' +
                '<td class="store-name-cell">' +
                  (s.store_name || s.store_id || 'Store') +
                '</td>' +
                '<td class="numeric">' + formatNumber(s.active_products) + '</td>' +
                '<td class="numeric">' + formatNumber(s.draft_products) + '</td>' +
                '<td class="numeric">' + formatNumber(s.today_orders) + '</td>' +
                '<td class="numeric">' + formatNumber(s.week_orders) + '</td>' +
                '<td class="numeric">' + formatNumber(s.month_orders) + '</td>' +
                '<td class="numeric">' + formatNumber(s.year_orders) + '</td>' +
              '</tr>'
            );
          })
          .join('');

        const tableHtml =
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Store</th>' +
                '<th class="numeric">Active</th>' +
                '<th class="numeric">Draft</th>' +
                '<th class="numeric">Azi</th>' +
                '<th class="numeric">Săpt.</th>' +
                '<th class="numeric">Lună</th>' +
                '<th class="numeric">An</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>';

        homeTableWrapper.innerHTML = tableHtml;
      }

      function renderExecHeader(store) {
        if (!store) {
          execHeader.style.display = 'none';
          execHeader.innerHTML = '';
          return;
        }
        execHeader.style.display = 'flex';
        execHeader.innerHTML =
          '<div class="exec-left">' +
            '<h2>' + (store.store_name || store.store_id || 'Store') + '</h2>' +
            '<p>Shopify: ' + (store.shopify_domain || '—') + '</p>' +
          '</div>' +
          '<div class="exec-right">' +
            '<div class="exec-kpi">' +
              '<div class="exec-kpi-label">Active</div>' +
              '<div class="exec-kpi-value">' + formatNumber(store.active_products) + '</div>' +
            '</div>' +
            '<div class="exec-kpi">' +
              '<div class="exec-kpi-label">Draft</div>' +
              '<div class="exec-kpi-value">' + formatNumber(store.draft_products) + '</div>' +
            '</div>' +
            '<div class="exec-kpi">' +
              '<div class="exec-kpi-label">Comenzi azi</div>' +
              '<div class="exec-kpi-value">' + formatNumber(store.today_orders) + '</div>' +
            '</div>' +
          '</div>';
      }

      function renderMyStoresCards(stores) {
        if (!stores.length) {
          myEmpty.style.display = 'block';
          myGridWrapper.innerHTML = '';
          myGridWrapper.appendChild(myEmpty);
          renderExecHeader(null);
          return;
        }

        myEmpty.style.display = 'none';

        // Dacă avem UN singur magazin în context:
        // - afișăm DOAR header-ul executiv
        // - sub el lăsăm un placeholder pentru viitoare acțiuni
        if (stores.length === 1) {
          const store = stores[0];
          renderExecHeader(store);

          myGridWrapper.innerHTML = '';
          const info = document.createElement('div');
          info.className = 'muted';
          info.style.marginTop = '8px';
          info.textContent =
            'Aici vei putea adăuga acțiuni rapide pentru acest magazin (de ex. verificare produse, sync, marketing etc.).';
          myGridWrapper.appendChild(info);
          return;
        }

        // Mai multe magazine -> nu mai arătăm header-ul executiv, ci doar cardurile
        renderExecHeader(null);

        const grid = document.createElement('div');
        grid.className = 'stores-grid';

        stores.forEach((s) => {
          const card = document.createElement('article');
          card.className = 'store-card';
          card.innerHTML =
            '<div class="store-card-header">' +
              '<div>' +
                '<div class="store-name">' + (s.store_name || s.store_id || 'Store') + '</div>' +
                '<div class="store-domain">' + (s.shopify_domain || '—') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="store-stats-row">' +
              '<div class="stat-chip-store">' +
                '<div class="stat-chip-label">Active</div>' +
                '<div class="stat-chip-value">' + formatNumber(s.active_products) + '</div>' +
              '</div>' +
              '<div class="stat-chip-store">' +
                '<div class="stat-chip-label">Draft</div>' +
                '<div class="stat-chip-value">' + formatNumber(s.draft_products) + '</div>' +
              '</div>' +
              '<div class="stat-chip-store">' +
                '<div class="stat-chip-label">Comenzi azi</div>' +
                '<div class="stat-chip-value">' + formatNumber(s.today_orders) + '</div>' +
              '</div>' +
            '</div>';
          grid.appendChild(card);
        });

        myGridWrapper.innerHTML = '';
        myGridWrapper.appendChild(grid);
      }

      function updateOrdersMeta(count) {
        const contextText =
          selectedStoreId === 'all'
            ? 'toate magazinele'
            : 'store ' +
              (storeContextSelect.selectedOptions[0]?.textContent || selectedStoreId);
        const statusText =
          ordersState.filters.status && ordersState.filters.status !== 'all'
            ? ' · status: ' + ordersState.filters.status
            : '';
        const searchText = ordersState.filters.q
          ? ' · search: "' + ordersState.filters.q + '"'
          : '';
        ordersMeta.textContent =
          'Afișăm ' +
          (count || 0) +
          ' comenzi pentru ' +
          contextText +
          statusText +
          searchText;
      }

      function updateOrdersBadge() {
        if (!ordersCountLabel) return;
        // Show the actual number of orders currently displayed, not a theoretical total
        const displayedCount = ordersState.items.length || 0;
        const sameDay =
          ordersState.filters.from === todayStr && ordersState.filters.to === todayStr;
        const rangeLabel = sameDay ? 'orders shown' : 'orders shown';
        ordersCountLabel.textContent = formatNumber(displayedCount) + ' ' + rangeLabel;
      }

      function renderOrdersTable() {
        if (!ordersMeta) return;

        ordersLoading.style.display = ordersState.loading ? 'block' : 'none';

        if (ordersState.loading) {
          ordersEmpty.style.display = 'none';
          ordersTableShell.style.display = 'none';
          updateOrdersMeta(0);
          ordersCountLabel.textContent = 'Loading...';
          return;
        }

        if (ordersEmpty && defaultOrdersEmptyHTML) {
          ordersEmpty.innerHTML = defaultOrdersEmptyHTML;
        }

        if (ordersState.error) {
          ordersEmpty.style.display = 'block';
          ordersEmpty.innerHTML =
            '<strong>Eroare la încărcarea comenzilor.</strong><br />' +
            escapeHtml(ordersState.error);
          ordersTableShell.style.display = 'none';
          ordersCountLabel.textContent = '0 orders';
          updateOrdersMeta(0);
          return;
        }

        const count = ordersState.total || ordersState.items.length;
        updateOrdersMeta(count);
        updateOrdersBadge();

        if (!count) {
          ordersEmpty.style.display = 'block';
          ordersTableShell.style.display = 'none';
          return;
        }

        ordersEmpty.style.display = 'none';
        ordersTableShell.style.display = 'block';

        const rowsHtml = applySort(ordersState.items)
          .map((order) => {
            const financial = order.financial_status ? statusPill(order.financial_status) : '';
            const fulfillment = order.fulfillment_status
              ? statusPill(order.fulfillment_status)
              : '';
            // Use order_id (DB field) instead of id
            const orderId = order.order_id || order.id;
            // Display: order_name if available, otherwise #order_id
            const displayName = order.order_name || ('#' + orderId);
            const subtitle = order.updated_at ? formatDateTime(order.updated_at) : formatDateTime(order.created_at);

            return (
              '<tr data-order-id="' +
              orderId +
              '" data-store="' +
              escapeHtml(order.store_id) +
              '">' +
                '<td>' +
                  '<div class="order-id">' +
                    escapeHtml(displayName) +
                  '</div>' +
                  '<div class="order-sub">' + subtitle + '</div>' +
                '</td>' +
                '<td>' + formatDateTime(order.created_at) + '</td>' +
                '<td class="store-name-cell">' +
                  escapeHtml(order.store_name || order.store_id || 'Store') +
                '</td>' +
                '<td>' +
                  '<div class="order-customer">' +
                    '<span>' + escapeHtml(order.customer_name || 'Guest') + '</span>' +
                    (order.email
                      ? '<span class="order-sub">' + escapeHtml(order.email) + '</span>'
                      : '') +
                  '</div>' +
                '</td>' +
                '<td>' + escapeHtml(order.items_summary || '') + '</td>' +
                '<td class="numeric">' + formatMoney(order.total_price, order.currency) + '</td>' +
                '<td>' +
                  (financial || fulfillment
                    ? (financial || '') +
                      (fulfillment
                        ? '<span style="margin-left:6px;">' + fulfillment + '</span>'
                        : '')
                    : '<span class="muted">—</span>') +
                '</td>' +
              '</tr>'
            );
          })
          .join('');

        ordersTableBody.innerHTML = rowsHtml;
        ordersTableBody.querySelectorAll('tr').forEach((tr) => {
          tr.addEventListener('click', () => {
            const orderId = tr.getAttribute('data-order-id');
            const storeId = tr.getAttribute('data-store');
            if (!orderId || !storeId) {
              console.error('Missing orderId or storeId', { orderId, storeId });
              return;
            }
            openOrderDrawer(orderId, storeId);
          });
        });

        renderPagination();
        setupSortingUI();
      }

      function setupSortingUI() {
        // Setup sorting for Orders table
        const ordersTable = document.querySelector('#view-orders .orders-table');
        if (ordersTable) {
          const headers = ordersTable.querySelectorAll('th');
          const keys = ['order_name', 'created_at', 'store_id', 'customer_name', null, 'total_price', 'financial_status'];
          headers.forEach((th, idx) => {
            const key = keys[idx];
            if (!key) return;
            const baseLabel = th.getAttribute('data-label') || th.textContent.replace(/ ↑| ↓/g, '').trim();
            th.setAttribute('data-label', baseLabel);
            th.style.cursor = 'pointer';
            const indicator =
              ordersState.sort.by === key ? (ordersState.sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
            th.textContent = baseLabel + indicator;
            if (!th._sortingBound) {
              th.addEventListener('click', () => {
                if (ordersState.sort.by === key) {
                  ordersState.sort.dir = ordersState.sort.dir === 'asc' ? 'desc' : 'asc';
                } else {
                  ordersState.sort.by = key;
                  ordersState.sort.dir = 'asc';
                }
                loadOrders();
              });
              th._sortingBound = true;
            }
          });
        }

        // Setup sorting for Customers table
        const customersTable = document.querySelector('#view-customers .orders-table');
        if (customersTable) {
          const headers = customersTable.querySelectorAll('th');
          const keys = ['display_name', 'email', 'orders_count', 'total_spent', 'updated_at', 'store_id', 'created_at'];
          headers.forEach((th, idx) => {
            const key = keys[idx];
            if (!key) return;
            const baseLabel = th.getAttribute('data-label') || th.textContent.replace(/ ↑| ↓/g, '').trim();
            th.setAttribute('data-label', baseLabel);
            th.style.cursor = 'pointer';
            const indicator =
              customersState.sort.by === key ? (customersState.sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
            th.textContent = baseLabel + indicator;
            if (!th._sortingBound) {
              th.addEventListener('click', () => {
                if (customersState.sort.by === key) {
                  customersState.sort.dir = customersState.sort.dir === 'asc' ? 'desc' : 'asc';
                } else {
                  customersState.sort.by = key;
                  customersState.sort.dir = 'asc';
                }
                loadCustomers();
              });
              th._sortingBound = true;
            }
          });
        }
      }

      function updateCustomersMeta(count) {
        if (!customersMeta) return;
        const contextText =
          selectedStoreId === 'all'
            ? 'toate magazinele'
            : 'store ' +
              (storeContextSelect.selectedOptions[0]?.textContent || selectedStoreId);
        customersMeta.textContent =
          'Afișăm ' + (count || 0) + ' clienți pentru ' + contextText;
      }

      function updateCustomersBadge() {
        if (!customersCountLabel) return;
        customersCountLabel.textContent =
          formatNumber(customersState.total || customersState.items.length) + ' customers';
      }

      function renderCustomersTable() {
        if (!customersMeta) return;
        customersLoading.style.display = customersState.loading ? 'block' : 'none';

        if (customersState.loading) {
          customersEmpty.style.display = 'none';
          customersTableShell.style.display = 'none';
          updateCustomersMeta(0);
          customersCountLabel.textContent = 'Loading...';
          return;
        }

        if (customersState.error) {
          customersEmpty.style.display = 'block';
          customersEmpty.innerHTML =
            '<strong>Eroare la încărcarea clienților.</strong><br />' +
            escapeHtml(customersState.error);
          customersTableShell.style.display = 'none';
          customersCountLabel.textContent = '0 customers';
          updateCustomersMeta(0);
          return;
        }

        const count = customersState.total || customersState.items.length;
        updateCustomersMeta(count);
        updateCustomersBadge();

        if (!customersState.items.length) {
          customersEmpty.style.display = 'block';
          customersTableShell.style.display = 'none';
          return;
        }

        customersEmpty.style.display = 'none';
        customersTableShell.style.display = 'block';

        const rowsHtml = customersState.items
          .map((c) => {
            // Use display_name from DB, or construct from first_name + last_name
            const fullName = c.display_name ||
              ((c.first_name || c.last_name)
                ? (c.first_name || '') + ' ' + (c.last_name || '')
                : (c.name || c.email || 'Customer')).trim();

            // Ensure customer_id is available for click handler
            const customerId = c.customer_id;
            if (!customerId) {
              console.warn('[customers] Row missing customer_id:', c);
            }

            return (
              '<tr data-store="' +
                escapeHtml(c.store_id) +
                '" data-store-id="' +
                escapeHtml(c.store_id) +
                '" data-customer-id="' +
                escapeHtml(customerId || '') +
              '">' +
                '<td><button class="link-inline customer-open">' +
                  escapeHtml(fullName) +
                '</button></td>' +
                '<td>' + escapeHtml(c.email || '—') + '</td>' +
                '<td>' + formatNumber(c.orders_count || 0) + '</td>' +
                '<td class="numeric">' + formatMoney(c.total_spent || 0, c.currency || 'RON') + '</td>' +
                '<td>' + (c.updated_at ? formatDateTime(c.updated_at) : '—') + '</td>' +
                '<td class="store-name-cell">' + escapeHtml(c.store_name || c.store_id || '') + '</td>' +
                '<td>' + (c.created_at ? formatDateTime(c.created_at) : '—') + '</td>' +
              '</tr>'
            );
          })
          .join('');

        customersTableBody.innerHTML = rowsHtml;
        customersTableBody.querySelectorAll('tr').forEach((tr) => {
          tr.addEventListener('click', (ev) => {
            ev.preventDefault();
            const storeId = tr.getAttribute('data-store-id');
            const customerId = tr.getAttribute('data-customer-id');
            openCustomerDetail(storeId, customerId);
          });
        });

        renderCustomersPagination();
        setupSortingUI();
      }

      function renderCustomersPagination() {
        if (!customersPagination) return;
        // No pagination - single scrollable list
        customersPagination.innerHTML = '';
      }

      function renderPagination() {
        if (!ordersPagination) return;
        // Infinite scroll - no pagination buttons needed
        ordersPagination.innerHTML = '';
      }

      function buildShopifyUrl(type, payload, domainOverride) {
        const domain = domainOverride || (payload && payload.shopify_domain);
        if (!domain) return null;
        if (type === 'order' && payload && payload.id) {
          return 'https://' + domain + '/admin/orders/' + payload.id;
        }
        if (type === 'customer' && payload && payload.customer && payload.customer.id) {
          return 'https://' + domain + '/admin/customers/' + payload.customer.id;
        }
        if (type === 'product' && payload && payload.product_id) {
          return 'https://' + domain + '/admin/products/' + payload.product_id;
        }
        return null;
      }

      function closeAllPanels() {
        drawerState.open = false;
        drawerState.order = null;
        drawerState.product = null;
        drawerState.mode = 'order';
        renderDrawer();
      }

      function buildOrderContent(detail) {
        // Handle error/loading states
        if (detail && detail.error) {
          return {
            title: 'Order',
            subtitle: '',
            bodyHtml: '<div class="orders-empty-inline">Nu am putut încărca comanda.<br />' +
              escapeHtml(detail.error) + '</div>',
            shopifyUrl: null,
          };
        }

        if (detail && detail._loading) {
          return {
            title: 'Loading...',
            subtitle: '',
            bodyHtml: '<div class="orders-empty-inline">Se încarcă detaliile comenzii...</div>',
            shopifyUrl: null,
          };
        }

        // Helper: detect shipping from line_items (for Romanian stores)
        const detectShippingFromLineItems = () => {
          if (!detail || !detail.line_items || !detail.line_items.length) return [];
          const shippingKeywords = ['livrare', 'transport', 'curier', 'shipping', 'delivery'];
          return detail.line_items.filter(li => {
            const title = String(li.title || '').toLowerCase();
            return shippingKeywords.some(kw => title.includes(kw));
          });
        };

        const shippingFromLineItems = detectShippingFromLineItems();

        // === SECTION 1: OVERVIEW ===
        const statusHtml = [
          detail.financial_status ? statusPill(detail.financial_status) : '',
          detail.fulfillment_status ? statusPill(detail.fulfillment_status) : '',
        ].filter(Boolean).join(' ');

        const overviewSection = '<div class="drawer-section">' +
          '<div class="section-heading">Overview</div>' +
          '<div class="kv-row"><span>Order #</span><strong>' +
            escapeHtml(detail.name || detail.order_number || detail.id || '—') +
          '</strong></div>' +
          '<div class="kv-row"><span>Store</span><strong>' +
            escapeHtml(detail.store_name || detail.store_id || '—') +
          '</strong></div>' +
          '<div class="kv-row"><span>Created</span><strong>' +
            formatDateTime(detail.created_at) +
          '</strong></div>' +
          (detail.updated_at && detail.updated_at !== detail.created_at
            ? '<div class="kv-row"><span>Updated</span><strong>' +
              formatDateTime(detail.updated_at) +
              '</strong></div>'
            : '') +
          (detail.processed_at
            ? '<div class="kv-row"><span>Processed</span><strong>' +
              formatDateTime(detail.processed_at) +
              '</strong></div>'
            : '') +
          (detail.cancelled_at
            ? '<div class="kv-row"><span>Cancelled</span><strong>' +
              formatDateTime(detail.cancelled_at) +
              (detail.cancel_reason ? ' (' + escapeHtml(detail.cancel_reason) + ')' : '') +
              '</strong></div>'
            : '') +
          '<div class="kv-row"><span>Total</span><strong>' +
            formatMoney(detail.total_price, detail.currency) +
          '</strong></div>' +
          (detail.subtotal_price
            ? '<div class="kv-row"><span>Subtotal</span><strong>' +
              formatMoney(detail.subtotal_price, detail.currency) +
              '</strong></div>'
            : '') +
          (detail.total_tax && parseFloat(detail.total_tax) > 0
            ? '<div class="kv-row"><span>Tax</span><strong>' +
              formatMoney(detail.total_tax, detail.currency) +
              '</strong></div>'
            : '') +
          (detail.total_discounts && parseFloat(detail.total_discounts) > 0
            ? '<div class="kv-row"><span>Discounts</span><strong>-' +
              formatMoney(detail.total_discounts, detail.currency) +
              '</strong></div>'
            : '') +
          (statusHtml
            ? '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">' +
              statusHtml +
              '</div>'
            : '') +
          (detail.tags
            ? '<div class="order-sub" style="margin-top:6px;">Tags: ' +
              escapeHtml(detail.tags) +
              '</div>'
            : '') +
          (detail.note
            ? '<div class="order-sub" style="margin-top:6px;">Note: ' +
              escapeHtml(detail.note) +
              '</div>'
            : '') +
          (detail.source_name
            ? '<div class="order-sub" style="margin-top:4px;">Source: ' +
              escapeHtml(detail.source_name) +
              '</div>'
            : '') +
        '</div>';

        // === SECTION 2: CUSTOMER ===
        const customer = detail.customer;
        const customerName = customer
          ? ((customer.first_name || '') + ' ' + (customer.last_name || '')).trim() || customer.email || 'Customer'
          : (detail.billing_address && detail.billing_address.name) || (detail.shipping_address && detail.shipping_address.name) || 'Guest';

        const customerEmail = customer?.email || detail.email || detail.contact_email || '';
        const customerPhone = customer?.phone || detail.phone || detail.billing_address?.phone || detail.shipping_address?.phone || '';

        const customerSection = '<div class="drawer-section">' +
          '<div class="section-heading">Customer</div>' +
          (customer
            ? '<button class="link-inline" data-action="view-customer">' +
              escapeHtml(customerName) +
              '</button>'
            : '<div><strong>' + escapeHtml(customerName) + '</strong></div>') +
          (customerEmail
            ? '<div class="order-sub">' + escapeHtml(customerEmail) + '</div>'
            : '') +
          (customerPhone
            ? '<div class="order-sub">' + escapeHtml(customerPhone) + '</div>'
            : '') +
          (customer?.id
            ? '<div class="order-sub">Customer ID: ' + escapeHtml(customer.id) + '</div>'
            : '') +
          (customer?.tags
            ? '<div class="order-sub">Tags: ' + escapeHtml(customer.tags) + '</div>'
            : '') +
          (customer?.state
            ? '<div class="order-sub">State: ' + escapeHtml(customer.state) + '</div>'
            : '') +
        '</div>';

        // === SECTION 3: ADDRESSES ===
        const addressesSection = '<div class="drawer-section">' +
          '<div class="section-heading">Addresses</div>' +
          (detail.shipping_address
            ? '<div style="margin-bottom:8px;">' +
              '<div class="order-sub" style="font-weight:600;margin-bottom:4px;">Shipping Address</div>' +
              '<div class="order-sub">' + escapeHtml(formatAddress(detail.shipping_address)) + '</div>' +
              '</div>'
            : '') +
          (detail.billing_address
            ? '<div>' +
              '<div class="order-sub" style="font-weight:600;margin-bottom:4px;">Billing Address</div>' +
              '<div class="order-sub">' + escapeHtml(formatAddress(detail.billing_address)) + '</div>' +
              '</div>'
            : (!detail.shipping_address
              ? '<div class="order-sub">No address information</div>'
              : '')) +
        '</div>';

        // === SECTION 4: SHIPPING & DELIVERY ===
        let shippingHtml = '';

        // Try shipping_lines first
        if (detail.shipping_lines && detail.shipping_lines.length > 0) {
          shippingHtml = detail.shipping_lines.map(sl => {
            const price = sl.discounted_price || sl.price || 0;
            return '<div class="kv-row"><span>' +
              escapeHtml(sl.title || sl.code || 'Shipping') +
              '</span><strong>' +
              formatMoney(price, detail.currency) +
              '</strong></div>' +
              (sl.carrier_identifier || sl.code
                ? '<div class="order-sub" style="margin-left:0;">Code: ' +
                  escapeHtml(sl.carrier_identifier || sl.code) +
                  '</div>'
                : '');
          }).join('');
        }
        // Fallback: detect shipping from line_items
        else if (shippingFromLineItems.length > 0) {
          shippingHtml = '<div class="order-sub" style="font-weight:600;margin-bottom:4px;">Shipping (from line items)</div>' +
            shippingFromLineItems.map(li => {
              return '<div class="kv-row"><span>' +
                escapeHtml(li.title || 'Shipping') +
                '</span><strong>' +
                formatMoney(li.price, detail.currency) +
                '</strong></div>';
            }).join('');
        } else {
          shippingHtml = '<div class="order-sub">No shipping information</div>';
        }

        // Add fulfillment info
        let fulfillmentHtml = '';
        if (detail.fulfillments && detail.fulfillments.length > 0) {
          fulfillmentHtml = '<div style="margin-top:8px;">' +
            '<div class="order-sub" style="font-weight:600;margin-bottom:4px;">Fulfillments</div>' +
            detail.fulfillments.map(f => {
              return '<div class="order-sub">' +
                'Status: ' + escapeHtml(f.status || '—') +
                (f.tracking_company ? ' · ' + escapeHtml(f.tracking_company) : '') +
                (f.tracking_number ? ' · #' + escapeHtml(f.tracking_number) : '') +
                '</div>' +
                (f.tracking_url
                  ? '<div class="order-sub"><a href="' +
                    escapeHtml(f.tracking_url) +
                    '" target="_blank" rel="noopener">Track shipment</a></div>'
                  : '');
            }).join('') +
            '</div>';
        }

        const shippingSection = '<div class="drawer-section">' +
          '<div class="section-heading">Shipping & Delivery</div>' +
          shippingHtml +
          fulfillmentHtml +
        '</div>';

        // === SECTION 5: PAYMENT ===
        const gateway = (detail.payment_gateway_names && detail.payment_gateway_names.length)
          ? detail.payment_gateway_names.join(', ')
          : (detail.gateway || '—');

        let transactionsHtml = '';
        if (detail.transactions && detail.transactions.length > 0) {
          transactionsHtml = '<div style="margin-top:8px;">' +
            '<div class="order-sub" style="font-weight:600;margin-bottom:4px;">Transactions</div>' +
            detail.transactions.map(t => {
              return '<div class="order-sub">' +
                escapeHtml((t.kind || 'transaction') + ' · ' + (t.status || 'unknown')) +
                ' · ' + formatMoney(t.amount, detail.currency) +
                (t.gateway ? ' (' + escapeHtml(t.gateway) + ')' : '') +
                '</div>';
            }).join('') +
            '</div>';
        }

        let refundsHtml = '';
        if (detail.refunds && detail.refunds.length > 0) {
          const totalRefunded = detail.refunds.reduce((sum, r) => {
            return sum + r.transactions.reduce((tsum, t) => tsum + parseFloat(t.amount || 0), 0);
          }, 0);
          refundsHtml = '<div style="margin-top:8px;">' +
            '<div class="order-sub" style="font-weight:600;">Refunds: -' +
            formatMoney(totalRefunded, detail.currency) +
            '</div>' +
            '</div>';
        }

        const paymentSection = '<div class="drawer-section">' +
          '<div class="section-heading">Payment</div>' +
          '<div class="kv-row"><span>Status</span><strong>' +
            (detail.financial_status ? statusPill(detail.financial_status) : '—') +
          '</strong></div>' +
          '<div class="kv-row"><span>Gateway</span><strong>' +
            escapeHtml(gateway) +
          '</strong></div>' +
          '<div class="kv-row"><span>Total Paid</span><strong>' +
            formatMoney(detail.total_price, detail.currency) +
          '</strong></div>' +
          transactionsHtml +
          refundsHtml +
        '</div>';

        // === SECTION 6: ITEMS ===
        const regularItems = detail.line_items
          ? detail.line_items.filter(li => !shippingFromLineItems.includes(li))
          : [];

        const itemsHtml = regularItems.length > 0
          ? regularItems.map((li) => {
              const total = li.total || li.price * (li.quantity || 0);
              const safeImg = li.image_src
                ? String(li.image_src).replace(/"/g, '%22').replace(/'/g, '%27')
                : '';
              const thumb = '<div class="line-thumb"' +
                (safeImg ? ' style="background-image:url(\\'' + safeImg + '\\');"' : '') +
                '></div>';
              return (
                '<div class="line-item">' +
                  '<div class="line-item-left">' +
                    thumb +
                    '<div>' +
                      '<div class="line-item-title">' +
                        '<button class="link-inline order-product-link" ' +
                          'data-product-id="' + escapeHtml(li.product_id || '') + '" ' +
                          'data-product-title="' + escapeHtml(li.title || '') + '" ' +
                          'data-product-sku="' + escapeHtml(li.sku || '') + '" ' +
                          'data-product-price="' + (li.price || 0) + '"' +
                        '>' +
                          escapeHtml(li.title || 'Product') +
                        '</button>' +
                      '</div>' +
                      (li.sku ? '<div class="order-sub">SKU: ' + escapeHtml(li.sku) + '</div>' : '') +
                      (li.vendor ? '<div class="order-sub">Vendor: ' + escapeHtml(li.vendor) + '</div>' : '') +
                      (li.variant_title ? '<div class="order-sub">' + escapeHtml(li.variant_title) + '</div>' : '') +
                    '</div>' +
                  '</div>' +
                  '<div class="line-item-right">' +
                    '<div class="pill">' + (li.quantity || 0) + ' × ' + formatMoney(li.price, detail.currency) + '</div>' +
                    '<div class="order-sub">' + formatMoney(total, detail.currency) + '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('')
          : '<div class="order-sub">No items.</div>';

        const itemsSection = '<div class="drawer-section">' +
          '<div class="section-heading">Items</div>' +
          itemsHtml +
        '</div>';

        // === SECTION 7: RAW JSON (COLLAPSIBLE) ===
        const rawJsonSection = '<div class="drawer-section">' +
          '<details style="margin-top:8px;">' +
            '<summary style="cursor:pointer;font-weight:600;color:var(--muted);font-size:12px;margin-bottom:6px;">Raw Order JSON</summary>' +
            '<pre style="background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;font-size:11px;overflow-x:auto;max-height:300px;overflow-y:auto;">' +
              escapeHtml(JSON.stringify(detail, null, 2)) +
            '</pre>' +
          '</details>' +
        '</div>';

        // === ASSEMBLE ALL SECTIONS ===
        const bodyHtml = overviewSection +
          customerSection +
          addressesSection +
          shippingSection +
          paymentSection +
          itemsSection +
          rawJsonSection;

        const orderUrl = buildShopifyUrl('order', detail);

        return {
          title: detail.name || 'Order #' + (detail.order_number || detail.id),
          subtitle:
            (detail.store_name || detail.store_id || '') +
            (detail.created_at ? ' · ' + formatDateTime(detail.created_at) : ''),
          bodyHtml,
          shopifyUrl: orderUrl,
        };
      }

      function buildCustomerContent(detail) {
        const customer = detail && detail.customer;
        const addressText = formatAddress(
          (detail && (detail.shipping_address || detail.billing_address)) || null
        );
        const email = customer ? customer.email || (detail && detail.contact_email) || '' : '';
        const relatedOrders = customer ? ordersForCustomer(customer) : [];
        const totalSpend = relatedOrders.reduce(
          (sum, o) => sum + (Number(o.total_price) || 0),
          0
        );
        const sortedOrders = [...relatedOrders].sort(
          (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)
        );
        const lastOrder = sortedOrders.length ? sortedOrders[0] : null;
        const customerUrl = buildShopifyUrl('customer', detail);

        const body = customer
          ? '<div class="drawer-section">' +
              '<div class="section-heading">Contact</div>' +
              '<div class="kv-row"><span>Name</span><strong>' +
                escapeHtml((customer.first_name || '') + ' ' + (customer.last_name || '')) +
              '</strong></div>' +
              '<div class="kv-row"><span>Email</span><strong>' +
                escapeHtml(email || '—') +
              '</strong></div>' +
              '<div class="kv-row"><span>Phone</span><strong>' +
                escapeHtml(customer.phone || '—') +
              '</strong></div>' +
              '<div class="kv-row"><span>Address</span><strong>' +
                escapeHtml(addressText) +
              '</strong></div>' +
            '</div>' +
            '<div class="drawer-section">' +
              '<div class="section-heading">Orders summary</div>' +
              '<div class="drawer-stats">' +
                '<div class="stat-card-mini">' +
                  '<span class="label">Orders</span>' +
                  '<div class="value">' + relatedOrders.length + '</div>' +
                '</div>' +
                '<div class="stat-card-mini">' +
                  '<span class="label">Total</span>' +
                  '<div class="value">' + formatMoney(totalSpend, detail.currency) + '</div>' +
                '</div>' +
                '<div class="stat-card-mini">' +
                  '<span class="label">Last order</span>' +
                  '<div class="value">' +
                    (lastOrder
                      ? escapeHtml(lastOrder.name || '#' + lastOrder.id) +
                        ' · ' +
                        formatDateTime(lastOrder.created_at)
                      : '—') +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>'
          : '<div class="drawer-section"><div class="order-sub">Guest checkout</div></div>';

        return {
          title:
            customer && (customer.first_name || customer.last_name)
              ? (customer.first_name || '') + ' ' + (customer.last_name || '')
              : 'Client',
          subtitle: escapeHtml(email || (detail ? detail.store_name : '') || ''),
          bodyHtml: body,
          shopifyUrl: customerUrl,
        };
      }

      function buildCustomerFullContent(data) {
        // data IS the customer object (not a wrapper)
        const detail = data || {};
        const loading = data && data._loading;

        if (loading) {
          return {
            title: 'Loading...',
            subtitle: '',
            bodyHtml: '<div class="drawer-section"><div class="order-sub">Loading customer details...</div></div>',
            shopifyUrl: null,
          };
        }

        if (data && data.error) {
          return {
            title: 'Error',
            subtitle: '',
            bodyHtml: '<div class="drawer-section"><div class="order-sub" style="color:var(--error);">Error loading customer: ' + escapeHtml(data.error) + '</div></div>',
            shopifyUrl: null,
          };
        }

        // SECTION 1: OVERVIEW
        const displayName = detail.first_name || detail.last_name
          ? (detail.first_name || '') + ' ' + (detail.last_name || '')
          : (detail.email || 'Customer');

        const overviewSection =
          '<div class="drawer-section">' +
            '<div class="section-heading">Overview</div>' +
            (detail.store_id ? '<div class="kv-row"><span>Store</span><strong>' +
              escapeHtml(detail.store_name || detail.store_id) +
            '</strong></div>' : '') +
            '<div class="kv-row"><span>Customer ID</span><strong>' +
              escapeHtml(String(detail.id || detail.customer_id || '—')) +
            '</strong></div>' +
            '<div class="kv-row"><span>Created</span><strong>' +
              (detail.created_at ? formatDateTime(detail.created_at) : '—') +
            '</strong></div>' +
            '<div class="kv-row"><span>Updated</span><strong>' +
              (detail.updated_at ? formatDateTime(detail.updated_at) : '—') +
            '</strong></div>' +
            '<div class="kv-row"><span>State</span><strong>' +
              (detail.state ? statusPill(detail.state) : '—') +
            '</strong></div>' +
            (detail.tags ? '<div class="kv-row"><span>Tags</span><strong>' + escapeHtml(detail.tags) + '</strong></div>' : '') +
            (detail.note ? '<div class="kv-row"><span>Note</span><strong>' + escapeHtml(detail.note) + '</strong></div>' : '') +
          '</div>';

        // SECTION 2: CONTACT
        const contactSection =
          '<div class="drawer-section">' +
            '<div class="section-heading">Contact</div>' +
            '<div class="kv-row"><span>Name</span><strong>' +
              escapeHtml(displayName) +
            '</strong></div>' +
            '<div class="kv-row"><span>Email</span><strong>' +
              escapeHtml(detail.email || '—') +
              (detail.verified_email === true ? ' <span class="pill" style="background:var(--success);">Verified</span>' : '') +
            '</strong></div>' +
            '<div class="kv-row"><span>Phone</span><strong>' +
              escapeHtml(detail.phone || '—') +
            '</strong></div>' +
          '</div>';

        // SECTION 3: ORDERS SUMMARY
        const ordersSection =
          '<div class="drawer-section">' +
            '<div class="section-heading">Orders Summary</div>' +
            '<div class="kv-row"><span>Total Orders</span><strong>' +
              formatNumber(detail.orders_count || 0) +
            '</strong></div>' +
            '<div class="kv-row"><span>Total Spent</span><strong>' +
              formatMoney(detail.total_spent || 0, detail.currency || 'RON') +
            '</strong></div>' +
            (detail.last_order_name ? '<div class="kv-row"><span>Last Order</span><strong>' +
              escapeHtml(detail.last_order_name) +
            '</strong></div>' : '') +
          '</div>';

        // SECTION 4: DEFAULT ADDRESS
        const defaultAddress = detail.default_address || {};
        const addressSection = (defaultAddress && (defaultAddress.address1 || defaultAddress.city)) ?
          '<div class="drawer-section">' +
            '<div class="section-heading">Default Address</div>' +
            (defaultAddress.address1 ? '<div class="kv-row"><span>Address</span><strong>' +
              escapeHtml(defaultAddress.address1) +
              (defaultAddress.address2 ? ', ' + escapeHtml(defaultAddress.address2) : '') +
            '</strong></div>' : '') +
            (defaultAddress.city ? '<div class="kv-row"><span>City</span><strong>' +
              escapeHtml(defaultAddress.city) +
            '</strong></div>' : '') +
            (defaultAddress.province ? '<div class="kv-row"><span>Province</span><strong>' +
              escapeHtml(defaultAddress.province) +
              (defaultAddress.province_code ? ' (' + escapeHtml(defaultAddress.province_code) + ')' : '') +
            '</strong></div>' : '') +
            (defaultAddress.zip ? '<div class="kv-row"><span>ZIP</span><strong>' +
              escapeHtml(defaultAddress.zip) +
            '</strong></div>' : '') +
            (defaultAddress.country ? '<div class="kv-row"><span>Country</span><strong>' +
              escapeHtml(defaultAddress.country) +
              (defaultAddress.country_code ? ' (' + escapeHtml(defaultAddress.country_code) + ')' : '') +
            '</strong></div>' : '') +
          '</div>'
          : '';

        // SECTION 5: MARKETING
        const marketingSection = (detail.email_marketing_consent || detail.sms_marketing_consent) ?
          '<div class="drawer-section">' +
            '<div class="section-heading">Marketing</div>' +
            (detail.email_marketing_consent && detail.email_marketing_consent.state ?
              '<div class="kv-row"><span>Email Marketing</span><strong>' +
                statusPill(detail.email_marketing_consent.state) +
                (detail.email_marketing_consent.opt_in_level ? ' (' + escapeHtml(detail.email_marketing_consent.opt_in_level) + ')' : '') +
              '</strong></div>'
              : '') +
            (detail.sms_marketing_consent && detail.sms_marketing_consent.state ?
              '<div class="kv-row"><span>SMS Marketing</span><strong>' +
                statusPill(detail.sms_marketing_consent.state) +
                (detail.sms_marketing_consent.opt_in_level ? ' (' + escapeHtml(detail.sms_marketing_consent.opt_in_level) + ')' : '') +
              '</strong></div>'
              : '') +
            (detail.marketing_opt_in_level ? '<div class="kv-row"><span>Opt-in Level</span><strong>' +
              escapeHtml(detail.marketing_opt_in_level) +
            '</strong></div>' : '') +
          '</div>'
          : '';

        // SECTION 6: CUSTOMER ORDERS LIST
        const customerOrdersSection = detail._orders
          ? buildCustomerOrdersSection(detail._orders, detail.store_id)
          : '<div class="drawer-section" id="customer-orders-section">' +
              '<div class="section-heading">Orders</div>' +
              '<div class="order-sub">Loading orders...</div>' +
            '</div>';

        // SECTION 7: RAW JSON VIEWER
        const rawJsonSection =
          '<div class="drawer-section">' +
            '<details style="margin-top:8px;">' +
              '<summary style="cursor:pointer;font-weight:600;color:var(--muted);font-size:12px;">Raw Customer JSON</summary>' +
              '<pre style="background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;font-size:11px;overflow-x:auto;max-height:300px;overflow-y:auto;">' +
                escapeHtml(JSON.stringify(detail, null, 2)) +
              '</pre>' +
            '</details>' +
          '</div>';

        const customerUrl = buildShopifyUrl('customer', { customer: { id: detail.id || detail.customer_id }, shopify_domain: detail.shopify_domain });

        return {
          title: displayName,
          subtitle: escapeHtml(detail.email || detail.store_name || ''),
          bodyHtml: overviewSection + contactSection + ordersSection + addressSection + marketingSection + customerOrdersSection + rawJsonSection,
          shopifyUrl: customerUrl,
        };
      }

      function buildCustomerOrdersSection(orders, storeId) {
        if (!orders || orders.length === 0) {
          return '<div class="drawer-section" id="customer-orders-section">' +
            '<div class="section-heading">Orders</div>' +
            '<div class="order-sub">No orders found for this customer.</div>' +
          '</div>';
        }

        const orderRows = orders.map(order => {
          const financialBadge = order.financial_status
            ? '<span class="pill" style="background:var(--muted);font-size:10px;margin-left:4px;">' +
              escapeHtml(order.financial_status) +
              '</span>'
            : '';
          const fulfillmentBadge = order.fulfillment_status
            ? '<span class="pill" style="background:var(--muted);font-size:10px;margin-left:4px;">' +
              escapeHtml(order.fulfillment_status) +
              '</span>'
            : '';

          return '<div class="customer-order-link" data-order-id="' + escapeHtml(order.order_id) + '" data-store-id="' + escapeHtml(storeId) + '" style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.1);cursor:pointer;display:flex;justify-content:space-between;align-items:center;">' +
            '<div style="flex:1;">' +
              '<div style="font-weight:600;color:var(--text);">' +
                escapeHtml(order.order_name || '#' + order.order_id) +
                financialBadge +
                fulfillmentBadge +
              '</div>' +
              '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' +
                (order.created_at ? formatDateTime(order.created_at) : '—') +
              '</div>' +
            '</div>' +
            '<div style="text-align:right;font-weight:600;color:var(--text);">' +
              formatMoney(order.total_price || 0, order.currency || 'RON') +
            '</div>' +
          '</div>';
        }).join('');

        return '<div class="drawer-section" id="customer-orders-section">' +
          '<div class="section-heading">Orders (' + orders.length + ')</div>' +
          '<div style="max-height:300px;overflow-y:auto;margin-top:8px;">' +
            orderRows +
          '</div>' +
        '</div>';
      }

      function buildProductContent(product, detail) {
        const hasProduct = !!product;
        const productOrders = hasProduct
          ? ordersContainingProduct(product.product_id, product.title)
          : [];
        const sorted = [...productOrders].sort(
          (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)
        );
        const count = productOrders.length;
        const lastOrder = sorted.length ? sorted[0] : null;
        const productUrl = hasProduct
          ? buildShopifyUrl('product', product, detail && detail.shopify_domain)
          : null;

        const chooser =
          detail && detail.line_items && detail.line_items.length
            ? '<div class="drawer-section">' +
                '<div class="section-heading">Selectează produs</div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
                  detail.line_items
                    .map((li, idx) => {
                      const active =
                        product && li.product_id && product.product_id &&
                        String(li.product_id) === String(product.product_id)
                          ? ' active'
                          : '';
                      return (
                        '<button class="pill product-choice' +
                        active +
                        '" data-product-idx="' +
                        idx +
                        '" data-product-id="' +
                        escapeHtml(li.product_id || '') +
                        '">' +
                          escapeHtml(li.title || 'Product') +
                          (li.sku ? ' · ' + escapeHtml(li.sku) : '') +
                        '</button>'
                      );
                    })
                    .join('') +
                '</div>' +
              '</div>'
            : '';

        const body =
          chooser +
          (hasProduct
            ? '<div class="drawer-section">' +
                '<div class="section-heading">Product</div>' +
                '<div class="kv-row"><span>Title</span><strong>' +
                  escapeHtml(product.title || 'Product') +
                '</strong></div>' +
                '<div class="kv-row"><span>SKU</span><strong>' +
                  escapeHtml(product.sku || '—') +
                '</strong></div>' +
                '<div class="kv-row"><span>Price</span><strong>' +
                  formatMoney(product.price, detail ? detail.currency : 'RON') +
                '</strong></div>' +
              '</div>' +
              '<div class="drawer-section">' +
                '<div class="section-heading">Context</div>' +
                '<div class="kv-row"><span>Orders (this view)</span><strong>' +
                  count +
                '</strong></div>' +
                '<div class="kv-row"><span>Last seen</span><strong>' +
                (lastOrder
                  ? escapeHtml(lastOrder.name || '#' + lastOrder.id) +
                    ' · ' +
                    formatDateTime(lastOrder.created_at)
                  : '—') +
                '</strong></div>' +
              '</div>'
            : '<div class="drawer-section"><div class="order-sub">Selectează un produs din listă.</div></div>');

        return {
          title: hasProduct ? product.title || 'Product' : 'Produs',
          subtitle: hasProduct ? escapeHtml(product.sku || '') : '',
          bodyHtml: body,
          shopifyUrl: productUrl,
        };
      }

      function renderDrawer() {
        if (!drawerStackEl) return;
        drawerStackEl.innerHTML = '';

        // Handle both order drawer and standalone customer drawer
        const hasContent = drawerState.open && (drawerState.order || drawerState.customer);
        if (!hasContent) {
          drawerStackEl.setAttribute('aria-hidden', 'true');
          drawerBackdrop.classList.remove('visible');
          drawerStackEl.style.pointerEvents = 'none';
          return;
        }

        drawerStackEl.setAttribute('aria-hidden', 'false');
        drawerBackdrop.classList.add('visible');
        drawerStackEl.style.pointerEvents = 'auto';

        const detail = drawerState.order;
        const hasCustomer = !!(detail && detail.customer);
        const hasProducts = detail && detail.line_items && detail.line_items.length;
        if (drawerState.mode === 'product' && hasProducts && !drawerState.product) {
          drawerState.product = detail.line_items[0];
        }

        const tabs = [
          { key: 'order', label: 'Comanda', enabled: !!detail },
          { key: 'customer', label: 'Client', enabled: hasCustomer || drawerState.mode === 'customer' },
          { key: 'product', label: 'Produs', enabled: !!hasProducts },
        ];

        const content =
          drawerState.mode === 'customer' && drawerState.customer
            ? buildCustomerFullContent(drawerState.customer || {})
            : drawerState.mode === 'customer' && detail
            ? buildCustomerContent(detail)
            : drawerState.mode === 'product'
            ? buildProductContent(drawerState.product, detail)
            : buildOrderContent(detail);

        const tabsHtml = tabs
          .map((t) => {
            const active = drawerState.mode === t.key ? ' active' : '';
            const disabled = t.enabled ? '' : ' disabled';
            return (
              '<button class="drawer-tab' +
              active +
              '"' +
              disabled +
              ' data-tab="' +
              t.key +
              '">' +
                t.label +
              '</button>'
            );
          })
          .join('');

        // Standalone customer drawer (no tabs) or order drawer with tabs
        const isStandaloneCustomer = drawerState.mode === 'customer' && drawerState.customer && !detail;
        const panelHtml =
          isStandaloneCustomer
            ? '<div class="drawer-panel order-panel">' +
                '<div class="drawer-header">' +
                  '<button class="drawer-close" data-action="close-panel">Close</button>' +
                  '<div>' +
                    '<div class="drawer-title">' + escapeHtml(content.title || '') + '</div>' +
                    (content.subtitle ? '<div class="order-sub">' + content.subtitle + '</div>' : '') +
                  '</div>' +
                '</div>' +
                '<div class="drawer-body">' + content.bodyHtml + '</div>' +
                '<div class="drawer-footer">' +
                  (content.shopifyUrl
                    ? '<a class="btn-shopify" target="_blank" rel="noopener" href="' +
                      escapeHtml(content.shopifyUrl) +
                      '">DESCHIDE ÎN SHOPIFY</a>'
                    : '<button class="btn-shopify" disabled>DESCHIDE ÎN SHOPIFY</button>') +
                '</div>' +
              '</div>'
            : '<div class="drawer-panel order-panel">' +
                '<div class="drawer-tabs">' + tabsHtml + '</div>' +
                '<div class="drawer-header">' +
                  '<button class="drawer-close" data-action="close-panel">Close</button>' +
                  '<div>' +
                    '<div class="drawer-title">' + escapeHtml(content.title || '') + '</div>' +
                    (content.subtitle ? '<div class="order-sub">' + content.subtitle + '</div>' : '') +
                  '</div>' +
                '</div>' +
                '<div class="drawer-body">' + content.bodyHtml + '</div>' +
                '<div class="drawer-footer">' +
                  (content.shopifyUrl
                    ? '<a class="btn-shopify" target="_blank" rel="noopener" href="' +
                      escapeHtml(content.shopifyUrl) +
                      '">DESCHIDE ÎN SHOPIFY</a>'
                    : '<button class="btn-shopify" disabled>DESCHIDE ÎN SHOPIFY</button>') +
                '</div>' +
              '</div>';

        drawerStackEl.innerHTML = panelHtml;
        const panel = drawerStackEl.querySelector('.drawer-panel');
        requestAnimationFrame(() => {
          if (panel) panel.classList.add('open');
        });

        if (!isStandaloneCustomer) {
          drawerStackEl.querySelectorAll('.drawer-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
              if (tab.disabled) return;
              const key = tab.getAttribute('data-tab');
              drawerState.mode = key;
              if (key === 'product' && hasProducts && !drawerState.product) {
                drawerState.product = detail.line_items[0];
              }
              renderDrawer();
            });
          });
        }

        const closeBtn = drawerStackEl.querySelector('[data-action="close-panel"]');
        if (closeBtn) {
          closeBtn.addEventListener('click', closeAllPanels);
        }

        const customerBtn = drawerStackEl.querySelector('[data-action="view-customer"]');
        if (customerBtn && hasCustomer) {
          customerBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            drawerState.mode = 'customer';
            renderDrawer();
          });
        }

        drawerStackEl.querySelectorAll('.order-product-link').forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            drawerState.mode = 'product';
            drawerState.product = {
              product_id: btn.getAttribute('data-product-id'),
              title: btn.getAttribute('data-product-title') || '',
              sku: btn.getAttribute('data-product-sku') || '',
              price: parseFloat(btn.getAttribute('data-product-price') || '0'),
              shopify_domain: detail.shopify_domain,
            };
            renderDrawer();
          });
        });

        drawerStackEl.querySelectorAll('.customer-order-link').forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            const orderId = btn.getAttribute('data-order-id');
            const storeId = btn.getAttribute('data-store-id');
            openOrderDrawer(orderId, storeId);
          });
        });

        drawerStackEl.querySelectorAll('.product-choice').forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            const idx = parseInt(btn.getAttribute('data-product-idx'), 10);
            if (Number.isNaN(idx) || !detail.line_items[idx]) return;
            drawerState.product = detail.line_items[idx];
            drawerState.mode = 'product';
            renderDrawer();
          });
        });
      }

      async function openOrderDrawer(orderId, storeId) {
        // Defensive guards
        if (!orderId || !storeId) {
          console.error('openOrderDrawer: Missing orderId or storeId', { orderId, storeId });
          return;
        }

        if (orderId === 'undefined' || orderId === 'null') {
          console.error('openOrderDrawer: Invalid orderId', orderId);
          return;
        }

        const cacheKey = storeId + '::' + orderId;
        const loadingDetail = {
          id: orderId,
          store_id: storeId,
          name: 'Order #' + orderId,
          _loading: true,
          line_items: [],
          shopify_domain: '',
          store_name: '',
          currency: 'RON',
        };
        drawerState.open = true;
        drawerState.mode = 'order';
        drawerState.order = loadingDetail;
        drawerState.product = null;
        renderDrawer();

        if (orderDetailsCache.has(cacheKey)) {
          const cached = orderDetailsCache.get(cacheKey);
          drawerState.order = cached;
          renderDrawer();
          return;
        }

        try {
          const res = await fetch(
            '/orders/' +
              encodeURIComponent(storeId) +
              '/' +
              encodeURIComponent(orderId)
          );

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'HTTP ' + res.status);
          }

          const data = await res.json();
          const detail = data.order;

          if (!detail) {
            throw new Error('Order not found in response');
          }

          // Ensure required fields exist
          const enrichedDetail = {
            ...detail,
            id: detail.id || orderId,
            name: detail.name || ('#' + orderId),
            store_id: detail.store_id || storeId,
            line_items: detail.line_items || [],
            currency: detail.currency || 'RON',
            total_price: detail.total_price || 0,
          };

          orderDetailsCache.set(cacheKey, enrichedDetail);
          drawerState.order = enrichedDetail;
          renderDrawer();
        } catch (err) {
          console.error('Error loading order', { orderId, storeId, error: err });
          drawerState.order = {
            id: orderId,
            store_id: storeId,
            name: 'Order #' + orderId,
            _loading: false,
            line_items: [],
            store_name: storeId,
            shopify_domain: '',
            created_at: '',
            customer: null,
            currency: 'RON',
            total_price: 0,
            error: err.message || String(err),
          };
          renderDrawer();
        }
      }

      async function openCustomerDetail(storeId, customerId) {
        // Defensive guards
        if (!storeId || !customerId || customerId === 'undefined' || customerId === 'null') {
          console.error('[openCustomerDetail] Invalid params:', { storeId, customerId });
          return;
        }

        drawerState.open = true;
        drawerState.mode = 'customer';
        drawerState.customer = { _loading: true };
        renderDrawer();

        const url = '/customers/' + encodeURIComponent(storeId) + '/' + encodeURIComponent(customerId);
        console.log('[openCustomerDetail] Fetching:', url);

        try {
          const res = await fetch(url);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('[openCustomerDetail] HTTP error:', res.status, errorData);
            throw new Error('HTTP ' + res.status + (res.status === 404 ? ' - Customer not found' : ''));
          }
          const data = await res.json();
          // Robust parsing: accept { customer: {...} }, { raw_json: {...} }, or direct object
          const customerObj = data?.customer ?? data?.raw_json ?? data;
          if (!customerObj || typeof customerObj !== 'object') {
            throw new Error('Invalid customer payload');
          }
          console.log('[openCustomerDetail] customer keys count:', Object.keys(customerObj).length);
          drawerState.customer = customerObj;
          renderDrawer();

          // Fetch customer orders in background
          fetchCustomerOrders(storeId, customerId);
        } catch (err) {
          console.error('[openCustomerDetail] Error:', err);
          drawerState.customer = {
            error: err.message || String(err),
            id: customerId,
            store_id: storeId,
          };
          drawerState.mode = 'customer';
          renderDrawer();
        }
      }

      async function fetchCustomerOrders(storeId, customerId) {
        try {
          const ordersUrl = '/customers/' + encodeURIComponent(storeId) + '/' + encodeURIComponent(customerId) + '/orders';
          const res = await fetch(ordersUrl);
          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }
          const data = await res.json();
          const orders = data.orders || [];

          // Update customer object with orders and re-render
          if (drawerState.customer && drawerState.mode === 'customer') {
            drawerState.customer._orders = orders;
            renderDrawer();
          }
        } catch (err) {
          console.error('[fetchCustomerOrders] Error:', err);
          // Silently fail - orders section will show "Loading orders..." or error
          if (drawerState.customer && drawerState.mode === 'customer') {
            drawerState.customer._orders = [];
            renderDrawer();
          }
        }
      }

      async function loadOrders() {
        if (ordersState.loading) return;

        ordersState.loading = true;
        ordersState.error = '';
        renderOrdersTable();

        const qs = new URLSearchParams();
        qs.set('store_id', selectedStoreId || 'all');
        qs.set('limit', ORDER_PAGE_SIZE);
        qs.set('sort_by', ordersState.sort.by);
        qs.set('sort_dir', ordersState.sort.dir);
        if (ordersState.filters.q) qs.set('q', ordersState.filters.q);
        if (ordersState.filters.status) qs.set('status', ordersState.filters.status);

        try {
          const res = await fetch('/orders?' + qs.toString());
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();

          ordersState.items = Array.isArray(data.orders) ? data.orders : [];
          ordersState.totalTodayOrders = data.totalTodayOrders || 0;

          // Update today's metric
          if (statTodayHome) {
            statTodayHome.textContent = formatNumber(ordersState.totalTodayOrders);
          }

          console.log('[orders] Loaded', ordersState.items.length, 'orders (server-side sorted)');
        } catch (err) {
          console.error('Error /orders', err);
          ordersState.items = [];
          ordersState.error = err.message || String(err);
        } finally {
          ordersState.loading = false;
          ordersDirty = false;
          renderOrdersTable();
        }
      }

      async function loadCustomers() {
        customersState.loading = true;
        customersState.error = '';
        renderCustomersTable();

        const qs = new URLSearchParams();
        qs.set('store_id', selectedStoreId || 'all');
        qs.set('limit', customersState.filters.limit || 1000);
        qs.set('sort_by', customersState.sort.by);
        qs.set('sort_dir', customersState.sort.dir);
        if (customersState.filters.q) qs.set('q', customersState.filters.q);

        try {
          const res = await fetch('/customers?' + qs.toString());
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          customersState.items = Array.isArray(data.customers) ? data.customers : [];
          customersState.total = data.totalCustomers || data.total || customersState.items.length;

          console.log('[customers] Loaded', customersState.items.length, 'customers (no pagination)');
        } catch (err) {
          console.error('Error /customers', err);
          customersState.items = [];
          customersState.error = err.message || String(err);
          customersState.total = 0;
        } finally {
          customersState.loading = false;
          customersDirty = false;
          renderCustomersTable();
        }
      }

      // Load homepage metrics from DB-first endpoint (orders_daily_agg table)
      async function loadMetrics() {
        try {
          const storeId = selectedStoreId === 'all' ? 'ALL' : selectedStoreId;
          const res = await fetch('/metrics/home?store_id=' + encodeURIComponent(storeId));
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const metrics = await res.json();

          // Update homepage stat cards with DB-first metrics
          if (statTodayHome) statTodayHome.textContent = formatNumber(metrics.today_orders || 0);
          if (statWeekHome) statWeekHome.textContent = formatNumber(metrics.week_orders || 0);
          if (statMonthHome) statMonthHome.textContent = formatNumber(metrics.month_orders || 0);
          if (statYearHome) statYearHome.textContent = formatNumber(metrics.year_orders || 0);

          // Update last sync timestamp
          const syncDisplay = document.getElementById('sync-status-display');
          const syncTime = document.getElementById('sync-time');
          if (syncDisplay && syncTime && metrics.last_sync_at) {
            // Convert to Europe/Bucharest timezone and format
            const syncDate = new Date(metrics.last_sync_at);
            const bucharestTime = syncDate.toLocaleString('en-US', {
              timeZone: 'Europe/Bucharest',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            const bucharestDate = syncDate.toLocaleDateString('en-US', {
              timeZone: 'Europe/Bucharest',
              month: 'short',
              day: 'numeric'
            });

            // Show date if not today
            const today = new Date().toLocaleDateString('en-US', {
              timeZone: 'Europe/Bucharest',
              month: 'short',
              day: 'numeric'
            });

            if (bucharestDate === today) {
              syncTime.textContent = bucharestTime;
            } else {
              syncTime.textContent = bucharestDate + ', ' + bucharestTime;
            }

            syncDisplay.style.display = 'flex';
          } else if (syncDisplay) {
            syncDisplay.style.display = 'none';
          }

          console.log('[metrics] Loaded homepage metrics:', {
            store_id: storeId,
            today: metrics.today_orders,
            week: metrics.week_orders,
            month: metrics.month_orders,
            year: metrics.year_orders,
            last_sync: metrics.last_sync_at,
            refresh_triggered: metrics.refresh_triggered,
            refresh_running: metrics.refresh_running,
          });

          // Auto-refresh if background refresh is running
          if (metrics.refresh_running) {
            console.log('[metrics] Background refresh detected, will auto-refresh in 7 seconds...');
            setTimeout(() => {
              console.log('[metrics] Auto-refreshing metrics after background refresh...');
              loadMetrics();
            }, 7000); // 7 seconds delay
          }
        } catch (err) {
          console.error('[metrics] Failed to load homepage metrics:', err);
          // Fallback to showing zeros or dashes
          if (statTodayHome) statTodayHome.textContent = '–';
          if (statWeekHome) statWeekHome.textContent = '–';
          if (statMonthHome) statMonthHome.textContent = '–';
          if (statYearHome) statYearHome.textContent = '–';

          const syncDisplay = document.getElementById('sync-status-display');
          if (syncDisplay) syncDisplay.style.display = 'none';
        }
      }

      // ==================== AI INSIGHTS FUNCTIONS ====================

      let aiInsightsLoading = false;

      function renderAiInsightsSkeleton() {
        if (!aiInsightsBody) return;
        aiInsightsBody.innerHTML = \`
          <div class="ai-insights-skeleton">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
          </div>
        \`;
      }

      function renderAiInsightsError(message) {
        if (!aiInsightsBody) return;
        aiInsightsBody.innerHTML = \`
          <div class="ai-insights-error">
            <strong>Nu s-au putut încărca recomandările AI</strong><br>
            \${escapeHtml(message)}
          </div>
        \`;
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function formatCurrency(amount) {
        if (amount == null) return '–';
        return Math.round(amount).toLocaleString('ro-RO');
      }

      function renderAiInsights(data) {
        if (!aiInsightsBody) return;

        const insight = data.insight;
        const cache = data.cache || {};
        const metrics = data.metrics || {};

        // Update cache badge
        if (aiCacheBadge) {
          if (cache.hit) {
            aiCacheBadge.textContent = 'cached';
            aiCacheBadge.className = 'ai-cache-badge hit';
            aiCacheBadge.style.display = 'inline';
          } else {
            aiCacheBadge.style.display = 'none';
          }
        }

        // Check for error in insight
        if (insight.error) {
          renderAiInsightsError(insight.sumar || 'Eroare necunoscută');
          return;
        }

        // Build recommended products HTML
        const produseRecomandate = insight.produse_recomandate || [];
        let produseRecomandateHtml = '';
        if (produseRecomandate.length > 0) {
          const produseItems = produseRecomandate.map(p => {
            const actiuniHtml = (p.actiuni || []).map(a => '<span class="ai-action-tag">' + escapeHtml(a) + '</span>').join(' ');
            const magazineHtml = p.magazine_recomandate && p.magazine_recomandate.length > 0
              ? '<div class="ai-product-stores">Magazine: ' + p.magazine_recomandate.map(m => escapeHtml(m)).join(', ') + '</div>'
              : '';
            return \`
              <div class="ai-product-card">
                <div class="ai-product-name">\${escapeHtml(p.nume)}\${p.sku ? ' <span class="ai-sku">(' + escapeHtml(p.sku) + ')</span>' : ''}</div>
                <div class="ai-product-why">\${escapeHtml(p.de_ce || '')}</div>
                <div class="ai-product-metrics">\${escapeHtml(p.metrici || '')}</div>
                \${magazineHtml}
                <div class="ai-product-actions">\${actiuniHtml}</div>
              </div>
            \`;
          }).join('');
          produseRecomandateHtml = \`
            <div class="ai-section">
              <div class="ai-section-title">Produse Recomandate</div>
              <div class="ai-products-grid">\${produseItems}</div>
            </div>
          \`;
        }

        // Build momentum products HTML
        const produseMomentum = insight.produse_momentum || [];
        let produseMomentumHtml = '';
        if (produseMomentum.length > 0) {
          const momentumItems = produseMomentum.map(p => \`
            <div class="ai-momentum-item">
              <span class="ai-momentum-name">\${escapeHtml(p.nume)}</span>
              <span class="ai-momentum-trend">\${escapeHtml(p.trend || '')}</span>
              <span class="ai-momentum-action">\${escapeHtml(p.actiune || '')}</span>
            </div>
          \`).join('');
          produseMomentumHtml = \`
            <div class="ai-section ai-section-compact">
              <div class="ai-section-title">Produse cu Momentum</div>
              <div class="ai-momentum-list">\${momentumItems}</div>
            </div>
          \`;
        }

        // Build steady bestsellers HTML
        const bestsellersStabili = insight.bestsellers_stabili || [];
        let bestsellersHtml = '';
        if (bestsellersStabili.length > 0) {
          const bestsellersItems = bestsellersStabili.map(p => \`
            <div class="ai-bestseller-item">
              <span class="ai-bestseller-name">\${escapeHtml(p.nume)}</span>
              <span class="ai-bestseller-consistency">\${escapeHtml(p.consistenta || '')}</span>
            </div>
          \`).join('');
          bestsellersHtml = \`
            <div class="ai-section ai-section-compact">
              <div class="ai-section-title">Bestsellers Stabili</div>
              <div class="ai-bestsellers-list">\${bestsellersItems}</div>
            </div>
          \`;
        }

        // Build numbers chips (from insight.numere)
        const numere = insight.numere || {};
        let numbersHtml = '';

        if (numere.venit_7_zile != null) {
          numbersHtml += \`
            <div class="ai-number-chip">
              <span class="label">Venit 7 zile</span>
              <span class="value">\${formatCurrency(numere.venit_7_zile)} RON</span>
            </div>
          \`;
        }

        if (numere.comenzi_7_zile != null) {
          numbersHtml += \`
            <div class="ai-number-chip">
              <span class="label">Comenzi 7 zile</span>
              <span class="value">\${numere.comenzi_7_zile}</span>
            </div>
          \`;
        }

        if (numere.trend_procent != null) {
          const trendClass = numere.trend_procent > 0 ? 'positive' : numere.trend_procent < 0 ? 'negative' : '';
          const trendSign = numere.trend_procent > 0 ? '+' : '';
          numbersHtml += \`
            <div class="ai-number-chip \${trendClass}">
              <span class="label">Trend</span>
              <span class="value">\${trendSign}\${numere.trend_procent.toFixed(1)}%</span>
            </div>
          \`;
        }

        if (numere.produs_top) {
          numbersHtml += \`
            <div class="ai-number-chip">
              <span class="label">Top Produs</span>
              <span class="value">\${escapeHtml(numere.produs_top)}</span>
            </div>
          \`;
        }

        // Season context
        let seasonHtml = '';
        if (insight.context_sezon) {
          seasonHtml = \`<div class="ai-season-context">\${escapeHtml(insight.context_sezon)}</div>\`;
        }

        // Build data gaps section (Romanian)
        let dataGapsHtml = '';
        if (insight.gaps_date && insight.gaps_date.length > 0) {
          const gapsListHtml = insight.gaps_date.map(g => '<li>' + escapeHtml(g) + '</li>').join('');
          dataGapsHtml = \`
            <div class="ai-data-gaps">
              <div class="ai-data-gaps-title">Date Lipsă</div>
              <ul style="margin:0;padding-left:16px;">\${gapsListHtml}</ul>
            </div>
          \`;
        }

        // Confidence badge (Romanian)
        const confidence = insight.incredere || 'medie';
        const confidenceLabels = { scazuta: 'Scăzută', medie: 'Medie', ridicata: 'Ridicată' };
        const confidenceLabel = confidenceLabels[confidence] || confidence;

        // Generated time
        let generatedTimeStr = '';
        if (insight.generated_at) {
          const genDate = new Date(insight.generated_at);
          generatedTimeStr = genDate.toLocaleString('ro-RO', {
            timeZone: 'Europe/Bucharest',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }

        aiInsightsBody.innerHTML = \`
          <div class="ai-insights-content ai-insights-sales">
            <div class="ai-insights-header-summary">
              <div class="ai-insight-title">\${escapeHtml(insight.titlu || 'Produse de Promovat')}</div>
              <div class="ai-insight-summary">\${escapeHtml(insight.sumar || '')}</div>
              \${seasonHtml}
            </div>
            <div class="ai-insights-main">
              \${produseRecomandateHtml}
              <div class="ai-insights-secondary">
                \${produseMomentumHtml}
                \${bestsellersHtml}
              </div>
              \${dataGapsHtml}
            </div>
            <div class="ai-insights-sidebar">
              <div class="ai-insight-numbers">\${numbersHtml}</div>
            </div>
          </div>
          <div class="ai-insights-footer">
            <div class="ai-confidence">
              <span>Încredere:</span>
              <span class="ai-confidence-badge \${confidence}">\${confidenceLabel}</span>
              \${insight.fallback ? '<span style="margin-left:8px;">(Analiză de bază - AI indisponibil)</span>' : ''}
            </div>
            <div>\${generatedTimeStr ? 'Generat la ' + generatedTimeStr : ''}</div>
          </div>
        \`;
      }

      async function loadAiInsights(force = false) {
        if (!aiInsightsBody) return;
        if (aiInsightsLoading) return;

        aiInsightsLoading = true;

        // Show skeleton while loading
        renderAiInsightsSkeleton();

        // Update button state
        if (aiRegenerateBtn) {
          aiRegenerateBtn.disabled = true;
          aiRegenerateBtn.classList.add('loading');
        }

        try {
          const storeId = selectedStoreId === 'all' ? 'ALL' : selectedStoreId;
          const url = '/ai/insights/home?store_id=' + encodeURIComponent(storeId) + (force ? '&force=1' : '');

          console.log('[ai-insights] Loading insights for:', storeId, force ? '(force refresh)' : '');

          const res = await fetch(url);

          if (!res.ok) {
            if (res.status === 429) {
              const errorData = await res.json();
              throw new Error('Rate limited. Please wait ' + (errorData.retry_after || 30) + ' seconds.');
            }
            throw new Error('HTTP ' + res.status);
          }

          const data = await res.json();

          console.log('[ai-insights] Loaded:', {
            cache_hit: data.cache?.hit,
            confidence: data.insight?.confidence,
            llm_available: data.llm?.available,
          });

          renderAiInsights(data);

          // If data refresh is running, auto-reload after delay
          if (data.refresh?.data_refresh_running) {
            console.log('[ai-insights] Date în curs de actualizare, reîncărcare în 10 secunde...');
            setTimeout(() => loadAiInsights(false), 10000);
          }
        } catch (err) {
          console.error('[ai-insights] Failed to load:', err);
          renderAiInsightsError(err.message || 'Unknown error');
        } finally {
          aiInsightsLoading = false;

          // Reset button state
          if (aiRegenerateBtn) {
            aiRegenerateBtn.disabled = false;
            aiRegenerateBtn.classList.remove('loading');
          }
        }
      }

      // Regenerate button handler
      if (aiRegenerateBtn) {
        aiRegenerateBtn.addEventListener('click', () => {
          loadAiInsights(true);
        });
      }

      // Manual refresh metrics handler
      let refreshPollInterval = null;

      async function refreshMetrics() {
        if (!refreshMetricsBtn) return;

        try {
          const storeId = selectedStoreId === 'all' ? 'ALL' : selectedStoreId;

          // Set button loading state
          refreshMetricsBtn.disabled = true;
          refreshMetricsBtn.classList.add('refreshing');
          if (refreshStatus) {
            refreshStatus.textContent = 'Refreshing…';
            refreshStatus.className = 'refresh-status';
          }

          console.log('[metrics-manual] Triggering manual refresh for:', storeId);

          // Call the public manual refresh endpoint (no auth required)
          const res = await fetch('/metrics/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              store_id: storeId,
              mode: 'today',
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'HTTP ' + res.status);
          }

          const result = await res.json();
          console.log('[metrics-manual] Refresh started:', result);

          // Wait 3 seconds then start polling
          setTimeout(async () => {
            console.log('[metrics-manual] Polling for refresh completion...');
            await loadMetrics();

            // Start polling every 6 seconds if refresh is still running
            if (refreshPollInterval) clearInterval(refreshPollInterval);

            refreshPollInterval = setInterval(async () => {
              const metricsRes = await fetch('/metrics/home?store_id=' + encodeURIComponent(storeId));
              if (metricsRes.ok) {
                const metrics = await metricsRes.json();

                if (!metrics.refresh_running) {
                  // Refresh completed
                  console.log('[metrics-manual] Refresh completed');
                  clearInterval(refreshPollInterval);
                  refreshPollInterval = null;

                  // Update UI to show completion
                  refreshMetricsBtn.disabled = false;
                  refreshMetricsBtn.classList.remove('refreshing');
                  if (refreshStatus) {
                    refreshStatus.textContent = 'Refreshed';
                    refreshStatus.className = 'refresh-status success';
                    setTimeout(() => {
                      if (refreshStatus) refreshStatus.textContent = '';
                    }, 3000);
                  }

                  // Load final metrics
                  await loadMetrics();
                }
              }
            }, 6000);
          }, 3000);

        } catch (err) {
          console.error('[metrics-manual] Failed to trigger refresh:', err);

          refreshMetricsBtn.disabled = false;
          refreshMetricsBtn.classList.remove('refreshing');
          if (refreshStatus) {
            refreshStatus.textContent = 'Error';
            refreshStatus.className = 'refresh-status error';
            setTimeout(() => {
              if (refreshStatus) refreshStatus.textContent = '';
            }, 3000);
          }

          if (refreshPollInterval) {
            clearInterval(refreshPollInterval);
            refreshPollInterval = null;
          }
        }
      }

      // Attach refresh button handler
      if (refreshMetricsBtn) {
        refreshMetricsBtn.addEventListener('click', refreshMetrics);
      }

      async function loadStores(prevStoreId = selectedStoreId) {
        try {
          const res = await fetch('/stores');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          const allStores = Array.isArray(data) ? data : [];

          // --- REBUILD dropdown-ul de context, fără să duplicăm opțiunile ---
          storeContextSelect.innerHTML = '';
          const optAll = document.createElement('option');
          optAll.value = 'all';
          optAll.textContent = 'All stores';
          storeContextSelect.appendChild(optAll);

          allStores.forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s.store_id;
            opt.textContent = s.store_name || s.store_id;
            storeContextSelect.appendChild(opt);
          });

          // dacă store-ul selectat nu mai există, revenim la "all"
          if (
            !selectedStoreId ||
            (selectedStoreId !== 'all' &&
              !allStores.some(
                (s) => String(s.store_id) === String(selectedStoreId)
              ))
          ) {
            selectedStoreId = 'all';
          }

          if (prevStoreId !== selectedStoreId) {
            ordersDirty = true;
            orderDetailsCache.clear();
          }

          storeContextSelect.value = selectedStoreId;

          let visibleStores = allStores;
          let contextText = 'All stores';
          if (selectedStoreId !== 'all') {
            visibleStores = allStores.filter(
              (s) => String(s.store_id) === String(selectedStoreId)
            );
            if (visibleStores.length) {
              contextText = visibleStores[0].store_name || selectedStoreId;
            } else {
              contextText = selectedStoreId;
            }
          }

          contextLabelEl.textContent = contextText;
          storeContextLive.textContent = contextText;
          syncContextLabel.textContent =
            'Context: ' +
            (selectedStoreId === 'all'
              ? 'toate magazinele'
              : 'magazin ' + contextText);

          // sort by name
          visibleStores.sort((a, b) => {
            const na = (a.store_name || a.store_id || '').toLowerCase();
            const nb = (b.store_name || b.store_id || '').toLowerCase();
            return na.localeCompare(nb);
          });

          storesCountHome.textContent =
            visibleStores.length + (visibleStores.length === 1 ? ' store' : ' stores');
          storesCountMy.textContent = storesCountHome.textContent;

          buildHomeTable(visibleStores);
          renderMyStoresCards(visibleStores);

          // Load DB-first metrics from orders_daily_agg table
          await loadMetrics();

          // Load AI Insights (non-blocking)
          loadAiInsights();

          if (prevStoreId !== selectedStoreId) {
            setView(currentView);
          }
        } catch (err) {
          console.error('Error /stores', err);
          homeEmpty.style.display = 'block';
          homeEmpty.innerHTML =
            '<strong>Eroare la încărcarea magazinelor.</strong><br />' +
            (err.message || String(err));
          myEmpty.style.display = 'block';
        }
      }

      let searchDebounce = null;
      if (ordersSearchInput) {
        ordersSearchInput.addEventListener('input', () => {
          clearTimeout(searchDebounce);
          searchDebounce = setTimeout(() => {
            ordersState.filters.q = ordersSearchInput.value.trim();
            loadOrders();
          }, 260);
        });
      }

      let custSearchDebounce = null;
      if (customersSearchInput) {
        customersSearchInput.addEventListener('input', () => {
          clearTimeout(custSearchDebounce);
          custSearchDebounce = setTimeout(() => {
            customersState.filters.q = customersSearchInput.value.trim();
            customersState.page = 1;
            loadCustomers();
          }, 260);
        });
      }

      if (ordersStatusSelect) {
        ordersStatusSelect.value = ordersState.filters.status;
      }

      if (ordersStatusSelect) {
        ordersStatusSelect.addEventListener('change', () => {
          ordersState.filters.status = ordersStatusSelect.value || 'all';
          loadOrders();
        });
      }

      if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', closeAllPanels);
      }

      document.addEventListener('keyup', (ev) => {
        if (ev.key === 'Escape') {
          closeAllPanels();
        }
      });

      // change context
      storeContextSelect.addEventListener('change', () => {
        const previousStoreId = selectedStoreId;
        const nextStoreId = storeContextSelect.value || 'all';
        if (previousStoreId === nextStoreId) {
          return;
        }
        selectedStoreId = nextStoreId;
        ordersDirty = true;
        customersDirty = true;
        orderDetailsCache.clear();
        customersState.page = 1;
        closeAllPanels();
        loadStores(previousStoreId);
      });

      // ==================== DAILY REPORTS FUNCTIONS (DAY-CENTRIC) ====================

      function initDailyReports() {
        loadReportsPeople();
        loadReportsProjects();
        loadReportsCalendar();
        setupReportsEventListeners();
      }

      function setupReportsEventListeners() {
        const prevMonthBtn = document.getElementById('reports-prev-month');
        const nextMonthBtn = document.getElementById('reports-next-month');
        const managePeopleBtn = document.getElementById('reports-manage-people-btn');
        const manageProjectsBtn = document.getElementById('reports-manage-projects-btn');
        const peopleFilter = document.getElementById('reports-people-filter');
        const projectFilter = document.getElementById('reports-project-filter');

        // Month navigation
        if (prevMonthBtn) {
          prevMonthBtn.onclick = () => {
            reportsState.currentMonth.setMonth(reportsState.currentMonth.getMonth() - 1);
            loadReportsCalendar();
          };
        }

        if (nextMonthBtn) {
          nextMonthBtn.onclick = () => {
            reportsState.currentMonth.setMonth(reportsState.currentMonth.getMonth() + 1);
            loadReportsCalendar();
          };
        }

        // Filters
        let filterDebounce = null;
        if (peopleFilter) {
          peopleFilter.addEventListener('input', (e) => {
            clearTimeout(filterDebounce);
            filterDebounce = setTimeout(() => {
              reportsState.filters.peopleSearch = e.target.value.trim();
              if (reportsState.selectedDate) {
                loadReportsForDate(reportsState.selectedDate);
              }
            }, 300);
          });
        }

        if (projectFilter) {
          projectFilter.addEventListener('change', (e) => {
            reportsState.filters.projectId = e.target.value;
            if (reportsState.selectedDate) {
              loadReportsForDate(reportsState.selectedDate);
            }
          });
        }

        // Manage People Modal
        if (managePeopleBtn) {
          managePeopleBtn.onclick = () => {
            openPeopleManagementModal();
          };
        }

        const peopleModalClose = document.getElementById('reports-people-modal-close');
        if (peopleModalClose) {
          peopleModalClose.onclick = () => {
            document.getElementById('reports-people-modal').style.display = 'none';
          };
        }

        const addPersonBtn = document.getElementById('reports-add-person-btn');
        if (addPersonBtn) {
          addPersonBtn.onclick = () => {
            openPersonFormModal();
          };
        }

        const personFormClose = document.getElementById('reports-person-form-close');
        if (personFormClose) {
          personFormClose.onclick = () => {
            document.getElementById('reports-person-form-modal').style.display = 'none';
          };
        }

        const personFormCancel = document.getElementById('person-form-cancel');
        if (personFormCancel) {
          personFormCancel.onclick = () => {
            document.getElementById('reports-person-form-modal').style.display = 'none';
          };
        }

        const personForm = document.getElementById('reports-person-form');
        if (personForm) {
          personForm.onsubmit = async (e) => {
            e.preventDefault();
            await submitPersonForm();
          };
        }

        // Manage Projects Modal
        if (manageProjectsBtn) {
          manageProjectsBtn.onclick = () => {
            openProjectsManagementModal();
          };
        }

        const projectsModalClose = document.getElementById('reports-projects-modal-close');
        if (projectsModalClose) {
          projectsModalClose.onclick = () => {
            document.getElementById('reports-projects-modal').style.display = 'none';
          };
        }

        const addProjectBtn = document.getElementById('reports-add-project-btn');
        if (addProjectBtn) {
          addProjectBtn.onclick = () => {
            openProjectFormModal();
          };
        }

        const projectFormClose = document.getElementById('reports-project-form-close');
        if (projectFormClose) {
          projectFormClose.onclick = () => {
            document.getElementById('reports-project-form-modal').style.display = 'none';
          };
        }

        const projectFormCancel = document.getElementById('project-form-cancel');
        if (projectFormCancel) {
          projectFormCancel.onclick = () => {
            document.getElementById('reports-project-form-modal').style.display = 'none';
          };
        }

        const projectForm = document.getElementById('reports-project-form');
        if (projectForm) {
          projectForm.onsubmit = async (e) => {
            e.preventDefault();
            await submitProjectForm();
          };
        }

        // History Modal
        const historyModalClose = document.getElementById('reports-history-modal-close');
        if (historyModalClose) {
          historyModalClose.onclick = () => {
            document.getElementById('reports-history-modal').style.display = 'none';
          };
        }

        // Close modals on backdrop click
        document.querySelectorAll('.reports-modal').forEach(modal => {
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              modal.style.display = 'none';
            }
          });
        });
      }

      async function loadReportsPeople() {
        try {
          console.log('[reports] Loading people...');
          const res = await fetch('/daily-reports/people?active=true');
          console.log('[reports] People response status:', res.status);

          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }

          const data = await res.json();
          reportsState.people = data.people || [];
          console.log('[reports] Loaded people:', reportsState.people.length);
        } catch (err) {
          console.error('[reports] Failed to load people:', err);
          reportsState.people = [];
        }
      }

      async function loadReportsProjects() {
        try {
          console.log('[reports] Loading projects...');
          const res = await fetch('/daily-reports/projects?active=true');
          console.log('[reports] Projects response status:', res.status);

          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }

          const data = await res.json();
          reportsState.projects = data.projects || [];
          console.log('[reports] Loaded projects:', reportsState.projects.length);
          renderProjectsFilter();
        } catch (err) {
          console.error('[reports] Failed to load projects:', err);
          reportsState.projects = [];
        }
      }

      function renderProjectsFilter() {
        const select = document.getElementById('reports-project-filter');
        if (!select) return;

        select.innerHTML = '<option value="">All projects</option>' +
          reportsState.projects.map(proj =>
            '<option value="' + escapeHtml(proj.id) + '">' +
              escapeHtml(proj.name) +
            '</option>'
          ).join('');
      }

      async function loadReportsCalendar() {
        const year = reportsState.currentMonth.getFullYear();
        const month = reportsState.currentMonth.getMonth() + 1;

        document.getElementById('reports-current-month').textContent =
          reportsState.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        try {
          const url = '/daily-reports/calendar?year=' + year + '&month=' + month;
          console.log('[reports] Loading calendar:', url);

          const res = await fetch(url);
          console.log('[reports] Calendar response status:', res.status);

          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }

          const data = await res.json();
          reportsState.calendarStats = data.stats || [];
          console.log('[reports] Loaded calendar stats:', reportsState.calendarStats.length, 'days');
          renderReportsCalendar();
        } catch (err) {
          console.error('[reports] Failed to load calendar:', err);
          reportsState.calendarStats = [];
          renderReportsCalendar();
        }
      }

      function renderReportsCalendar() {
        const grid = document.getElementById('reports-calendar-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const year = reportsState.currentMonth.getFullYear();
        const month = reportsState.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const firstDayOfWeek = firstDay.getDay();

        // Build stats map
        const statsMap = {};
        reportsState.calendarStats.forEach(s => {
          statsMap[s.report_date] = s.submitted_count;
        });

        // Get total active people count
        const totalPeople = reportsState.people.length;

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDayOfWeek; i++) {
          const emptyCell = document.createElement('div');
          emptyCell.className = 'reports-calendar-cell empty';
          grid.appendChild(emptyCell);
        }

        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];
          const submittedCount = statsMap[dateStr] || 0;
          const isToday = dateStr === todayStr;
          const isSelected = reportsState.selectedDate === dateStr;

          const cell = document.createElement('div');
          cell.className = 'reports-calendar-cell';
          if (isToday) cell.classList.add('today');
          if (isSelected) cell.classList.add('selected');
          if (submittedCount > 0) cell.classList.add('has-reports');

          cell.innerHTML =
            '<div class="reports-calendar-day">' + day + '</div>' +
            '<div class="reports-calendar-count">' +
              submittedCount + (totalPeople > 0 ? '/' + totalPeople : '') +
            '</div>';

          cell.onclick = () => selectReportsDate(dateStr);
          grid.appendChild(cell);
        }
      }

      async function selectReportsDate(dateStr) {
        reportsState.selectedDate = dateStr;
        renderReportsCalendar();
        await loadReportsForDate(dateStr);
      }

      async function loadReportsForDate(dateStr) {
        reportsState.loading = true;
        reportsState.error = null;
        renderReportsSummary();
        renderReportsCards();

        try {
          const params = new URLSearchParams({ date: dateStr });
          if (reportsState.filters.projectId) {
            params.set('project_id', reportsState.filters.projectId);
          }
          if (reportsState.filters.peopleSearch) {
            params.set('q', reportsState.filters.peopleSearch);
          }

          const url = '/daily-reports?' + params.toString();
          console.log('[reports] Loading reports:', url);

          const res = await fetch(url);
          console.log('[reports] Response status:', res.status);

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error('HTTP ' + res.status + ': ' + errorText);
          }

          const data = await res.json();
          console.log('[reports] Loaded reports:', {
            reportsCount: (data.reports || []).length,
            summary: data.summary
          });

          reportsState.reports = data.reports || [];
          reportsState.summary = data.summary || null;
          reportsState.error = null;
        } catch (err) {
          console.error('[reports] Failed to load reports for date:', err);
          reportsState.reports = [];
          reportsState.summary = null;
          reportsState.error = err.message || String(err);
        } finally {
          reportsState.loading = false;
          renderReportsSummary();
          renderReportsCards();
        }
      }

      function renderReportsSummary() {
        const container = document.getElementById('reports-summary');
        if (!container) return;

        if (!reportsState.selectedDate) {
          container.innerHTML = '<p class="reports-summary-prompt">← Select a date to view team reports</p>';
          return;
        }

        if (reportsState.error) {
          container.innerHTML =
            '<div class="reports-error-banner">' +
              '<strong>Error loading reports</strong><br />' +
              '<span style="font-size: 12px;">' + escapeHtml(reportsState.error) + '</span>' +
            '</div>';
          return;
        }

        if (reportsState.loading) {
          container.innerHTML =
            '<div class="reports-summary-header">' +
              '<h3>Loading...</h3>' +
            '</div>';
          return;
        }

        const summary = reportsState.summary;
        if (!summary) {
          container.innerHTML =
            '<div class="reports-summary-header">' +
              '<h3>' + reportsState.selectedDate + '</h3>' +
              '<p style="color: var(--muted);">No summary data available</p>' +
            '</div>';
          return;
        }

        const date = new Date(reportsState.selectedDate + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        container.innerHTML =
          '<div class="reports-summary-header">' +
            '<h3>' + formattedDate + '</h3>' +
            '<div class="reports-summary-stats">' +
              '<div class="reports-stat-card">' +
                '<div class="reports-stat-label">Total People</div>' +
                '<div class="reports-stat-value">' + (summary.total_people || 0) + '</div>' +
              '</div>' +
              '<div class="reports-stat-card">' +
                '<div class="reports-stat-label">Submitted</div>' +
                '<div class="reports-stat-value" style="color: var(--success);">' + (summary.submitted || 0) + '</div>' +
              '</div>' +
              '<div class="reports-stat-card">' +
                '<div class="reports-stat-label">Missing</div>' +
                '<div class="reports-stat-value" style="color: var(--danger);">' + (summary.missing || 0) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      function renderReportsCards() {
        const container = document.getElementById('reports-cards-container');
        if (!container) return;

        if (!reportsState.selectedDate) {
          container.innerHTML = '';
          return;
        }

        if (reportsState.error) {
          container.innerHTML = '';
          return;
        }

        if (reportsState.loading) {
          container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 40px;">Loading reports...</p>';
          return;
        }

        // Build a map of reports by person_id
        const reportsMap = {};
        reportsState.reports.forEach(report => {
          reportsMap[report.person_id] = report;
        });

        // Get all active people (for missing people cards)
        const allPeople = reportsState.people;

        if (allPeople.length === 0) {
          container.innerHTML =
            '<div style="text-align: center; padding: 60px 20px;">' +
              '<p style="color: var(--muted); font-size: 16px; margin-bottom: 16px;">No team members found</p>' +
              '<button id="reports-empty-add-people-btn" class="btn-primary">Add Team Members</button>' +
            '</div>';

          // Attach listener for the add people button
          const addPeopleBtn = document.getElementById('reports-empty-add-people-btn');
          if (addPeopleBtn) {
            addPeopleBtn.onclick = () => openPeopleManagementModal();
          }
          return;
        }

        // Filter by search if needed
        let filteredPeople = allPeople;
        if (reportsState.filters.peopleSearch) {
          const query = reportsState.filters.peopleSearch.toLowerCase();
          filteredPeople = allPeople.filter(p =>
            p.display_name.toLowerCase().includes(query) ||
            (p.email && p.email.toLowerCase().includes(query))
          );
        }

        if (filteredPeople.length === 0) {
          container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 40px;">No people found matching your search</p>';
          return;
        }

        container.innerHTML = filteredPeople.map(person => {
          const report = reportsMap[person.id];
          return renderReportCard(person, report);
        }).join('');

        // Attach event listeners
        attachReportCardListeners();
      }

      function renderReportCard(person, report) {
        const hasReport = !!report;
        const projects = hasReport && Array.isArray(report.projects) ? report.projects : [];
        const projectTags = projects.map(proj =>
          '<span class="reports-project-tag" style="background-color: ' +
            (proj.color || '#3498db') + ';">' +
            escapeHtml(proj.name) +
          '</span>'
        ).join('');

        const cardClass = hasReport ? 'reports-card' : 'reports-card reports-card-empty';

        return (
          '<div class="' + cardClass + '" data-person-id="' + escapeHtml(person.id) + '">' +
            '<div class="reports-card-header">' +
              '<div class="reports-card-person">' +
                '<div class="reports-card-name">' + escapeHtml(person.display_name) + '</div>' +
                (person.email ? '<div class="reports-card-email">' + escapeHtml(person.email) + '</div>' : '') +
              '</div>' +
              '<div class="reports-card-actions">' +
                (hasReport
                  ? '<button class="reports-card-action-btn reports-history-btn" data-entry-id="' +
                    escapeHtml(report.id) + '" title="View history">📜</button>'
                  : '') +
                '<button class="reports-card-action-btn reports-edit-btn" data-person-id="' +
                  escapeHtml(person.id) + '" title="' + (hasReport ? 'Edit' : 'Add') + ' report">✏️</button>' +
              '</div>' +
            '</div>' +
            (hasReport
              ? '<div class="reports-card-body">' +
                  '<div class="reports-card-section">' +
                    '<div class="reports-card-label">Did today</div>' +
                    '<div class="reports-card-text">' +
                      (report.did ? escapeHtml(report.did) : '<span style="color: var(--muted);">—</span>') +
                    '</div>' +
                  '</div>' +
                  '<div class="reports-card-section">' +
                    '<div class="reports-card-label">Next</div>' +
                    '<div class="reports-card-text">' +
                      (report.next ? escapeHtml(report.next) : '<span style="color: var(--muted);">—</span>') +
                    '</div>' +
                  '</div>' +
                  '<div class="reports-card-section">' +
                    '<div class="reports-card-label">Blockers / Needs</div>' +
                    '<div class="reports-card-text">' +
                      (report.blockers ? escapeHtml(report.blockers) : '<span style="color: var(--muted);">—</span>') +
                    '</div>' +
                  '</div>' +
                  (projects.length > 0
                    ? '<div class="reports-card-projects">' + projectTags + '</div>'
                    : '') +
                  (report.last_edited_by_name
                    ? '<div class="reports-card-footer">' +
                        'Last edited by ' + escapeHtml(report.last_edited_by_name) +
                        ' · ' + formatDateTime(report.updated_at) +
                      '</div>'
                    : '<div class="reports-card-footer">' +
                        'Updated ' + formatDateTime(report.updated_at) +
                      '</div>') +
                '</div>'
              : '<div class="reports-card-body">' +
                  '<p style="color: var(--muted); text-align: center; padding: 20px;">No report submitted</p>' +
                '</div>') +
          '</div>'
        );
      }

      function attachReportCardListeners() {
        // Edit buttons
        document.querySelectorAll('.reports-edit-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const personId = btn.getAttribute('data-person-id');
            const person = reportsState.people.find(p => p.id === personId);
            if (person) {
              openReportEditorModal(person);
            }
          };
        });

        // History buttons
        document.querySelectorAll('.reports-history-btn').forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const entryId = btn.getAttribute('data-entry-id');
            await openHistoryModal(entryId);
          };
        });
      }

      async function openReportEditorModal(person) {
        // Find existing report for this person and date
        const existingReport = reportsState.reports.find(r => r.person_id === person.id);

        const modal = document.createElement('div');
        modal.className = 'reports-modal';
        modal.style.display = 'flex';
        modal.id = 'reports-editor-modal-temp';

        const did = existingReport?.did || '';
        const next = existingReport?.next || '';
        const blockers = existingReport?.blockers || '';
        const selectedProjects = existingReport?.projects || [];
        const selectedProjectIds = selectedProjects.map(p => p.id);

        modal.innerHTML =
          '<div class="reports-modal-content" style="max-width: 700px;">' +
            '<div class="reports-modal-header">' +
              '<h3>' + escapeHtml(person.display_name) + ' - ' + reportsState.selectedDate + '</h3>' +
              '<button class="btn-icon reports-editor-modal-close">&times;</button>' +
            '</div>' +
            '<div class="reports-modal-body">' +
              '<form id="reports-editor-form">' +
                '<div class="reports-form-group">' +
                  '<label class="reports-form-label">Did today</label>' +
                  '<textarea id="editor-did" class="reports-form-textarea" rows="3">' +
                    escapeHtml(did) +
                  '</textarea>' +
                '</div>' +
                '<div class="reports-form-group">' +
                  '<label class="reports-form-label">Next</label>' +
                  '<textarea id="editor-next" class="reports-form-textarea" rows="3">' +
                    escapeHtml(next) +
                  '</textarea>' +
                '</div>' +
                '<div class="reports-form-group">' +
                  '<label class="reports-form-label">Blockers / Needs</label>' +
                  '<textarea id="editor-blockers" class="reports-form-textarea" rows="3">' +
                    escapeHtml(blockers) +
                  '</textarea>' +
                '</div>' +
                '<div class="reports-form-group">' +
                  '<label class="reports-form-label">Projects</label>' +
                  '<div id="editor-projects" class="reports-projects-checkboxes">' +
                    reportsState.projects.map(proj =>
                      '<label class="reports-checkbox-label">' +
                        '<input type="checkbox" value="' + escapeHtml(proj.id) + '" ' +
                          (selectedProjectIds.includes(proj.id) ? 'checked' : '') + ' />' +
                        '<span>' + escapeHtml(proj.name) + '</span>' +
                      '</label>'
                    ).join('') +
                  '</div>' +
                '</div>' +
                '<div class="reports-form-actions">' +
                  '<button type="submit" class="btn-primary" id="editor-save-btn">Save Report</button>' +
                  '<button type="button" class="btn-secondary reports-editor-cancel">Cancel</button>' +
                '</div>' +
                '<div id="editor-save-indicator" class="reports-save-indicator" style="display:none;">✓ Saved!</div>' +
              '</form>' +
            '</div>' +
          '</div>';

        document.body.appendChild(modal);

        // Event listeners
        const form = modal.querySelector('#reports-editor-form');
        const closeBtn = modal.querySelector('.reports-editor-modal-close');
        const cancelBtn = modal.querySelector('.reports-editor-cancel');

        const closeModal = () => {
          modal.remove();
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => {
          if (e.target === modal) closeModal();
        };

        form.onsubmit = async (e) => {
          e.preventDefault();

          const didVal = document.getElementById('editor-did').value.trim();
          const nextVal = document.getElementById('editor-next').value.trim();
          const blockersVal = document.getElementById('editor-blockers').value.trim();

          const projectCheckboxes = modal.querySelectorAll('#editor-projects input[type="checkbox"]:checked');
          const projectIds = Array.from(projectCheckboxes).map(cb => cb.value);

          // TODO: For future UAM, edited_by_person_id would be the authenticated user
          // For now, we use the person who owns the report as the editor
          const payload = {
            person_id: person.id,
            date: reportsState.selectedDate,
            did: didVal,
            next: nextVal,
            blockers: blockersVal,
            project_ids: projectIds,
            edited_by_person_id: person.id, // TODO: Replace with authenticated user ID when UAM is implemented
          };

          const saveBtn = document.getElementById('editor-save-btn');
          const saveIndicator = document.getElementById('editor-save-indicator');

          try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            console.log('[reports] Saving report:', payload);

            const res = await fetch('/daily-reports/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            console.log('[reports] Save response status:', res.status);

            if (!res.ok) {
              const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errData.error || 'Failed to save report');
            }

            const result = await res.json();
            console.log('[reports] Report saved successfully:', result);

            // Show success indicator
            if (saveIndicator) {
              saveIndicator.style.display = 'block';
              setTimeout(() => {
                if (saveIndicator) saveIndicator.style.display = 'none';
              }, 2000);
            }

            // Reload data
            await loadReportsForDate(reportsState.selectedDate);
            await loadReportsCalendar();

            // Close modal after a brief delay to show the indicator
            setTimeout(() => {
              closeModal();
            }, 1500);
          } catch (err) {
            console.error('[reports] Failed to save report:', err);
            alert('Failed to save report: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Report';
          }
        };
      }

      async function openHistoryModal(entryId) {
        const modal = document.getElementById('reports-history-modal');
        const content = document.getElementById('reports-history-content');

        if (!modal || !content) return;

        modal.style.display = 'flex';
        content.innerHTML = '<p style="color: var(--muted);">Loading history...</p>';

        try {
          const res = await fetch('/daily-reports/revisions/' + encodeURIComponent(entryId));
          if (!res.ok) throw new Error('HTTP ' + res.status);

          const data = await res.json();
          const revisions = data.revisions || [];

          if (revisions.length === 0) {
            content.innerHTML = '<p style="color: var(--muted);">No revision history found</p>';
            return;
          }

          content.innerHTML = revisions.map((rev, idx) => {
            const snapshot = typeof rev.snapshot === 'string' ? JSON.parse(rev.snapshot) : rev.snapshot;
            return (
              '<div class="reports-history-item">' +
                '<div class="reports-history-header">' +
                  '<strong>Revision ' + (revisions.length - idx) + '</strong>' +
                  '<span style="color: var(--muted); font-size: 12px;">' +
                    formatDateTime(rev.edited_at) +
                    (rev.edited_by_name ? ' by ' + escapeHtml(rev.edited_by_name) : '') +
                  '</span>' +
                '</div>' +
                '<div class="reports-history-body">' +
                  '<pre class="reports-history-json">' +
                    escapeHtml(JSON.stringify(snapshot, null, 2)) +
                  '</pre>' +
                '</div>' +
              '</div>'
            );
          }).join('');
        } catch (err) {
          console.error('[reports] Failed to load history:', err);
          content.innerHTML = '<p style="color: var(--danger);">Failed to load history: ' + escapeHtml(err.message) + '</p>';
        }
      }

      async function openPeopleManagementModal() {
        const modal = document.getElementById('reports-people-modal');
        const list = document.getElementById('reports-people-list');

        if (!modal || !list) return;

        modal.style.display = 'flex';
        list.innerHTML = '<p style="color: var(--muted);">Loading...</p>';

        try {
          const res = await fetch('/daily-reports/people?active=false');
          if (!res.ok) throw new Error('HTTP ' + res.status);

          const data = await res.json();
          const allPeople = data.people || [];

          if (allPeople.length === 0) {
            list.innerHTML = '<p style="color: var(--muted);">No people found</p>';
            return;
          }

          list.innerHTML = allPeople.map(person =>
            '<div class="reports-person-mgmt-item">' +
              '<div>' +
                '<div class="reports-person-name">' + escapeHtml(person.display_name) + '</div>' +
                '<div style="font-size: 11px; color: var(--muted);">' +
                  (person.email ? escapeHtml(person.email) : '—') +
                '</div>' +
              '</div>' +
              '<div class="reports-person-actions">' +
                '<span class="reports-person-status-badge" style="color: ' +
                  (person.is_active ? 'var(--success)' : 'var(--danger)') + ';">' +
                  (person.is_active ? 'Active' : 'Inactive') +
                '</span>' +
                '<button class="btn-icon reports-edit-person-btn" data-person-id="' +
                  escapeHtml(person.id) + '" title="Edit">✏️</button>' +
                (person.is_active
                  ? '<button class="btn-icon reports-deactivate-person-btn" data-person-id="' +
                    escapeHtml(person.id) + '" title="Deactivate">🗑️</button>'
                  : '') +
              '</div>' +
            '</div>'
          ).join('');

          // Attach event listeners
          list.querySelectorAll('.reports-edit-person-btn').forEach(btn => {
            btn.onclick = () => {
              const personId = btn.getAttribute('data-person-id');
              const person = allPeople.find(p => p.id === personId);
              if (person) {
                openPersonFormModal(person);
              }
            };
          });

          list.querySelectorAll('.reports-deactivate-person-btn').forEach(btn => {
            btn.onclick = async () => {
              const personId = btn.getAttribute('data-person-id');
              if (confirm('Are you sure you want to deactivate this person?')) {
                await deactivatePerson(personId);
              }
            };
          });
        } catch (err) {
          console.error('[reports] Failed to load people:', err);
          list.innerHTML = '<p style="color: var(--danger);">Failed to load people</p>';
        }
      }

      function openPersonFormModal(person = null) {
        const modal = document.getElementById('reports-person-form-modal');
        const title = document.getElementById('reports-person-form-title');
        const form = document.getElementById('reports-person-form');

        if (!modal || !title || !form) return;

        const isEdit = !!person;
        title.textContent = isEdit ? 'Edit Person' : 'Add Person';

        document.getElementById('person-form-id').value = person?.id || '';
        document.getElementById('person-form-name').value = person?.display_name || '';
        document.getElementById('person-form-email').value = person?.email || '';
        document.getElementById('person-form-phone').value = person?.phone || '';

        modal.style.display = 'flex';
      }

      async function submitPersonForm() {
        const personId = document.getElementById('person-form-id').value;
        const displayName = document.getElementById('person-form-name').value.trim();
        const email = document.getElementById('person-form-email').value.trim();
        const phone = document.getElementById('person-form-phone').value.trim();

        if (!displayName) {
          alert('Display name is required');
          return;
        }

        const payload = {
          display_name: displayName,
          email: email || null,
          phone: phone || null,
        };

        try {
          let res;
          if (personId) {
            // Update existing person
            res = await fetch('/daily-reports/people/' + encodeURIComponent(personId), {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } else {
            // Create new person
            res = await fetch('/daily-reports/people', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to save person');
          }

          document.getElementById('reports-person-form-modal').style.display = 'none';
          await loadReportsPeople();
          await openPeopleManagementModal();

          if (reportsState.selectedDate) {
            await loadReportsForDate(reportsState.selectedDate);
          }
        } catch (err) {
          console.error('[reports] Failed to save person:', err);
          alert('Failed to save person: ' + err.message);
        }
      }

      async function deactivatePerson(personId) {
        try {
          const res = await fetch('/daily-reports/people/' + encodeURIComponent(personId), {
            method: 'DELETE'
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to deactivate person');
          }

          await loadReportsPeople();
          await openPeopleManagementModal();

          if (reportsState.selectedDate) {
            await loadReportsForDate(reportsState.selectedDate);
          }
        } catch (err) {
          console.error('[reports] Failed to deactivate person:', err);
          alert('Failed to deactivate person: ' + err.message);
        }
      }

      async function openProjectsManagementModal() {
        const modal = document.getElementById('reports-projects-modal');
        const list = document.getElementById('reports-projects-list');

        if (!modal || !list) return;

        modal.style.display = 'flex';
        list.innerHTML = '<p style="color: var(--muted);">Loading...</p>';

        try {
          const res = await fetch('/daily-reports/projects?active=false');
          if (!res.ok) throw new Error('HTTP ' + res.status);

          const data = await res.json();
          const allProjects = data.projects || [];

          if (allProjects.length === 0) {
            list.innerHTML = '<p style="color: var(--muted);">No projects found</p>';
            return;
          }

          list.innerHTML = allProjects.map(proj =>
            '<div class="reports-project-mgmt-item">' +
              '<div style="display: flex; align-items: center; gap: 8px;">' +
                (proj.color
                  ? '<div class="reports-project-color-box" style="background-color: ' +
                    escapeHtml(proj.color) + ';"></div>'
                  : '') +
                '<div class="reports-project-name">' + escapeHtml(proj.name) + '</div>' +
              '</div>' +
              '<div class="reports-project-actions">' +
                '<span class="reports-project-status-badge" style="color: ' +
                  (proj.is_active ? 'var(--success)' : 'var(--danger)') + ';">' +
                  (proj.is_active ? 'Active' : 'Inactive') +
                '</span>' +
              '</div>' +
            '</div>'
          ).join('');
        } catch (err) {
          console.error('[reports] Failed to load projects:', err);
          list.innerHTML = '<p style="color: var(--danger);">Failed to load projects</p>';
        }
      }

      function openProjectFormModal(project = null) {
        const modal = document.getElementById('reports-project-form-modal');
        const title = document.getElementById('reports-project-form-title');
        const form = document.getElementById('reports-project-form');

        if (!modal || !title || !form) return;

        const isEdit = !!project;
        title.textContent = isEdit ? 'Edit Project' : 'Add Project';

        document.getElementById('project-form-id').value = project?.id || '';
        document.getElementById('project-form-name').value = project?.name || '';
        document.getElementById('project-form-color').value = project?.color || '';

        modal.style.display = 'flex';
      }

      async function submitProjectForm() {
        const projectId = document.getElementById('project-form-id').value;
        const name = document.getElementById('project-form-name').value.trim();
        const color = document.getElementById('project-form-color').value.trim();

        if (!name) {
          alert('Project name is required');
          return;
        }

        const payload = {
          name: name,
          color: color || null,
        };

        try {
          const res = await fetch('/daily-reports/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to save project');
          }

          document.getElementById('reports-project-form-modal').style.display = 'none';
          await loadReportsProjects();
          await openProjectsManagementModal();
        } catch (err) {
          console.error('[reports] Failed to save project:', err);
          alert('Failed to save project: ' + err.message);
        }
      }

      // ==================== END DAILY REPORTS ====================

      // init
      setView(currentView);
      loadStores();
    })();
  </script>
</body>
</html>
  `;
}

module.exports = dashboardPage;
