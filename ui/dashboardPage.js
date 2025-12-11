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
      justify-content: center;
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
          <button class="nav-item" data-view="orders">
            <span>Orders</span>
          </button>
          <button class="nav-item" data-view="customers">
            <span>Customers</span>
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
        </header>

        <!-- HOME VIEW -->
        <section id="view-home" class="view active">
          <section class="grid-top">
            <article class="stat-card">
              <div class="stat-label">Produse active</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-active-home">–</div>
                <div class="stat-chip">Catalog</div>
              </div>
              <p class="stat-desc">
                Total produse active în Shopify (conform Stores + API).
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Produse draft</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-draft-home">–</div>
                <div class="stat-chip">Pregătite</div>
              </div>
              <p class="stat-desc">
                Produse pregătite pentru listare în magazine.
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Comenzi azi</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-today-home">–</div>
                <div class="stat-chip">Azi</div>
              </div>
              <p class="stat-desc">
                Comenzi înregistrate în ultimele 24h pentru contextul curent.
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Comenzi în acest an</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-year-home">–</div>
                <div class="stat-chip">YTD</div>
              </div>
              <p class="stat-desc">
                Total comenzi cumulate în anul curent (context curent).
              </p>
            </article>
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
                  <span>From</span>
                  <input id="orders-from" type="date" />
                </label>
                <label class="filter-chip">
                  <span>To</span>
                  <input id="orders-to" type="date" />
                </label>
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

      const statActiveHome = document.getElementById('stat-active-home');
      const statDraftHome = document.getElementById('stat-draft-home');
      const statTodayHome = document.getElementById('stat-today-home');
      const statYearHome = document.getElementById('stat-year-home');
      const storesCountHome = document.getElementById('stores-count-home');
      const homeTableWrapper = document.getElementById('home-table-wrapper');
      const homeEmpty = document.getElementById('home-empty');

      const storesCountMy = document.getElementById('stores-count-mystores');
      const myGridWrapper = document.getElementById('mystores-grid-wrapper');
      const myEmpty = document.getElementById('mystores-empty');
      const execHeader = document.getElementById('exec-store-header');
      const syncContextLabel = document.getElementById('sync-context-label');
      const ordersCountLabel = document.getElementById('orders-count-label');
      const ordersSearchInput = document.getElementById('orders-search');
      const ordersStatusSelect = document.getElementById('orders-status');
      const ordersFromInput = document.getElementById('orders-from');
      const ordersToInput = document.getElementById('orders-to');
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
          from: todayStr,
          to: todayStr,
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
          from: null,
          to: null,
          limit: ORDER_PAGE_SIZE,
        },
        error: '',
        page: 1,
        total: 0,
        hasNext: false,
        hasPrev: false,
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

      if (ordersFromInput && !ordersFromInput.value) ordersFromInput.value = todayStr;
      if (ordersToInput && !ordersToInput.value) ordersToInput.value = todayStr;

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
        const total = ordersState.total || 0;
        const sameDay =
          ordersState.filters.from === todayStr && ordersState.filters.to === todayStr;
        const rangeLabel = sameDay ? 'orders today' : 'orders in range';
        ordersCountLabel.textContent = formatNumber(total) + ' ' + rangeLabel;
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
            return (
              '<tr data-id="' +
              order.id +
              '" data-store="' +
              escapeHtml(order.store_id) +
              '">' +
                '<td>' +
                  '<div class="order-id">' +
                    escapeHtml(order.name || ('#' + order.id)) +
                  '</div>' +
                  '<div class="order-sub">#' + escapeHtml(String(order.id)) + '</div>' +
                '</td>' +
                '<td>' + formatDateTime(order.created_at) + '</td>' +
                '<td class="store-name-cell">' +
                  escapeHtml(order.store_name || order.store_id || 'Store') +
                '</td>' +
                '<td>' +
                  '<div class="order-customer">' +
                    '<span>' + escapeHtml(order.customer_name || 'Guest') + '</span>' +
                    (order.customer_email
                      ? '<span class="order-sub">' + escapeHtml(order.customer_email) + '</span>'
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
            const orderId = tr.getAttribute('data-id');
            const storeId = tr.getAttribute('data-store');
            openOrderDrawer(orderId, storeId);
          });
        });

        renderPagination();
        setupSortingUI();
      }

      function setupSortingUI() {
        const table = document.querySelector('.orders-table');
        if (!table) return;
        const headers = table.querySelectorAll('th');
        const keys = ['name', 'created_at', 'store_name', 'customer_name', 'items_count', 'total_price', 'financial_status'];
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
              ordersState.page = 1;
              loadOrders();
            });
            th._sortingBound = true;
          }
        });
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
            const fullName =
              (c.first_name || c.last_name
                ? (c.first_name || '') + ' ' + (c.last_name || '')
                : c.name) || 'Customer';
            return (
              '<tr data-store="' +
                escapeHtml(c.store_id) +
                '" data-store-id="' +
                escapeHtml(c.store_id) +
                '" data-customer-id="' +
                escapeHtml(c.customer_id || c.email || '') +
              '">' +
                '<td><button class="link-inline customer-open">' +
                  escapeHtml(fullName) +
                '</button></td>' +
                '<td>' + escapeHtml(c.email || '—') + '</td>' +
                '<td>' + formatNumber(c.total_orders || 0) + '</td>' +
                '<td class="numeric">' + formatMoney(c.total_spent || 0, 'RON') + '</td>' +
                '<td>' + (c.last_order_date ? formatDateTime(c.last_order_date) : '—') + '</td>' +
                '<td class="store-name-cell">' + escapeHtml(c.store_name || c.store_id || '') + '</td>' +
                '<td>' + (c.created_at ? formatDateTime(c.created_at) : (c.first_order_date ? formatDateTime(c.first_order_date) : '—')) + '</td>' +
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
      }

      function renderCustomersPagination() {
        if (!customersPagination) return;
        const totalPages = Math.max(
          1,
          Math.ceil(
            (customersState.total || customersState.items.length || 0) /
              (customersState.filters.limit || ORDER_PAGE_SIZE)
          )
        );
        const current = Math.min(customersState.page, totalPages);
        const prevDisabled = current <= 1;
        const nextDisabled = current >= totalPages;

        function pageButton(page, label, isActive = false, disabled = false) {
          return (
            '<button class="' +
            'pagination-page' +
            (isActive ? ' active' : '') +
            '" data-page="' +
            page +
            '" ' +
            (disabled ? 'disabled' : '') +
            '>' +
            label +
            '</button>'
          );
        }

        const pages = [];
        if (totalPages <= 7) {
          for (let i = 1; i <= totalPages; i++) pages.push(pageButton(i, i, i === current));
        } else {
          const addPage = (p) => pages.push(pageButton(p, p, p === current));
          addPage(1);
          addPage(2);
          if (current > 4) pages.push('<span class="pagination-ellipsis">…</span>');
          const start = Math.max(3, current - 1);
          const end = Math.min(totalPages - 2, current + 1);
          for (let i = start; i <= end; i++) addPage(i);
          if (current < totalPages - 3) pages.push('<span class="pagination-ellipsis">…</span>');
          addPage(totalPages - 1);
          addPage(totalPages);
        }

        customersPagination.innerHTML =
          '<button class="pagination-btn" id="customers-prev" ' +
          (prevDisabled ? 'disabled' : '') +
          '>Prev</button>' +
          pages.join('') +
          '<button class="pagination-btn" id="customers-next" ' +
          (nextDisabled ? 'disabled' : '') +
          '>Next</button>';

        const prevBtn = document.getElementById('customers-prev');
        const nextBtn = document.getElementById('customers-next');
        if (prevBtn) {
          prevBtn.addEventListener('click', () => {
            if (prevDisabled) return;
            customersState.page = Math.max(1, customersState.page - 1);
            loadCustomers();
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            if (nextDisabled) return;
            customersState.page = Math.min(totalPages, customersState.page + 1);
            loadCustomers();
          });
        }
        customersPagination.querySelectorAll('.pagination-page').forEach((btn) => {
          btn.addEventListener('click', () => {
            const page = parseInt(btn.getAttribute('data-page'), 10);
            if (Number.isNaN(page) || page === current) return;
            customersState.page = page;
            loadCustomers();
          });
        });
      }

      function renderPagination() {
        if (!ordersPagination) return;
        const totalPages = Math.max(
          1,
          Math.ceil((ordersState.total || ordersState.items.length || 0) / ordersState.filters.limit)
        );
        const current = Math.min(ordersState.page, totalPages);

        const prevDisabled = current <= 1;
        const nextDisabled = current >= totalPages;

        function pageButton(page, label, isActive = false, disabled = false) {
          return (
            '<button class="' +
            'pagination-page' +
            (isActive ? ' active' : '') +
            '" data-page="' +
            page +
            '" ' +
            (disabled ? 'disabled' : '') +
            '>' +
            label +
            '</button>'
          );
        }

        const pages = [];
        if (totalPages <= 7) {
          for (let i = 1; i <= totalPages; i++) {
            pages.push(pageButton(i, i, i === current));
          }
        } else {
          const addPage = (p) => pages.push(pageButton(p, p, p === current));
          addPage(1);
          addPage(2);
          if (current > 4) pages.push('<span class="pagination-ellipsis">…</span>');
          const start = Math.max(3, current - 1);
          const end = Math.min(totalPages - 2, current + 1);
          for (let i = start; i <= end; i++) {
            addPage(i);
          }
          if (current < totalPages - 3) pages.push('<span class="pagination-ellipsis">…</span>');
          addPage(totalPages - 1);
          addPage(totalPages);
        }

        ordersPagination.innerHTML =
          '<button class="pagination-btn" id="orders-prev" ' +
          (prevDisabled ? 'disabled' : '') +
          '>Prev</button>' +
          pages.join('') +
          '<button class="pagination-btn" id="orders-next" ' +
          (nextDisabled ? 'disabled' : '') +
          '>Next</button>';

        const prevBtn = document.getElementById('orders-prev');
        const nextBtn = document.getElementById('orders-next');
        if (prevBtn) {
          prevBtn.addEventListener('click', () => {
            if (prevDisabled) return;
            ordersState.page = Math.max(1, ordersState.page - 1);
            loadOrders();
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            if (nextDisabled) return;
            ordersState.page = Math.min(totalPages, ordersState.page + 1);
            loadOrders();
          });
        }
        ordersPagination.querySelectorAll('.pagination-page').forEach((btn) => {
          btn.addEventListener('click', () => {
            const page = parseInt(btn.getAttribute('data-page'), 10);
            if (Number.isNaN(page) || page === current) return;
            ordersState.page = page;
            loadOrders();
          });
        });
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
        const statusHtml = [
          detail && detail.financial_status ? statusPill(detail.financial_status) : '',
          detail && detail.fulfillment_status ? statusPill(detail.fulfillment_status) : '',
        ]
          .filter(Boolean)
          .join(' ');
        const shippingLine =
          detail && detail.shipping_lines && detail.shipping_lines[0]
            ? detail.shipping_lines[0]
            : null;
        const shippingText = shippingLine
          ? (shippingLine.title || 'Shipping') +
            ' · ' +
            formatMoney(shippingLine.price, detail.currency)
          : 'No shipping line';
        const gateway =
          detail &&
          Array.isArray(detail.payment_gateway_names) &&
          detail.payment_gateway_names.length
            ? detail.payment_gateway_names.join(', ')
            : '—';

        const itemsHtml =
          detail && detail.line_items && detail.line_items.length
            ? detail.line_items
                .map((li) => {
                  const total = li.total || li.price * (li.quantity || 0);
                  const safeImg = li.image_src
                    ? String(li.image_src).replace(/"/g, '%22').replace(/'/g, '%27')
                    : '';
                  const thumb =
                    '<div class="line-thumb"' +
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
                    '</div>' +
                  '</div>' +
                  '<div class="line-item-right">' +
                    '<div class="pill">' + (li.quantity || 0) + ' pcs</div>' +
                    '<div class="order-sub">' + formatMoney(total, detail.currency) + '</div>' +
                  '</div>' +
                '</div>'
              );
                })
                .join('')
            : '<div class="order-sub">No items.</div>';

        const customerBlock =
          detail && detail.customer
            ? '<div>' +
                '<button class="link-inline" data-action="view-customer">' +
                  (escapeHtml(
                    (detail.customer.first_name || '') + ' ' + (detail.customer.last_name || '')
                  ).trim() ||
                    escapeHtml(detail.customer.email || 'Customer')) +
                '</button>' +
                (detail.customer.email
                  ? '<div class="order-sub">' + escapeHtml(detail.customer.email) + '</div>'
                  : '') +
                (detail.customer.phone
                  ? '<div class="order-sub">' + escapeHtml(detail.customer.phone) + '</div>'
                  : '') +
              '</div>'
            : '<div class="order-sub">Guest checkout</div>';

        const orderUrl = buildShopifyUrl('order', detail);

        const bodyHtml = detail && detail.error
          ? '<div class="orders-empty-inline">Nu am putut încărca comanda.<br />' +
            escapeHtml(detail.error) +
            '</div>'
          : detail && detail._loading
          ? '<div class="orders-empty-inline">Se încarcă detaliile comenzii...</div>'
          : '<div class="drawer-section">' +
              '<div class="kv-row"><span>Store</span><strong>' +
                escapeHtml(detail.store_name || detail.store_id || '') +
              '</strong></div>' +
              '<div class="kv-row"><span>Placed</span><strong>' +
                formatDateTime(detail.created_at) +
              '</strong></div>' +
              '<div class="kv-row"><span>Total</span><strong>' +
                formatMoney(detail.total_price, detail.currency) +
              '</strong></div>' +
              (statusHtml
                ? '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">' +
                  statusHtml +
                  '</div>'
                : '') +
            '</div>' +
            '<div class="drawer-section">' +
              '<div class="section-heading">Customer</div>' +
              customerBlock +
              '<div class="order-sub" style="margin-top:6px;">' +
                escapeHtml(formatAddress(detail.shipping_address || detail.billing_address)) +
              '</div>' +
            '</div>' +
            '<div class="drawer-section">' +
              '<div class="section-heading">Items</div>' +
              itemsHtml +
            '</div>' +
            '<div class="drawer-section">' +
              '<div class="section-heading">Shipping & Payment</div>' +
              '<div class="kv-row"><span>Shipping</span><strong>' +
                escapeHtml(shippingText) +
              '</strong></div>' +
              '<div class="kv-row"><span>Payment</span><strong>' +
                escapeHtml(gateway) +
              '</strong></div>' +
            '</div>';

        return {
          title: detail && detail.name ? detail.name : 'Order',
          subtitle:
            (detail && (detail.store_name || detail.store_id || '')) +
            (detail && detail.created_at ? ' · ' + formatDateTime(detail.created_at) : ''),
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
        const detail = (data && data.customer) || {};
        const orders = (data && data.orders) || [];
        const orderRows = orders
          .map((o) => {
            return (
              '<tr>' +
                '<td><button class="link-inline customer-order-link" data-order-id="' +
                  escapeHtml(o.id) +
                  '" data-store-id="' +
                  escapeHtml(o.store_id) +
                '">#' +
                  escapeHtml(o.name || o.id) +
                '</button></td>' +
                '<td>' + formatDateTime(o.created_at) + '</td>' +
                '<td class="store-name-cell">' + escapeHtml(o.store_name || o.store_id || '') + '</td>' +
                '<td class="numeric">' + formatMoney(o.total_price, o.currency) + '</td>' +
                '<td>' +
                  (o.financial_status ? statusPill(o.financial_status) : '<span class="muted">—</span>') +
                '</td>' +
              '</tr>'
            );
          })
          .join('');
        const tableHtml =
          '<div class="drawer-section">' +
            '<div class="section-heading">Orders (context)</div>' +
            (orders.length
              ? '<table class="orders-table" style="width:100%;">' +
                  '<thead><tr><th>Order</th><th>Date</th><th>Store</th><th class="numeric">Total</th><th>Status</th></tr></thead>' +
                  '<tbody>' + orderRows + '</tbody>' +
                '</table>'
              : '<div class="order-sub">Nu există comenzi în context.</div>') +
          '</div>';

        const summary =
          '<div class="drawer-section">' +
            '<div class="section-heading">Contact</div>' +
            '<div class="kv-row"><span>Nume</span><strong>' +
              escapeHtml(
                (detail.first_name || '') + ' ' + (detail.last_name || '')
              ) +
            '</strong></div>' +
            '<div class="kv-row"><span>Email</span><strong>' +
              escapeHtml(detail.email || '—') +
            '</strong></div>' +
            '<div class="kv-row"><span>Telefon</span><strong>' +
              escapeHtml(detail.phone || '—') +
            '</strong></div>' +
            '<div class="kv-row"><span>Adresă</span><strong>' +
              escapeHtml(formatAddress(detail.default_address)) +
            '</strong></div>' +
            '<div class="kv-row"><span>Total orders</span><strong>' +
              formatNumber(detail.total_orders || 0) +
            '</strong></div>' +
            '<div class="kv-row"><span>Total spent</span><strong>' +
              formatMoney(detail.total_spent || 0, 'RON') +
            '</strong></div>' +
            '<div class="kv-row"><span>Last order</span><strong>' +
              (detail.last_order_date ? formatDateTime(detail.last_order_date) : '—') +
            '</strong></div>' +
          '</div>';

        const customerUrl = buildShopifyUrl('customer', { customer: { id: detail.customer_id }, shopify_domain: detail.shopify_domain });

        return {
          title:
            (detail.first_name || detail.last_name
              ? (detail.first_name || '') + ' ' + (detail.last_name || '')
              : 'Customer'),
          subtitle: escapeHtml(detail.email || detail.store_name || ''),
          bodyHtml: summary + tableHtml,
          shopifyUrl: customerUrl,
        };
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

        if (!drawerState.open || !drawerState.order) {
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
          { key: 'order', label: 'Comanda', enabled: true },
          { key: 'customer', label: 'Client', enabled: hasCustomer },
          { key: 'product', label: 'Produs', enabled: !!hasProducts },
        ];

        const content =
          drawerState.mode === 'customer'
            ? buildCustomerContent(detail)
            : drawerState.mode === 'product'
            ? buildProductContent(drawerState.product, detail)
            : drawerState.mode === 'customer-full'
            ? buildCustomerFullContent(drawerState.customer || {})
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

        const panelHtml =
          drawerState.mode === 'customer-full'
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

        if (drawerState.mode !== 'customer-full') {
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
        if (!orderId || !storeId) return;
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
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          const detail = data.order;
          if (!detail) throw new Error('Order missing in response');
          orderDetailsCache.set(cacheKey, detail);
          drawerState.order = detail;
          renderDrawer();
        } catch (err) {
          console.error('Error loading order', err);
          drawerState.order = {
            id: orderId,
            store_id: storeId,
            name: 'Order #' + orderId,
            _loading: false,
            line_items: [],
            store_name: '',
            shopify_domain: '',
            created_at: '',
            customer: null,
            currency: '',
            total_price: 0,
            error: err.message || String(err),
          };
          renderDrawer();
        }
      }

      async function openCustomerDetail(storeId, customerId) {
        if (!storeId || !customerId) return;
        drawerState.open = true;
        drawerState.mode = 'customer-full';
        drawerState.customer = {
          customer: {
            customer_id: customerId,
            store_id: storeId,
            first_name: '',
            last_name: '',
            email: '',
            total_orders: 0,
            total_spent: 0,
          },
          orders: [],
          _loading: true,
        };
        renderDrawer();
        try {
          const qs = new URLSearchParams();
          if (customersState.filters.from) qs.set('from', customersState.filters.from);
          if (customersState.filters.to) qs.set('to', customersState.filters.to);
          const res = await fetch(
            '/customers/' + encodeURIComponent(storeId) + '/' + encodeURIComponent(customerId) + '?' + qs.toString()
          );
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          drawerState.customer = data;
        } catch (err) {
          console.error('Customer detail error', err);
          drawerState.customer = {
            customer: {
              first_name: 'Customer',
              last_name: '',
              email: '',
              total_orders: 0,
              total_spent: 0,
              store_name: storeId,
            },
            orders: [],
            error: err.message || String(err),
          };
        } finally {
          drawerState.mode = 'customer-full';
          renderDrawer();
        }
      }

      async function loadOrders() {
        ordersState.loading = true;
        ordersState.error = '';
        renderOrdersTable();

        const qs = new URLSearchParams();
        qs.set('store_id', selectedStoreId || 'all');
        qs.set('limit', ORDER_PAGE_SIZE);
        if (ordersState.filters.q) qs.set('q', ordersState.filters.q);
        if (ordersState.filters.status) qs.set('status', ordersState.filters.status);
        if (ordersState.filters.from) qs.set('from', ordersState.filters.from);
        if (ordersState.filters.to) qs.set('to', ordersState.filters.to);

        // Use Shopify cursor pagination if available
        if (ordersState.nextPageInfo) {
          qs.set('page_info', ordersState.nextPageInfo);
        }

        try {
          const res = await fetch('/orders?' + qs.toString());
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          ordersState.items = Array.isArray(data.orders) ? data.orders : [];
          ordersState.page = data.page || ordersState.page;
          ordersState.total = data.total != null ? data.total : ordersState.items.length;
          ordersState.filters.limit = data.limit || ORDER_PAGE_SIZE;

          // Update pagination cursors
          ordersState.nextPageInfo = data.nextPageInfo || null;
          ordersState.prevPageInfo = data.prevPageInfo || null;
          ordersState.hasNext = data.hasNext || !!data.nextPageInfo;
          ordersState.hasPrev = data.hasPrev || false; // Shopify doesn't support backward cursor pagination easily

          console.log('[orders] Loaded', ordersState.items.length, 'orders, hasNext:', ordersState.hasNext);
        } catch (err) {
          console.error('Error /orders', err);
          ordersState.items = [];
          ordersState.error = err.message || String(err);
          ordersState.total = 0;
          ordersState.hasNext = false;
          ordersState.hasPrev = false;
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
        qs.set('limit', customersState.filters.limit || ORDER_PAGE_SIZE);
        qs.set('page', customersState.page);
        if (customersState.filters.q) qs.set('q', customersState.filters.q);
        if (customersState.filters.from) qs.set('from', customersState.filters.from);
        if (customersState.filters.to) qs.set('to', customersState.filters.to);

        try {
          const res = await fetch('/customers?' + qs.toString());
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          customersState.items = Array.isArray(data.customers) ? data.customers : [];
          customersState.page = data.page || customersState.page;
          customersState.total =
            data.total != null ? data.total : customersState.items.length;
          customersState.filters.limit = data.limit || ORDER_PAGE_SIZE;
          const totalPages = Math.max(
            1,
            Math.ceil(
              (customersState.total || customersState.items.length || 0) /
                customersState.filters.limit
            )
          );
          customersState.hasNext = customersState.page < totalPages;
          customersState.hasPrev = customersState.page > 1;
        } catch (err) {
          console.error('Error /customers', err);
          customersState.items = [];
          customersState.error = err.message || String(err);
          customersState.total = 0;
          customersState.hasNext = false;
          customersState.hasPrev = customersState.page > 1;
        } finally {
          customersState.loading = false;
          customersDirty = false;
          renderCustomersTable();
        }
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

          // totals for home
          const totals = visibleStores.reduce(
            (acc, s) => {
              acc.active += s.active_products || 0;
              acc.draft += s.draft_products || 0;
              acc.today += s.today_orders || 0;
              acc.year += s.year_orders || 0;
              return acc;
            },
            { active: 0, draft: 0, today: 0, year: 0 }
          );

          statActiveHome.textContent = formatNumber(totals.active);
          statDraftHome.textContent = formatNumber(totals.draft);
          statTodayHome.textContent = formatNumber(totals.today);
          statYearHome.textContent = formatNumber(totals.year);

          storesCountHome.textContent =
            visibleStores.length + (visibleStores.length === 1 ? ' store' : ' stores');
          storesCountMy.textContent = storesCountHome.textContent;

          buildHomeTable(visibleStores);
          renderMyStoresCards(visibleStores);

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
            ordersState.page = 1;
            ordersState.nextPageInfo = null;  // Reset pagination cursor when filters change
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
          ordersState.page = 1;
          ordersState.nextPageInfo = null;  // Reset pagination cursor when filters change
          loadOrders();
        });
      }

      if (ordersFromInput) {
        ordersFromInput.addEventListener('change', () => {
          ordersState.filters.from = ordersFromInput.value;
          ordersState.page = 1;
          ordersState.nextPageInfo = null;  // Reset pagination cursor when filters change
          loadOrders();
        });
      }

      if (ordersToInput) {
        ordersToInput.addEventListener('change', () => {
          ordersState.filters.to = ordersToInput.value;
          ordersState.page = 1;
          ordersState.nextPageInfo = null;  // Reset pagination cursor when filters change
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
        ordersState.page = 1;
        ordersState.nextPageInfo = null;  // Reset pagination cursor when store context changes
        customersState.page = 1;
        closeAllPanels();
        loadStores(previousStoreId);
      });

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
