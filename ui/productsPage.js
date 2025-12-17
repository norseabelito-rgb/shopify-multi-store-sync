// ui/productsPage.js
// Products Module UI
// Table view with filters, detail drawer, Excel import/export, bulk push actions

function productsPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Produse Master - Multi-Store Hub</title>
  <style>
    :root {
      --bg: #020617;
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
      --warning: #fbbf24;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.2), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(45, 212, 191, 0.12), transparent 55%),
        #020617;
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    .page-shell {
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px;
      min-height: 100vh;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .page-subtitle {
      font-size: 13px;
      color: var(--muted);
      margin: 4px 0 0;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    /* Buttons */
    .btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .btn-primary {
      background: linear-gradient(135deg, #4f8cff, #6366f1);
      border-color: transparent;
      color: white;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
    }

    .btn-danger {
      border-color: rgba(251, 113, 133, 0.5);
      color: var(--danger);
    }

    .btn-danger:hover {
      background: rgba(251, 113, 133, 0.15);
    }

    .btn-success {
      border-color: rgba(34, 197, 94, 0.5);
      color: var(--success);
    }

    .btn-success:hover {
      background: rgba(34, 197, 94, 0.15);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      max-width: 400px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
    }

    .search-input::placeholder {
      color: var(--muted);
    }

    .filter-select {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
      min-width: 140px;
    }

    .bulk-actions {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      background: var(--accent-soft);
      border: 1px solid rgba(79, 140, 255, 0.3);
      margin-left: auto;
    }

    .bulk-actions.visible {
      display: flex;
    }

    .bulk-count {
      font-size: 12px;
      color: var(--accent);
      font-weight: 500;
      white-space: nowrap;
    }

    .select-all-banner {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(79, 140, 255, 0.15), rgba(99, 102, 241, 0.1));
      border: 1px solid rgba(79, 140, 255, 0.25);
      font-size: 13px;
    }

    .select-all-banner.visible {
      display: flex;
    }

    .select-all-banner .banner-text {
      color: var(--text);
    }

    .select-all-banner .banner-link {
      color: var(--accent);
      cursor: pointer;
      font-weight: 500;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .select-all-banner .banner-link:hover {
      color: #6fa3ff;
    }

    .select-all-banner .banner-check {
      color: var(--success);
      font-weight: 500;
    }

    /* Store Tabs in Drawer */
    .store-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      margin: 16px 0;
      gap: 4px;
      overflow-x: auto;
    }

    .store-tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .store-tab:hover {
      color: var(--text);
      background: rgba(79, 140, 255, 0.1);
    }

    .store-tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    .store-tab-content {
      display: none;
    }

    .store-tab-content.active {
      display: block;
    }

    /* Override indicator */
    .field-override-indicator {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-left: 8px;
      text-transform: uppercase;
    }

    .field-override-indicator.inherited {
      background: rgba(148, 163, 184, 0.2);
      color: var(--muted);
    }

    .field-override-indicator.overridden {
      background: rgba(79, 140, 255, 0.2);
      color: var(--accent);
    }

    /* Rich text preview */
    .description-preview {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      padding: 12px;
      max-height: 200px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.5;
    }

    .description-preview p { margin: 0 0 8px; }
    .description-preview ul, .description-preview ol { margin: 8px 0; padding-left: 20px; }
    .description-preview li { margin: 4px 0; }
    .description-preview strong, .description-preview b { font-weight: 600; }
    .description-preview em, .description-preview i { font-style: italic; }

    /* Loading skeleton */
    .skeleton {
      background: linear-gradient(90deg, rgba(148, 163, 184, 0.1) 25%, rgba(148, 163, 184, 0.2) 50%, rgba(148, 163, 184, 0.1) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton-text {
      height: 16px;
      margin-bottom: 8px;
    }

    .skeleton-input {
      height: 40px;
      margin-bottom: 16px;
    }

    /* Table Container */
    .table-container {
      background: var(--panel);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .table-scroll {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-soft);
    }

    th {
      background: rgba(15, 23, 42, 0.8);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      position: sticky;
      top: 0;
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      background: rgba(15, 23, 42, 0.95);
      color: var(--text);
    }

    th.sortable::after {
      content: '';
      margin-left: 4px;
    }

    th.sort-asc::after {
      content: ' \\2191';
    }

    th.sort-desc::after {
      content: ' \\2193';
    }

    tr:hover {
      background: rgba(79, 140, 255, 0.05);
    }

    td.sku-cell {
      font-family: monospace;
      font-size: 12px;
      color: var(--accent);
    }

    td.price-cell {
      text-align: right;
      font-family: monospace;
    }

    td.sync-cell {
      white-space: nowrap;
    }

    .checkbox-cell {
      width: 40px;
      text-align: center;
    }

    .checkbox-cell input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .actions-cell {
      width: 80px;
      text-align: center;
    }

    .row-action {
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 11px;
      cursor: pointer;
    }

    .row-action:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* Status Badges */
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-not-pushed {
      background: rgba(148, 163, 184, 0.2);
      color: var(--muted);
    }

    .status-draft {
      background: rgba(251, 191, 36, 0.2);
      color: var(--warning);
    }

    .status-active {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
    }

    .status-failed {
      background: rgba(251, 113, 133, 0.2);
      color: var(--danger);
    }

    /* Pagination */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.6);
      border-top: 1px solid var(--border-soft);
    }

    .pagination-info {
      font-size: 12px;
      color: var(--muted);
    }

    .pagination-buttons {
      display: flex;
      gap: 6px;
    }

    .page-btn {
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 12px;
      cursor: pointer;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

    /* Drawer */
    .drawer-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.8);
      z-index: 100;
    }

    .drawer-overlay.open {
      display: block;
    }

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 600px;
      max-width: 90vw;
      height: 100vh;
      background: var(--panel);
      border-left: 1px solid var(--border);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      z-index: 101;
      display: flex;
      flex-direction: column;
    }

    .drawer.open {
      transform: translateX(0);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }

    .drawer-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .drawer-close {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drawer-close:hover {
      border-color: var(--danger);
      color: var(--danger);
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .drawer-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    /* Form Fields */
    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.8);
      color: var(--text);
      font-size: 13px;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    textarea.form-input {
      min-height: 100px;
      resize: vertical;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-hint {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }

    /* Section Headers in Drawer */
    .section-header {
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 24px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-soft);
    }

    .section-header:first-child {
      margin-top: 0;
    }

    /* Store Overrides */
    .store-override-card {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      padding: 12px;
      margin-bottom: 8px;
    }

    .store-override-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .store-name {
      font-size: 13px;
      font-weight: 500;
    }

    .sync-status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
    }

    /* Excel Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.85);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }

    .modal-overlay.open {
      display: flex;
    }

    .modal {
      background: var(--panel);
      border-radius: 12px;
      border: 1px solid var(--border);
      width: 500px;
      max-width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
    }

    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    /* File Upload */
    .file-upload {
      border: 2px dashed var(--border);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .file-upload:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .file-upload.dragover {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .file-upload-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .file-upload-text {
      font-size: 13px;
      color: var(--muted);
    }

    .file-upload-hint {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }

    /* Toast Messages */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 300;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .toast {
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--panel);
      border: 1px solid var(--border);
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast.success {
      border-color: rgba(34, 197, 94, 0.5);
    }

    .toast.error {
      border-color: rgba(251, 113, 133, 0.5);
    }

    /* Loading State */
    .loading-overlay {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(2, 6, 23, 0.7);
      align-items: center;
      justify-content: center;
      z-index: 50;
    }

    .loading-overlay.active {
      display: flex;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 500;
      margin: 0 0 8px;
    }

    .empty-text {
      color: var(--muted);
      font-size: 14px;
      margin: 0;
    }

    /* Back Link */
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      text-decoration: none;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .back-link:hover {
      color: var(--accent);
    }

    /* Image Gallery */
    .image-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 8px;
      margin: 12px 0;
    }

    .image-gallery-item {
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.6);
      position: relative;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
    }

    .image-gallery-item:hover {
      transform: scale(1.05);
      border-color: var(--accent);
    }

    .image-gallery-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-gallery-item .image-index {
      position: absolute;
      top: 4px;
      left: 4px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .image-gallery-empty {
      text-align: center;
      padding: 24px;
      color: var(--muted);
      font-size: 13px;
      background: rgba(15, 23, 42, 0.4);
      border-radius: 8px;
      border: 1px dashed var(--border);
    }

    .image-gallery-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: var(--muted);
    }

    .image-lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.95);
      z-index: 300;
      align-items: center;
      justify-content: center;
      cursor: zoom-out;
    }

    .image-lightbox.open {
      display: flex;
    }

    .image-lightbox img {
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
    }

    /* Reset button for overrides */
    .field-reset-btn {
      padding: 2px 8px;
      font-size: 10px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      margin-left: 8px;
    }

    .field-reset-btn:hover {
      border-color: var(--danger);
      color: var(--danger);
    }

    .field-label-row {
      display: flex;
      align-items: center;
      margin-bottom: 6px;
    }

    .field-label-row .form-label {
      margin-bottom: 0;
    }

    /* Effective value preview */
    .effective-preview {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
      padding: 6px 8px;
      background: rgba(79, 140, 255, 0.1);
      border-radius: 4px;
      border-left: 2px solid var(--accent);
    }

    /* Image refresh button */
    .btn-refresh-images {
      padding: 4px 10px;
      font-size: 11px;
    }

    /* Job Progress Panel */
    .job-progress-panel {
      position: fixed;
      top: 80px;
      right: 20px;
      width: 320px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: none;
    }

    .job-progress-panel.visible {
      display: block;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .job-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .job-progress-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--foreground);
    }

    .job-progress-close {
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
    }

    .job-progress-close:hover {
      color: var(--foreground);
    }

    .job-progress-bar-container {
      background: var(--border);
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .job-progress-bar {
      background: var(--accent);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    }

    .job-progress-bar.error {
      background: var(--danger);
    }

    .job-progress-stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .job-progress-stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .job-progress-stat.success {
      color: var(--success);
    }

    .job-progress-stat.error {
      color: var(--danger);
    }

    .job-progress-current {
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .job-progress-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .job-progress-status.running {
      background: rgba(79, 140, 255, 0.2);
      color: var(--accent);
    }

    .job-progress-status.completed {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
    }

    .job-progress-status.failed {
      background: rgba(239, 68, 68, 0.2);
      color: var(--danger);
    }

    .job-errors-toggle {
      font-size: 11px;
      color: var(--danger);
      cursor: pointer;
      margin-top: 8px;
    }

    .job-errors-toggle:hover {
      text-decoration: underline;
    }

    .job-errors-list {
      display: none;
      max-height: 120px;
      overflow-y: auto;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
      font-size: 11px;
    }

    .job-errors-list.visible {
      display: block;
    }

    .job-error-item {
      margin-bottom: 4px;
      color: var(--danger);
    }

    .job-error-item:last-child {
      margin-bottom: 0;
    }

    /* Top Sellers Section */
    .top-sellers-section {
      background: var(--panel);
      border-radius: 12px;
      border: 1px solid var(--border);
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .top-sellers-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .top-sellers-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .top-sellers-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .timeframe-select {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--panel-soft);
      color: var(--text);
      font-size: 12px;
      min-width: 140px;
    }

    .top-sellers-refresh-hint {
      font-size: 11px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .top-sellers-refresh-hint.loading {
      color: var(--accent);
    }

    .top-sellers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .top-seller-card {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      border: 1px solid var(--border-soft);
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .top-seller-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(79, 140, 255, 0.15);
    }

    .top-seller-rank {
      position: absolute;
      top: -8px;
      left: -8px;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #4f8cff, #6366f1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
    }

    .top-seller-rank.gold {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
    }

    .top-seller-rank.silver {
      background: linear-gradient(135deg, #9ca3af, #6b7280);
    }

    .top-seller-rank.bronze {
      background: linear-gradient(135deg, #d97706, #b45309);
    }

    .top-seller-title {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .top-seller-sku {
      font-size: 11px;
      color: var(--accent);
      font-family: monospace;
      margin-bottom: 8px;
    }

    .top-seller-stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .top-seller-stat {
      display: flex;
      flex-direction: column;
    }

    .top-seller-stat-value {
      font-weight: 600;
      color: var(--text);
    }

    .top-seller-stat-label {
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
    }

    .top-seller-best-store {
      font-size: 10px;
      color: var(--muted);
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-soft);
    }

    .top-sellers-empty {
      text-align: center;
      padding: 24px;
      color: var(--muted);
      font-size: 13px;
    }

    .top-sellers-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: var(--muted);
    }

    /* Performance Tab Styles */
    .performance-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .performance-stat-card {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }

    .performance-stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }

    .performance-stat-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
    }

    .performance-stores-table {
      width: 100%;
      font-size: 13px;
      margin-bottom: 20px;
    }

    .performance-stores-table th,
    .performance-stores-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-soft);
    }

    .performance-stores-table th {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 500;
    }

    .performance-trend-header {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--muted);
    }

    .performance-trend-table {
      width: 100%;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
    }

    .performance-trend-table th,
    .performance-trend-table td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid var(--border-soft);
    }

    .performance-trend-table th {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 500;
      position: sticky;
      top: 0;
      background: var(--panel);
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <a href="/" class="back-link">&larr; Inapoi la Dashboard</a>

    <div class="page-header">
      <div>
        <h1 class="page-title">Produse Master</h1>
        <p class="page-subtitle">Gestioneaza produsele master si sincronizeaza cu magazinele Shopify</p>
      </div>
      <div class="header-actions">
        <button class="btn" id="btn-excel-import">Import Excel</button>
        <button class="btn" id="btn-excel-export">Export Excel</button>
        <button class="btn" id="btn-excel-template">Descarca Template</button>
        <button class="btn btn-primary" id="btn-add-product">+ Produs Nou</button>
      </div>
    </div>

    <div class="toolbar">
      <input type="text" class="search-input" id="search-input" placeholder="Cauta dupa SKU, titlu...">

      <select class="filter-select" id="store-filter">
        <option value="">Toate magazinele</option>
      </select>

      <select class="filter-select" id="sync-filter">
        <option value="">Toate statusurile</option>
        <option value="not_pushed">Nepublicat</option>
        <option value="draft">Draft</option>
        <option value="active">Activ</option>
        <option value="failed">Eroare</option>
      </select>

      <div class="bulk-actions" id="bulk-actions">
        <span class="bulk-count"><span id="selected-count">0</span> selectate</span>
        <button class="btn btn-success" id="btn-bulk-push">Push la Shopify</button>
        <button class="btn btn-danger" id="btn-bulk-delete">Sterge</button>
      </div>
    </div>

    <!-- Top Sellers Section -->
    <div class="top-sellers-section" id="top-sellers-section">
      <div class="top-sellers-header">
        <h3 class="top-sellers-title">Top produse vandute</h3>
        <div class="top-sellers-controls">
          <select class="timeframe-select" id="top-sellers-timeframe">
            <option value="month">Luna curenta</option>
            <option value="7d">Ultimele 7 zile</option>
            <option value="ytd">De la inceputul anului</option>
          </select>
          <span class="top-sellers-refresh-hint" id="top-sellers-refresh-hint"></span>
        </div>
      </div>
      <div id="top-sellers-content">
        <div class="top-sellers-loading">
          <div class="spinner"></div>
          <span style="margin-left: 10px;">Se incarca...</span>
        </div>
      </div>
    </div>

    <div class="table-container" style="position: relative;">
      <div class="loading-overlay" id="table-loading">
        <div class="spinner"></div>
      </div>

      <div class="select-all-banner" id="select-all-banner">
        <span class="banner-text" id="banner-text">Toate cele 50 de produse de pe aceasta pagina sunt selectate.</span>
        <span class="banner-link" id="banner-select-all">Selecteaza toate cele <span id="banner-total">0</span> produse</span>
        <span class="banner-check" id="banner-all-selected" style="display: none;">✓ Toate cele <span id="banner-all-count">0</span> produse sunt selectate.</span>
        <span class="banner-link" id="banner-clear" style="display: none;">Sterge selectia</span>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="checkbox-cell">
                <input type="checkbox" id="select-all">
              </th>
              <th class="sortable" data-sort="sku">SKU</th>
              <th class="sortable" data-sort="title_default">Titlu</th>
              <th class="sortable" data-sort="price_default">Pret</th>
              <th>Sync Status</th>
              <th class="sortable" data-sort="updated_at">Actualizat</th>
              <th class="actions-cell">Actiuni</th>
            </tr>
          </thead>
          <tbody id="products-tbody">
            <!-- Products loaded via JS -->
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="pagination-info" id="pagination-info">
          Se afiseaza 0-0 din 0 produse
        </div>
        <div class="pagination-buttons" id="pagination-buttons">
          <!-- Pagination buttons loaded via JS -->
        </div>
      </div>
    </div>
  </div>

  <!-- Product Detail Drawer -->
  <div class="drawer-overlay" id="drawer-overlay"></div>
  <div class="drawer" id="product-drawer">
    <div class="drawer-header">
      <h2 class="drawer-title" id="drawer-title">Detalii Produs</h2>
      <button class="drawer-close" id="drawer-close">&times;</button>
    </div>
    <div class="drawer-content" id="drawer-content">
      <!-- Form loaded via JS -->
    </div>
    <div class="drawer-footer">
      <button class="btn" id="btn-drawer-cancel">Anuleaza</button>
      <button class="btn btn-primary" id="btn-drawer-save">Salveaza</button>
    </div>
  </div>

  <!-- Excel Import Modal -->
  <div class="modal-overlay" id="excel-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Import Excel</h3>
        <button class="drawer-close" id="excel-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="file-upload" id="excel-upload">
          <div class="file-upload-icon">📊</div>
          <div class="file-upload-text">Click sau drag & drop fisierul Excel (.xlsx)</div>
          <div class="file-upload-hint">Format: .xlsx, maxim 10MB</div>
          <input type="file" id="excel-file-input" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display: none;">
        </div>
        <div id="excel-preview" style="margin-top: 16px; display: none;">
          <div class="form-label">Preview</div>
          <div id="excel-preview-content" style="font-size: 12px; color: var(--muted);"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" id="btn-excel-cancel">Anuleaza</button>
        <button class="btn btn-primary" id="btn-excel-confirm" disabled>Importa</button>
      </div>
    </div>
  </div>

  <!-- Push to Store Modal -->
  <div class="modal-overlay" id="push-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Push la Shopify</h3>
        <button class="drawer-close" id="push-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Selecteaza magazin</label>
          <select class="form-input" id="push-store-select">
            <option value="">Alege magazin...</option>
          </select>
        </div>
        <div id="push-preview" style="margin-top: 16px;">
          <div class="form-label">Produse selectate</div>
          <div id="push-skus-list" style="font-size: 12px; color: var(--muted); max-height: 200px; overflow-y: auto;"></div>
        </div>
        <div id="push-progress" style="margin-top: 16px; display: none;">
          <div class="form-label">Progres</div>
          <div style="background: var(--border); border-radius: 4px; height: 8px; overflow: hidden;">
            <div id="push-progress-bar" style="background: var(--accent); height: 100%; width: 0%; transition: width 0.3s;"></div>
          </div>
          <div id="push-progress-text" style="font-size: 12px; color: var(--muted); margin-top: 4px;">0 / 0</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" id="btn-push-cancel">Anuleaza</button>
        <button class="btn btn-primary" id="btn-push-confirm">Porneste Push</button>
      </div>
    </div>
  </div>

  <!-- Toast Container -->
  <div class="toast-container" id="toast-container"></div>

  <!-- Job Progress Panel -->
  <div class="job-progress-panel" id="job-progress-panel">
    <div class="job-progress-header">
      <span class="job-progress-title" id="job-progress-title">Push in progres...</span>
      <button class="job-progress-close" id="job-progress-close">&times;</button>
    </div>
    <div class="job-progress-bar-container">
      <div class="job-progress-bar" id="job-progress-bar"></div>
    </div>
    <div class="job-progress-stats">
      <span class="job-progress-stat"><span id="job-progress-processed">0</span> / <span id="job-progress-total">0</span></span>
      <span class="job-progress-stat success">✓ <span id="job-progress-success">0</span></span>
      <span class="job-progress-stat error">✗ <span id="job-progress-failed">0</span></span>
    </div>
    <div class="job-progress-current" id="job-progress-current">Se asteapta...</div>
    <div>
      <span class="job-progress-status running" id="job-progress-status">In progres</span>
    </div>
    <div class="job-errors-toggle" id="job-errors-toggle" style="display: none;">Vezi erori (<span id="job-errors-count">0</span>)</div>
    <div class="job-errors-list" id="job-errors-list"></div>
  </div>

  <!-- Image Lightbox -->
  <div class="image-lightbox" id="image-lightbox">
    <img src="" alt="Product image" id="lightbox-img">
  </div>

  <script>
    // State
    let products = [];
    let stores = [];
    let currentPage = 1;
    let totalPages = 1;
    let totalProducts = 0;
    let sortBy = 'updated_at';
    let sortOrder = 'desc';
    let searchQuery = '';
    let storeFilter = '';
    let syncFilter = '';
    let selectedSkus = new Set();
    let allMatchingSelected = false; // true when user clicked "select all X products"
    let currentSku = null;
    let isNewProduct = false;
    let excelContent = null;

    // Job tracking state
    let currentJobId = null;
    let jobPollInterval = null;

    // Top sellers state
    let topSellersData = null;
    let topSellersTimeframe = 'month';
    let topSellersPollInterval = null;
    let openDrawerWithPerformanceTab = false;

    // Elements
    const tbody = document.getElementById('products-tbody');
    const tableLoading = document.getElementById('table-loading');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationButtons = document.getElementById('pagination-buttons');
    const searchInput = document.getElementById('search-input');
    const storeFilterEl = document.getElementById('store-filter');
    const syncFilterEl = document.getElementById('sync-filter');
    const selectAllCheckbox = document.getElementById('select-all');
    const bulkActions = document.getElementById('bulk-actions');
    const selectedCountEl = document.getElementById('selected-count');

    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('product-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerContent = document.getElementById('drawer-content');

    const excelModal = document.getElementById('excel-modal');
    const excelUpload = document.getElementById('excel-upload');
    const excelFileInput = document.getElementById('excel-file-input');
    const excelPreview = document.getElementById('excel-preview');
    const excelPreviewContent = document.getElementById('excel-preview-content');
    const btnExcelConfirm = document.getElementById('btn-excel-confirm');

    const pushModal = document.getElementById('push-modal');
    const pushStoreSelect = document.getElementById('push-store-select');
    const pushSkusList = document.getElementById('push-skus-list');
    const pushProgress = document.getElementById('push-progress');
    const pushProgressBar = document.getElementById('push-progress-bar');
    const pushProgressText = document.getElementById('push-progress-text');

    const toastContainer = document.getElementById('toast-container');

    // Job progress panel elements
    const jobProgressPanel = document.getElementById('job-progress-panel');
    const jobProgressTitle = document.getElementById('job-progress-title');
    const jobProgressBar = document.getElementById('job-progress-bar');
    const jobProgressProcessed = document.getElementById('job-progress-processed');
    const jobProgressTotal = document.getElementById('job-progress-total');
    const jobProgressSuccess = document.getElementById('job-progress-success');
    const jobProgressFailed = document.getElementById('job-progress-failed');
    const jobProgressCurrent = document.getElementById('job-progress-current');
    const jobProgressStatus = document.getElementById('job-progress-status');
    const jobErrorsToggle = document.getElementById('job-errors-toggle');
    const jobErrorsCount = document.getElementById('job-errors-count');
    const jobErrorsList = document.getElementById('job-errors-list');
    const jobProgressClose = document.getElementById('job-progress-close');

    // Top sellers elements
    const topSellersContent = document.getElementById('top-sellers-content');
    const topSellersTimeframeSelect = document.getElementById('top-sellers-timeframe');
    const topSellersRefreshHint = document.getElementById('top-sellers-refresh-hint');

    // Select all banner elements
    const selectAllBanner = document.getElementById('select-all-banner');
    const bannerText = document.getElementById('banner-text');
    const bannerSelectAll = document.getElementById('banner-select-all');
    const bannerTotal = document.getElementById('banner-total');
    const bannerAllSelected = document.getElementById('banner-all-selected');
    const bannerAllCount = document.getElementById('banner-all-count');
    const bannerClear = document.getElementById('banner-clear');

    // Utilities
    function showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    function formatPrice(value) {
      if (value == null) return '-';
      return Number(value).toFixed(2) + ' RON';
    }

    function formatNumber(value) {
      if (value == null) return '0';
      return Number(value).toLocaleString('ro-RO');
    }

    function formatRevenue(value) {
      if (value == null) return '0 RON';
      return Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    function getStatusBadge(status) {
      const map = {
        'not_pushed': '<span class="status-badge status-not-pushed">Nepublicat</span>',
        'draft': '<span class="status-badge status-draft">Draft</span>',
        'active': '<span class="status-badge status-active">Activ</span>',
        'failed': '<span class="status-badge status-failed">Eroare</span>',
      };
      return map[status] || map['not_pushed'];
    }

    // API calls
    async function loadProducts() {
      tableLoading.classList.add('active');
      try {
        const params = new URLSearchParams({
          page: currentPage,
          limit: 50,
          sortBy,
          sortOrder,
        });
        if (searchQuery) params.set('search', searchQuery);
        if (storeFilter) params.set('storeId', storeFilter);

        const res = await fetch('/products/table?' + params);
        const data = await res.json();

        products = data.products || [];
        totalProducts = data.total || 0;
        totalPages = data.totalPages || 1;

        renderTable();
        renderPagination();
      } catch (err) {
        console.error('Failed to load products:', err);
        showToast('Eroare la incarcarea produselor', 'error');
      } finally {
        tableLoading.classList.remove('active');
      }
    }

    async function loadStores() {
      try {
        const res = await fetch('/products/stores/list');
        const data = await res.json();
        stores = data.stores || [];

        // Populate store filter
        storeFilterEl.innerHTML = '<option value="">Toate magazinele</option>';
        pushStoreSelect.innerHTML = '<option value="">Alege magazin...</option>';
        stores.forEach(s => {
          storeFilterEl.innerHTML += '<option value="' + s.store_id + '">' + (s.store_name || s.store_id) + '</option>';
          pushStoreSelect.innerHTML += '<option value="' + s.store_id + '">' + (s.store_name || s.store_id) + '</option>';
        });
      } catch (err) {
        console.error('Failed to load stores:', err);
      }
    }

    // Top Sellers
    async function loadTopSellers() {
      console.log('[top-sellers] Loading top sellers, timeframe:', topSellersTimeframe, 'store:', storeFilter || 'ALL');

      try {
        const params = new URLSearchParams({
          timeframe: topSellersTimeframe,
          store_id: storeFilter || 'ALL',
          limit: 5,
        });

        const res = await fetch('/products/top-sellers?' + params);
        const data = await res.json();

        topSellersData = data;
        renderTopSellers(data);

        // Handle lazy refresh polling
        if (data.refresh_running) {
          topSellersRefreshHint.textContent = 'Se actualizeaza datele...';
          topSellersRefreshHint.classList.add('loading');

          // Start polling if not already
          if (!topSellersPollInterval) {
            topSellersPollInterval = setInterval(async () => {
              console.log('[top-sellers] Polling for refresh completion...');
              const refreshRes = await fetch('/products/top-sellers?' + params);
              const refreshData = await refreshRes.json();

              if (!refreshData.refresh_running) {
                // Refresh complete
                clearInterval(topSellersPollInterval);
                topSellersPollInterval = null;
                topSellersData = refreshData;
                renderTopSellers(refreshData);
                topSellersRefreshHint.textContent = 'Date actualizate';
                topSellersRefreshHint.classList.remove('loading');
                setTimeout(() => { topSellersRefreshHint.textContent = ''; }, 3000);
              }
            }, 5000);
          }
        } else if (data.refresh_triggered) {
          topSellersRefreshHint.textContent = 'Actualizare pornita...';
          topSellersRefreshHint.classList.add('loading');
        } else {
          topSellersRefreshHint.textContent = '';
          topSellersRefreshHint.classList.remove('loading');
          if (topSellersPollInterval) {
            clearInterval(topSellersPollInterval);
            topSellersPollInterval = null;
          }
        }
      } catch (err) {
        console.error('[top-sellers] Failed to load:', err);
        topSellersContent.innerHTML = '<div class="top-sellers-empty">Eroare la incarcarea datelor</div>';
      }
    }

    function renderTopSellers(data) {
      if (!data || !data.items || data.items.length === 0) {
        topSellersContent.innerHTML = '<div class="top-sellers-empty">Nu exista date de vanzari pentru perioada selectata.<br><small>Datele se calculeaza din comenzile existente.</small></div>';
        return;
      }

      const getRankClass = (idx) => {
        if (idx === 0) return 'gold';
        if (idx === 1) return 'silver';
        if (idx === 2) return 'bronze';
        return '';
      };

      const html = '<div class="top-sellers-grid">' +
        data.items.map((item, idx) => {
          const rankClass = getRankClass(idx);
          const bestStoreHtml = item.best_store_id && (storeFilter === '' || storeFilter === 'ALL')
            ? '<div class="top-seller-best-store">Best: ' + escapeHtml(item.best_store_id) + '</div>'
            : '';

          return '<div class="top-seller-card" data-sku="' + escapeHtml(item.sku) + '">' +
            '<div class="top-seller-rank ' + rankClass + '">' + (idx + 1) + '</div>' +
            '<div class="top-seller-title" title="' + escapeHtml(item.title) + '">' + escapeHtml(item.title) + '</div>' +
            '<div class="top-seller-sku">' + escapeHtml(item.sku) + '</div>' +
            '<div class="top-seller-stats">' +
              '<div class="top-seller-stat">' +
                '<span class="top-seller-stat-value">' + formatNumber(item.units_sold) + '</span>' +
                '<span class="top-seller-stat-label">Unitati</span>' +
              '</div>' +
              '<div class="top-seller-stat">' +
                '<span class="top-seller-stat-value">' + formatRevenue(item.gross_revenue) + '</span>' +
                '<span class="top-seller-stat-label">Venituri</span>' +
              '</div>' +
            '</div>' +
            bestStoreHtml +
          '</div>';
        }).join('') +
      '</div>';

      topSellersContent.innerHTML = html;

      // Attach click handlers to open drawer with Performance tab
      topSellersContent.querySelectorAll('.top-seller-card').forEach(card => {
        card.addEventListener('click', () => {
          const sku = card.dataset.sku;
          openDrawerWithPerformanceTab = true;
          openDrawer(sku);
        });
      });
    }

    async function loadProductPerformance(sku) {
      console.log('[performance] Loading performance for SKU:', sku);
      try {
        const params = new URLSearchParams({ timeframe: topSellersTimeframe });
        const res = await fetch('/products/performance/' + encodeURIComponent(sku) + '?' + params);

        if (!res.ok) {
          return null;
        }

        return await res.json();
      } catch (err) {
        console.error('[performance] Failed to load:', err);
        return null;
      }
    }

    function renderPerformanceTab(perfData) {
      if (!perfData) {
        return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Nu exista date</div><div class="empty-text">Nu s-au gasit date de performanta pentru acest produs.</div></div>';
      }

      let html = '<div class="section-header">Sumar ' + escapeHtml(perfData.timeframe_label) + '</div>';

      // Summary cards
      html += '<div class="performance-summary">' +
        '<div class="performance-stat-card">' +
          '<div class="performance-stat-value">' + formatNumber(perfData.summary.units_sold) + '</div>' +
          '<div class="performance-stat-label">Unitati vandute</div>' +
        '</div>' +
        '<div class="performance-stat-card">' +
          '<div class="performance-stat-value">' + formatRevenue(perfData.summary.gross_revenue) + '</div>' +
          '<div class="performance-stat-label">Venituri brute</div>' +
        '</div>' +
        '<div class="performance-stat-card">' +
          '<div class="performance-stat-value">' + formatNumber(perfData.summary.orders_count) + '</div>' +
          '<div class="performance-stat-label">Comenzi</div>' +
        '</div>' +
      '</div>';

      // Breakdown by store
      if (perfData.by_store && perfData.by_store.length > 0) {
        html += '<div class="section-header">Per magazin</div>';
        html += '<table class="performance-stores-table"><thead><tr>' +
          '<th>Magazin</th><th>Unitati</th><th>Venituri</th><th>Comenzi</th>' +
        '</tr></thead><tbody>';

        perfData.by_store.forEach(store => {
          html += '<tr>' +
            '<td>' + escapeHtml(store.store_id) + '</td>' +
            '<td>' + formatNumber(store.units_sold) + '</td>' +
            '<td>' + formatRevenue(store.gross_revenue) + '</td>' +
            '<td>' + formatNumber(store.orders_count) + '</td>' +
          '</tr>';
        });

        html += '</tbody></table>';
      }

      // Daily trend (last 30 days)
      if (perfData.daily_trend && perfData.daily_trend.length > 0) {
        html += '<div class="section-header">Trend zilnic (ultimele 30 zile)</div>';
        html += '<div class="performance-trend-table"><table><thead><tr>' +
          '<th>Data</th><th>Unitati</th><th>Venituri</th>' +
        '</tr></thead><tbody>';

        // Show most recent first
        [...perfData.daily_trend].reverse().forEach(day => {
          const dateStr = new Date(day.date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
          html += '<tr>' +
            '<td>' + dateStr + '</td>' +
            '<td>' + formatNumber(day.units_sold) + '</td>' +
            '<td>' + formatRevenue(day.gross_revenue) + '</td>' +
          '</tr>';
        });

        html += '</tbody></table></div>';
      }

      return html;
    }

    async function loadProductDetail(sku) {
      console.log('[drawer] loadProductDetail called for SKU:', sku);
      try {
        const url = '/products/' + encodeURIComponent(sku) + '/full';
        console.log('[drawer] Fetching:', url);
        const res = await fetch(url);

        if (!res.ok) {
          console.error('[drawer] API error:', res.status, res.statusText);
          return null;
        }

        const data = await res.json();
        console.log('[drawer] API response received:', {
          sku: data.product?.sku,
          title: data.product?.title_default,
          imagesCount: data.images?.length || 0,
          overridesCount: data.overrides?.length || 0,
          syncStatusesCount: data.syncStatuses?.length || 0
        });
        return data;
      } catch (err) {
        console.error('[drawer] Failed to load product:', err);
        return null;
      }
    }

    async function saveProduct(sku, data) {
      try {
        const method = isNewProduct ? 'POST' : 'PUT';
        const url = isNewProduct ? '/products' : '/products/' + encodeURIComponent(sku);

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Save failed');
        }

        return await res.json();
      } catch (err) {
        throw err;
      }
    }

    async function deleteProduct(sku) {
      const res = await fetch('/products/' + encodeURIComponent(sku), { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      return true;
    }

    // Render functions
    function renderTable() {
      if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Niciun produs</div><div class="empty-text">Adauga primul produs sau importa din Excel</div></div></td></tr>';
        return;
      }

      tbody.innerHTML = products.map(p => {
        const isSelected = selectedSkus.has(p.sku);
        const syncStatus = p.sync_status || 'not_pushed';

        return '<tr data-sku="' + p.sku + '">' +
          '<td class="checkbox-cell"><input type="checkbox" class="row-checkbox" data-sku="' + p.sku + '" ' + (isSelected ? 'checked' : '') + '></td>' +
          '<td class="sku-cell">' + escapeHtml(p.sku) + '</td>' +
          '<td>' + escapeHtml(p.title_default || '-') + '</td>' +
          '<td class="price-cell">' + formatPrice(p.price_default) + '</td>' +
          '<td class="sync-cell">' + getStatusBadge(syncStatus) + '</td>' +
          '<td>' + formatDate(p.updated_at) + '</td>' +
          '<td class="actions-cell"><button class="row-action btn-view" data-sku="' + p.sku + '">Vezi</button></td>' +
          '</tr>';
      }).join('');

      // Attach row click handlers
      tbody.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => openDrawer(btn.dataset.sku));
      });

      tbody.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) {
            selectedSkus.add(cb.dataset.sku);
          } else {
            selectedSkus.delete(cb.dataset.sku);
          }
          updateBulkActions();
        });
      });
    }

    function renderPagination() {
      const start = (currentPage - 1) * 50 + 1;
      const end = Math.min(currentPage * 50, totalProducts);
      paginationInfo.textContent = 'Se afiseaza ' + start + '-' + end + ' din ' + totalProducts + ' produse';

      let html = '<button class="page-btn" ' + (currentPage <= 1 ? 'disabled' : '') + ' data-page="' + (currentPage - 1) + '">&larr;</button>';

      const maxPages = 5;
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxPages - 1);
      if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        html += '<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
      }

      html += '<button class="page-btn" ' + (currentPage >= totalPages ? 'disabled' : '') + ' data-page="' + (currentPage + 1) + '">&rarr;</button>';

      paginationButtons.innerHTML = html;

      paginationButtons.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!btn.disabled) {
            currentPage = parseInt(btn.dataset.page);
            loadProducts();
          }
        });
      });
    }

    function updateBulkActions() {
      selectedCountEl.textContent = selectedSkus.size;
      bulkActions.classList.toggle('visible', selectedSkus.size > 0);

      // Check if all items on current page are selected
      const allPageSelected = products.length > 0 && products.every(p => selectedSkus.has(p.sku));
      selectAllCheckbox.checked = allPageSelected;

      // Show banner if all on page are selected AND there are more products to select
      const showBanner = allPageSelected && totalProducts > products.length;
      selectAllBanner.classList.toggle('visible', showBanner);

      if (showBanner) {
        // Update banner content based on state
        bannerTotal.textContent = totalProducts;
        bannerAllCount.textContent = totalProducts;

        if (allMatchingSelected) {
          // Show "all selected" state
          bannerText.style.display = 'none';
          bannerSelectAll.style.display = 'none';
          bannerAllSelected.style.display = 'inline';
          bannerClear.style.display = 'inline';
        } else {
          // Show "select all" prompt
          bannerText.textContent = 'Toate cele ' + products.length + ' produse de pe aceasta pagina sunt selectate.';
          bannerText.style.display = 'inline';
          bannerSelectAll.style.display = 'inline';
          bannerAllSelected.style.display = 'none';
          bannerClear.style.display = 'none';
        }
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Drawer
    let currentDrawerData = null; // Store drawer data for saving overrides
    let activeStoreTab = 'master'; // Track active tab

    function openDrawer(sku) {
      console.log('[drawer] openDrawer called with SKU:', sku, 'openWithPerformance:', openDrawerWithPerformanceTab);
      currentSku = sku;
      isNewProduct = !sku;
      currentDrawerData = null;

      // Check if we should open to performance tab
      if (openDrawerWithPerformanceTab && !isNewProduct) {
        activeStoreTab = 'performance';
      } else {
        activeStoreTab = 'master';
      }
      openDrawerWithPerformanceTab = false; // Reset flag

      drawerTitle.textContent = isNewProduct ? 'Produs Nou' : ('Editare: ' + sku);
      drawerOverlay.classList.add('open');
      drawer.classList.add('open');

      if (isNewProduct) {
        console.log('[drawer] Creating new product form');
        renderDrawerForm({});
      } else {
        // Show loading skeleton
        console.log('[drawer] Loading product detail for:', sku);
        renderDrawerSkeleton();
        loadProductDetail(sku).then(detail => {
          console.log('[drawer] loadProductDetail returned:', detail ? 'data' : 'null');
          if (detail && detail.product) {
            currentDrawerData = detail;
            console.log('[drawer] Rendering drawer form with product:', detail.product.sku);
            renderDrawerForm(detail);
          } else {
            console.error('[drawer] Product not found or invalid response for SKU:', sku);
            drawerContent.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Produs negasit</div><div class="empty-text">SKU: ' + escapeHtml(sku) + '</div></div>';
          }
        }).catch(err => {
          console.error('[drawer] Error loading product:', err);
          drawerContent.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Eroare la incarcare</div><div class="empty-text">' + escapeHtml(err.message) + '</div></div>';
        });
      }
    }

    function renderDrawerSkeleton() {
      drawerContent.innerHTML = '' +
        '<div class="section-header">Date Master</div>' +
        '<div class="skeleton skeleton-text" style="width: 60%;"></div>' +
        '<div class="skeleton skeleton-input"></div>' +
        '<div class="skeleton skeleton-text" style="width: 40%;"></div>' +
        '<div class="skeleton skeleton-input"></div>' +
        '<div class="skeleton skeleton-text" style="width: 50%;"></div>' +
        '<div class="skeleton skeleton-input" style="height: 80px;"></div>' +
        '<div style="display: flex; gap: 12px;">' +
          '<div class="skeleton skeleton-input" style="flex: 1;"></div>' +
          '<div class="skeleton skeleton-input" style="flex: 1;"></div>' +
        '</div>';
    }

    function closeDrawer() {
      drawerOverlay.classList.remove('open');
      drawer.classList.remove('open');
      currentSku = null;
      isNewProduct = false;
      currentDrawerData = null;
      activeStoreTab = 'master';
    }

    function renderDrawerForm(detail) {
      console.log('[drawer] renderDrawerForm called');
      const product = detail.product || {};
      const overrides = detail.overrides || [];
      const syncStatuses = detail.syncStatuses || [];
      const overridesByStore = detail.overridesByStore || {};
      const syncStatusesByStore = detail.syncStatusesByStore || {};
      const images = detail.images || [];

      console.log('[drawer] Rendering form for:', {
        sku: product.sku,
        storesCount: stores.length,
        imagesCount: images.length
      });

      // Build store tabs
      let tabsHtml = '';

      if (!isNewProduct && stores.length > 0) {
        const masterActive = activeStoreTab === 'master' ? ' active' : '';
        const perfActive = activeStoreTab === 'performance' ? ' active' : '';

        tabsHtml = '<div class="store-tabs">' +
          '<button class="store-tab' + masterActive + '" data-tab="master">Master</button>';

        stores.forEach(store => {
          const storeId = store.store_id;
          const sync = syncStatusesByStore[storeId] || {};
          const hasOverride = !!overridesByStore[storeId];
          const statusIcon = sync.status === 'active' ? '✓' : sync.status === 'draft' ? '○' : sync.status === 'failed' ? '✗' : '–';
          const storeActive = activeStoreTab === storeId ? ' active' : '';
          tabsHtml += '<button class="store-tab' + storeActive + '" data-tab="' + escapeHtml(storeId) + '">' +
            escapeHtml(store.store_name || storeId) +
            ' <span style="opacity: 0.6;">' + statusIcon + '</span>' +
            (hasOverride ? ' <span style="color: var(--accent);">●</span>' : '') +
            '</button>';
        });

        // Add Performance tab at the end
        tabsHtml += '<button class="store-tab' + perfActive + '" data-tab="performance" style="margin-left: auto; color: var(--accent);">📊 Performance</button>';
        tabsHtml += '</div>';
      }

      // Build image gallery HTML
      let imagesHtml = '';
      if (!isNewProduct) {
        imagesHtml = '<div class="section-header" style="display: flex; align-items: center; justify-content: space-between;">' +
          '<span>Imagini Produs</span>' +
          '<button class="btn btn-refresh-images" onclick="refreshImages()">Reincarca</button>' +
        '</div>';

        if (images.length > 0) {
          imagesHtml += '<div class="image-gallery">';
          images.forEach((img, idx) => {
            const thumbUrl = img.thumbnail_url || img.image_url;
            const fullUrl = img.image_url;
            imagesHtml += '<div class="image-gallery-item" onclick="openLightbox(\\'' + escapeHtml(fullUrl) + '\\')">' +
              '<span class="image-index">' + (idx + 1) + '</span>' +
              '<img src="' + escapeHtml(thumbUrl) + '" alt="' + escapeHtml(img.image_name || 'Image ' + (idx + 1)) + '" loading="lazy" onerror="this.src=\\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23334155%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22 font-size=%2212%22>Eroare</text></svg>\\'">' +
            '</div>';
          });
          imagesHtml += '</div>';
        } else if (product.drive_folder_url) {
          imagesHtml += '<div class="image-gallery-empty">Nu s-au gasit imagini in folderul Drive.<br><small>Apasa "Reincarca" pentru a verifica din nou.</small></div>';
        } else {
          imagesHtml += '<div class="image-gallery-empty">Nu exista folder Drive configurat.<br><small>Adauga URL-ul folderului in campul "Google Drive Folder URL".</small></div>';
        }
      }

      // Master tab content
      const masterContent = '' +
        '<div class="store-tab-content active" data-tab-content="master">' +
          imagesHtml +
          '<div class="section-header">Date Master (Globale)</div>' +
          '<div class="form-group">' +
            '<label class="form-label">SKU (unic, nemodificabil)</label>' +
            '<input type="text" class="form-input" id="field-sku" value="' + escapeHtml(product.sku || '') + '" ' + (isNewProduct ? '' : 'disabled') + '>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Titlu</label>' +
            '<input type="text" class="form-input" id="field-title" value="' + escapeHtml(product.title_default || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Descriere (HTML)</label>' +
            '<textarea class="form-input" id="field-description" style="min-height: 120px;">' + escapeHtml(product.description_default || '') + '</textarea>' +
            (product.description_default ? '<div class="form-label" style="margin-top: 8px;">Preview:</div><div class="description-preview">' + product.description_default + '</div>' : '') +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label class="form-label">Pret (RON)</label>' +
              '<input type="number" step="0.01" class="form-input" id="field-price" value="' + (product.price_default || '') + '">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">Pret vechi (comparare)</label>' +
              '<input type="number" step="0.01" class="form-input" id="field-compare-price" value="' + (product.compare_at_price_default || '') + '">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Cost produs</label>' +
            '<input type="number" step="0.01" class="form-input" id="field-cost" value="' + (product.cost || '') + '">' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label class="form-label">SEO Title (Global)</label>' +
              '<input type="text" class="form-input" id="field-seo-title" value="' + escapeHtml(product.seo_title_default || '') + '" maxlength="70">' +
              '<div class="form-hint">Max 70 caractere (' + (product.seo_title_default || '').length + '/70)</div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">SEO Meta (Global)</label>' +
              '<input type="text" class="form-input" id="field-seo-meta" value="' + escapeHtml(product.seo_meta_default || '') + '" maxlength="160">' +
              '<div class="form-hint">Max 160 caractere (' + (product.seo_meta_default || '').length + '/160)</div>' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Google Drive Folder URL</label>' +
            '<input type="text" class="form-input" id="field-drive-url" value="' + escapeHtml(product.drive_folder_url || '') + '">' +
            '<div class="form-hint">URL-ul folderului Drive care contine imaginile produsului</div>' +
          '</div>' +
        '</div>';

      // Store tab contents (for overrides)
      let storeContentsHtml = '';
      if (!isNewProduct && stores.length > 0) {
        stores.forEach(store => {
          const storeId = store.store_id;
          const override = overridesByStore[storeId] || {};
          const sync = syncStatusesByStore[storeId] || {};
          const status = sync.status || 'not_pushed';
          const lastPushed = sync.last_pushed_at ? formatDate(sync.last_pushed_at) : 'Niciodata';

          const getIndicatorAndReset = (field, displayName) => {
            const isOverridden = override[field + '_override'] != null && override[field + '_override'] !== '';
            return '<div class="field-label-row">' +
              '<label class="form-label">' + displayName + '</label>' +
              '<span class="field-override-indicator ' + (isOverridden ? 'overridden' : 'inherited') + '">' +
                (isOverridden ? 'Override activ' : 'Mostenit din Master') +
              '</span>' +
              (isOverridden ? '<button type="button" class="field-reset-btn" onclick="resetOverrideField(\\'' + escapeHtml(storeId) + '\\', \\'' + field + '_override\\')">Reset</button>' : '') +
            '</div>';
          };

          const getEffectivePreview = (fieldOverride, fieldDefault, isNumeric) => {
            const hasOverride = override[fieldOverride] != null && override[fieldOverride] !== '';
            const effectiveValue = hasOverride ? override[fieldOverride] : product[fieldDefault];
            if (!effectiveValue && effectiveValue !== 0) return '';
            const displayValue = isNumeric ? formatPrice(effectiveValue) : escapeHtml(String(effectiveValue).substring(0, 100)) + (String(effectiveValue).length > 100 ? '...' : '');
            return '<div class="effective-preview">Valoare efectiva: ' + displayValue + '</div>';
          };

          storeContentsHtml += '' +
            '<div class="store-tab-content" data-tab-content="' + escapeHtml(storeId) + '">' +
              '<div class="section-header">Override pentru ' + escapeHtml(store.store_name || storeId) + '</div>' +
              '<div class="store-override-card" style="margin-bottom: 16px;">' +
                '<div class="store-override-header">' +
                  '<span class="store-name">Status Shopify</span>' +
                  getStatusBadge(status) +
                '</div>' +
                '<div class="sync-status-row">' +
                  '<span>Ultima sincronizare: ' + lastPushed + '</span>' +
                  '<button class="btn btn-success" style="padding: 4px 12px; font-size: 11px;" onclick="pushSingleProduct(\\'' + escapeHtml(currentSku) + '\\', \\'' + escapeHtml(storeId) + '\\')">Push la Shopify</button>' +
                '</div>' +
                (sync.last_push_error ? '<div style="color: var(--danger); font-size: 11px; margin-top: 8px;">Eroare: ' + escapeHtml(sync.last_push_error) + '</div>' : '') +
              '</div>' +
              '<div class="form-hint" style="margin-bottom: 16px; padding: 10px; background: rgba(79, 140, 255, 0.1); border-radius: 6px;">Lasa campul gol pentru a mosteni valoarea din Master. Completeaza doar daca vrei sa suprascrii pentru acest magazin.</div>' +
              '<div class="form-group">' +
                getIndicatorAndReset('title', 'Titlu') +
                '<input type="text" class="form-input store-override-field" data-store="' + escapeHtml(storeId) + '" data-field="title_override" value="' + escapeHtml(override.title_override || '') + '" placeholder="' + escapeHtml(product.title_default || 'Mostenit din Master') + '">' +
                getEffectivePreview('title_override', 'title_default', false) +
              '</div>' +
              '<div class="form-group">' +
                getIndicatorAndReset('description', 'Descriere (HTML)') +
                '<textarea class="form-input store-override-field" data-store="' + escapeHtml(storeId) + '" data-field="description_override" style="min-height: 100px;" placeholder="Mostenit din Master">' + escapeHtml(override.description_override || '') + '</textarea>' +
                (override.description_override ? '<div class="form-label" style="margin-top: 8px;">Preview Override:</div><div class="description-preview">' + override.description_override + '</div>' : '') +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  getIndicatorAndReset('price', 'Pret (RON)') +
                  '<input type="number" step="0.01" class="form-input store-override-field" data-store="' + escapeHtml(storeId) + '" data-field="price_override" value="' + (override.price_override || '') + '" placeholder="' + (product.price_default || 'Mostenit') + '">' +
                  getEffectivePreview('price_override', 'price_default', true) +
                '</div>' +
                '<div class="form-group">' +
                  getIndicatorAndReset('compare_at_price', 'Pret vechi') +
                  '<input type="number" step="0.01" class="form-input store-override-field" data-store="' + escapeHtml(storeId) + '" data-field="compare_at_price_override" value="' + (override.compare_at_price_override || '') + '" placeholder="' + (product.compare_at_price_default || 'Mostenit') + '">' +
                '</div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group">' +
                  getIndicatorAndReset('seo_title', 'SEO Title') +
                  '<input type="text" class="form-input store-override-field" data-store="' + escapeHtml(storeId) + '" data-field="seo_title_override" value="' + escapeHtml(override.seo_title_override || '') + '" maxlength="70" placeholder="' + escapeHtml(product.seo_title_default || 'Mostenit') + '">' +
                '</div>' +
                '<div class="form-group">' +
                  getIndicatorAndReset('seo_meta', 'SEO Meta') +
                  '<input type="text" class="form-input store-override-field" data-store="' + escapeHtml(storeId) + '" data-field="seo_meta_override" value="' + escapeHtml(override.seo_meta_override || '') + '" maxlength="160" placeholder="' + escapeHtml(product.seo_meta_default || 'Mostenit') + '">' +
                '</div>' +
              '</div>' +
            '</div>';
        });
      }

      // Build performance tab content placeholder
      let performanceContent = '';
      if (!isNewProduct) {
        const perfActive = activeStoreTab === 'performance' ? ' active' : '';
        performanceContent = '<div class="store-tab-content' + perfActive + '" data-tab-content="performance">' +
          '<div class="top-sellers-loading"><div class="spinner"></div><span style="margin-left: 10px;">Se incarca datele de performanta...</span></div>' +
        '</div>';
      }

      drawerContent.innerHTML = tabsHtml + masterContent + storeContentsHtml + performanceContent;
      console.log('[drawer] Drawer content rendered successfully');

      // Attach tab click handlers
      drawerContent.querySelectorAll('.store-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
          const tabId = tab.dataset.tab;
          activeStoreTab = tabId;
          console.log('[drawer] Tab switched to:', tabId);

          // Update active tab button
          drawerContent.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          // Update active content
          drawerContent.querySelectorAll('.store-tab-content').forEach(c => c.classList.remove('active'));
          const content = drawerContent.querySelector('[data-tab-content="' + tabId + '"]');
          if (content) content.classList.add('active');

          // Load performance data when performance tab is clicked
          if (tabId === 'performance' && currentSku) {
            const perfContent = drawerContent.querySelector('[data-tab-content="performance"]');
            if (perfContent && !perfContent.dataset.loaded) {
              perfContent.innerHTML = '<div class="top-sellers-loading"><div class="spinner"></div><span style="margin-left: 10px;">Se incarca datele de performanta...</span></div>';
              const perfData = await loadProductPerformance(currentSku);
              perfContent.innerHTML = renderPerformanceTab(perfData);
              perfContent.dataset.loaded = 'true';
            }
          }
        });
      });

      // If opened with performance tab active, load performance data immediately
      if (activeStoreTab === 'performance' && currentSku) {
        const perfContent = drawerContent.querySelector('[data-tab-content="performance"]');
        if (perfContent) {
          loadProductPerformance(currentSku).then(perfData => {
            perfContent.innerHTML = renderPerformanceTab(perfData);
            perfContent.dataset.loaded = 'true';
          });
        }
      }
    }

    // Image functions
    function openLightbox(imageUrl) {
      console.log('[drawer] Opening lightbox for:', imageUrl);
      const lightbox = document.getElementById('image-lightbox');
      const img = document.getElementById('lightbox-img');
      img.src = imageUrl;
      lightbox.classList.add('open');
    }

    function closeLightbox() {
      const lightbox = document.getElementById('image-lightbox');
      lightbox.classList.remove('open');
    }

    async function refreshImages() {
      if (!currentSku) return;
      console.log('[drawer] Refreshing images for:', currentSku);
      showToast('Se reincarca imaginile...');

      try {
        const res = await fetch('/products/' + encodeURIComponent(currentSku) + '/images/refresh', {
          method: 'POST'
        });
        const data = await res.json();

        if (data.success) {
          showToast('Imagini reincarcate: ' + (data.images?.length || 0) + ' gasite');
          // Reload the drawer to show new images
          openDrawer(currentSku);
        } else {
          showToast(data.error || 'Eroare la reincarcare', 'error');
        }
      } catch (err) {
        console.error('[drawer] Error refreshing images:', err);
        showToast('Eroare la reincarcare: ' + err.message, 'error');
      }
    }

    // Reset override field function
    function resetOverrideField(storeId, fieldName) {
      console.log('[drawer] Resetting override field:', storeId, fieldName);
      const field = document.querySelector('.store-override-field[data-store="' + storeId + '"][data-field="' + fieldName + '"]');
      if (field) {
        field.value = '';
        showToast('Camp resetat. Salveaza pentru a aplica.');
      }
    }

    async function saveCurrentProduct() {
      const data = {
        sku: document.getElementById('field-sku').value.trim(),
        title_default: document.getElementById('field-title').value.trim(),
        description_default: document.getElementById('field-description').value.trim(),
        price_default: parseFloat(document.getElementById('field-price').value) || null,
        compare_at_price_default: parseFloat(document.getElementById('field-compare-price').value) || null,
        cost: parseFloat(document.getElementById('field-cost').value) || null,
        seo_title_default: document.getElementById('field-seo-title').value.trim() || null,
        seo_meta_default: document.getElementById('field-seo-meta').value.trim() || null,
        drive_folder_url: document.getElementById('field-drive-url').value.trim() || null,
      };

      if (!data.sku) {
        showToast('SKU este obligatoriu', 'error');
        return;
      }

      if (!data.title_default) {
        showToast('Titlul este obligatoriu', 'error');
        return;
      }

      try {
        // Save master product
        await saveProduct(data.sku, data);

        // Collect and save store overrides
        if (!isNewProduct) {
          const overrideFields = document.querySelectorAll('.store-override-field');
          const overridesByStore = {};

          overrideFields.forEach(field => {
            const storeId = field.dataset.store;
            const fieldName = field.dataset.field;
            let value = field.value.trim();

            // Handle numeric fields
            if (['price_override', 'compare_at_price_override'].includes(fieldName)) {
              value = value ? parseFloat(value) : null;
            } else {
              value = value || null;
            }

            if (!overridesByStore[storeId]) {
              overridesByStore[storeId] = {};
            }
            overridesByStore[storeId][fieldName] = value;
          });

          // Save overrides for each store that has at least one non-null value
          const overridePromises = [];
          for (const storeId of Object.keys(overridesByStore)) {
            const storeOverrides = overridesByStore[storeId];
            const hasAnyValue = Object.values(storeOverrides).some(v => v !== null && v !== '');

            if (hasAnyValue) {
              // Clean null values to keep only actual overrides
              const cleanOverrides = {};
              for (const [key, val] of Object.entries(storeOverrides)) {
                if (val !== null && val !== '') {
                  cleanOverrides[key] = val;
                }
              }

              overridePromises.push(
                fetch('/products/' + encodeURIComponent(data.sku) + '/overrides/' + encodeURIComponent(storeId), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(cleanOverrides),
                }).then(r => {
                  if (!r.ok) throw new Error('Override save failed for ' + storeId);
                  return r.json();
                })
              );
            }
          }

          if (overridePromises.length > 0) {
            await Promise.all(overridePromises);
          }
        }

        showToast(isNewProduct ? 'Produs creat cu succes' : 'Produs salvat cu succes');
        closeDrawer();
        loadProducts();
      } catch (err) {
        showToast(err.message || 'Eroare la salvare', 'error');
      }
    }

    async function pushSingleProduct(sku, storeId) {
      try {
        const res = await fetch('/products/' + encodeURIComponent(sku) + '/push/' + storeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        const result = await res.json();

        if (result.success) {
          showToast('Produs trimis: ' + result.action);
          if (currentSku === sku) {
            openDrawer(sku); // Refresh drawer
          }
        } else {
          showToast(result.error || 'Eroare la push', 'error');
        }
      } catch (err) {
        showToast('Eroare la push: ' + err.message, 'error');
      }
    }

    // Excel handling
    function openExcelModal() {
      excelContent = null;
      excelPreview.style.display = 'none';
      btnExcelConfirm.disabled = true;
      excelModal.classList.add('open');
    }

    function closeExcelModal() {
      excelModal.classList.remove('open');
    }

    async function handleExcelFile(file) {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        excelContent = e.target.result;

        // Validate
        try {
          const res = await fetch('/products/excel/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            body: excelContent,
          });

          const validation = await res.json();

          excelPreview.style.display = 'block';
          excelPreviewContent.innerHTML = '<strong>' + validation.productCount + ' produse gasite</strong>';

          if (validation.errors.length > 0) {
            excelPreviewContent.innerHTML += '<br><span style="color: var(--danger);">' + validation.errors.length + ' erori:</span><br>';
            validation.errors.slice(0, 5).forEach(err => {
              excelPreviewContent.innerHTML += '- Rand ' + err.row + ': ' + err.error + '<br>';
            });
          }

          if (validation.preview && validation.preview.length > 0) {
            excelPreviewContent.innerHTML += '<br>Primele produse: ' + validation.preview.map(p => p.sku).join(', ');
          }

          btnExcelConfirm.disabled = !validation.valid;
        } catch (err) {
          excelPreviewContent.innerHTML = '<span style="color: var(--danger);">Eroare la validare: ' + err.message + '</span>';
          btnExcelConfirm.disabled = true;
        }
      };

      reader.readAsArrayBuffer(file);
    }

    async function importExcel() {
      if (!excelContent) return;

      btnExcelConfirm.disabled = true;
      btnExcelConfirm.textContent = 'Se importa...';

      try {
        const res = await fetch('/products/excel/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          body: excelContent,
        });

        const result = await res.json();

        if (result.success) {
          showToast('Import finalizat: ' + result.imported + ' noi, ' + result.updated + ' actualizate');
          closeExcelModal();
          loadProducts();
        } else {
          showToast('Import esuat: ' + (result.parseErrors?.[0]?.error || 'Eroare necunoscuta'), 'error');
        }
      } catch (err) {
        showToast('Eroare la import: ' + err.message, 'error');
      } finally {
        btnExcelConfirm.disabled = false;
        btnExcelConfirm.textContent = 'Importa';
      }
    }

    // Job progress functions
    function showJobProgress(title) {
      jobProgressTitle.textContent = title || 'Push in progres...';
      jobProgressBar.style.width = '0%';
      jobProgressBar.classList.remove('error');
      jobProgressProcessed.textContent = '0';
      jobProgressTotal.textContent = '0';
      jobProgressSuccess.textContent = '0';
      jobProgressFailed.textContent = '0';
      jobProgressCurrent.textContent = 'Se porneste...';
      jobProgressStatus.textContent = 'In progres';
      jobProgressStatus.className = 'job-progress-status running';
      jobErrorsToggle.style.display = 'none';
      jobErrorsList.classList.remove('visible');
      jobErrorsList.innerHTML = '';
      jobProgressPanel.classList.add('visible');
    }

    function hideJobProgress() {
      jobProgressPanel.classList.remove('visible');
      if (jobPollInterval) {
        clearInterval(jobPollInterval);
        jobPollInterval = null;
      }
      currentJobId = null;
    }

    function updateJobProgressUI(job) {
      if (!job) return;

      const progress = job.progress || 0;
      jobProgressBar.style.width = progress + '%';

      jobProgressProcessed.textContent = job.processed || 0;
      jobProgressTotal.textContent = job.total || 0;
      jobProgressSuccess.textContent = job.success || 0;
      jobProgressFailed.textContent = job.failed || 0;

      if (job.currentItem) {
        jobProgressCurrent.textContent = 'Procesare: ' + job.currentItem;
      } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        jobProgressCurrent.textContent = 'Finalizat';
      }

      // Update status badge
      if (job.status === 'completed') {
        jobProgressStatus.textContent = 'Finalizat';
        jobProgressStatus.className = 'job-progress-status completed';
        if (job.failed > 0) {
          jobProgressBar.classList.add('error');
        }
      } else if (job.status === 'failed') {
        jobProgressStatus.textContent = 'Eroare';
        jobProgressStatus.className = 'job-progress-status failed';
        jobProgressBar.classList.add('error');
      } else if (job.status === 'cancelled') {
        jobProgressStatus.textContent = 'Anulat';
        jobProgressStatus.className = 'job-progress-status failed';
      } else {
        jobProgressStatus.textContent = 'In progres';
        jobProgressStatus.className = 'job-progress-status running';
      }

      // Update errors list
      if (job.errors && job.errors.length > 0) {
        jobErrorsCount.textContent = job.errors.length;
        jobErrorsToggle.style.display = 'block';
        jobErrorsList.innerHTML = job.errors.map(err =>
          '<div class="job-error-item"><strong>' + escapeHtml(err.item || 'Unknown') + ':</strong> ' + escapeHtml(err.message || 'Eroare necunoscuta') + '</div>'
        ).join('');
      }
    }

    async function pollJobProgress(jobId) {
      try {
        const res = await fetch('/jobs/' + jobId);
        if (!res.ok) {
          console.error('[job] Poll error:', res.status);
          return null;
        }
        return await res.json();
      } catch (err) {
        console.error('[job] Poll failed:', err);
        return null;
      }
    }

    function startJobPolling(jobId, onComplete) {
      currentJobId = jobId;

      // Poll immediately
      pollJobProgress(jobId).then(job => {
        if (job) updateJobProgressUI(job);
      });

      // Then poll every 1.5 seconds
      jobPollInterval = setInterval(async () => {
        const job = await pollJobProgress(jobId);
        if (!job) return;

        updateJobProgressUI(job);

        // Stop polling when job is done
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(jobPollInterval);
          jobPollInterval = null;

          if (onComplete) {
            onComplete(job);
          }
        }
      }, 1500);
    }

    // Bulk push
    function openPushModal() {
      if (selectedSkus.size === 0) return;

      pushSkusList.textContent = Array.from(selectedSkus).join(', ');
      pushProgress.style.display = 'none';
      pushProgressBar.style.width = '0%';
      document.getElementById('btn-push-confirm').disabled = false;
      pushModal.classList.add('open');
    }

    function closePushModal() {
      pushModal.classList.remove('open');
    }

    async function startBulkPush() {
      const storeId = pushStoreSelect.value;
      if (!storeId) {
        showToast('Selecteaza un magazin', 'error');
        return;
      }

      const skus = Array.from(selectedSkus);
      document.getElementById('btn-push-confirm').disabled = true;

      try {
        // Create a job for push
        const res = await fetch('/products/push/job/' + storeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skus }),
        });

        const result = await res.json();

        if (result.jobId) {
          // Close push modal and show job progress panel
          closePushModal();

          // Find store name for title
          const store = stores.find(s => s.store_id === storeId);
          const storeName = store ? (store.store_name || storeId) : storeId;
          showJobProgress('Push la ' + storeName + '...');

          // Start polling
          startJobPolling(result.jobId, (job) => {
            // On completion
            if (job.status === 'completed') {
              showToast('Push finalizat: ' + job.success + ' succes, ' + job.failed + ' erori');
            } else if (job.status === 'failed') {
              showToast('Push esuat', 'error');
            }

            // Refresh table after a short delay
            setTimeout(() => {
              selectedSkus.clear();
              updateBulkActions();
              loadProducts();
            }, 1000);
          });
        } else {
          showToast('Eroare la crearea job-ului', 'error');
          document.getElementById('btn-push-confirm').disabled = false;
        }
      } catch (err) {
        showToast('Eroare la push: ' + err.message, 'error');
        document.getElementById('btn-push-confirm').disabled = false;
      }
    }

    // Event listeners
    searchInput.addEventListener('input', debounce(() => {
      searchQuery = searchInput.value.trim();
      currentPage = 1;
      allMatchingSelected = false; // Reset bulk selection on filter change
      loadProducts();
    }, 300));

    storeFilterEl.addEventListener('change', () => {
      storeFilter = storeFilterEl.value;
      currentPage = 1;
      allMatchingSelected = false; // Reset bulk selection on filter change
      loadProducts();
      loadTopSellers(); // Reload top sellers when store filter changes
    });

    syncFilterEl.addEventListener('change', () => {
      syncFilter = syncFilterEl.value;
      currentPage = 1;
      allMatchingSelected = false; // Reset bulk selection on filter change
      loadProducts();
    });

    selectAllCheckbox.addEventListener('change', () => {
      if (selectAllCheckbox.checked) {
        products.forEach(p => selectedSkus.add(p.sku));
      } else {
        // When unchecking, clear all selections (including bulk selected)
        selectedSkus.clear();
        allMatchingSelected = false;
      }
      updateBulkActions();
      renderTable();
    });

    // Sortable headers
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (sortBy === col) {
          sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          sortBy = col;
          sortOrder = 'desc';
        }

        document.querySelectorAll('th.sortable').forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add(sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');

        loadProducts();
      });
    });

    // Button handlers
    document.getElementById('btn-add-product').addEventListener('click', () => openDrawer(null));
    document.getElementById('btn-excel-import').addEventListener('click', openExcelModal);
    document.getElementById('btn-excel-export').addEventListener('click', () => window.location.href = '/products/excel/export');
    document.getElementById('btn-excel-template').addEventListener('click', () => window.location.href = '/products/excel/template');
    document.getElementById('btn-bulk-push').addEventListener('click', openPushModal);
    document.getElementById('btn-bulk-delete').addEventListener('click', async () => {
      if (!confirm('Stergi ' + selectedSkus.size + ' produse?')) return;
      for (const sku of selectedSkus) {
        try {
          await deleteProduct(sku);
        } catch (e) {
          console.error('Delete failed:', sku, e);
        }
      }
      selectedSkus.clear();
      allMatchingSelected = false;
      updateBulkActions();
      loadProducts();
      showToast('Produse sterse');
    });

    // Select all banner events
    bannerSelectAll.addEventListener('click', async () => {
      try {
        bannerSelectAll.textContent = 'Se incarca...';
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (storeFilter) params.set('storeId', storeFilter);
        if (syncFilter) params.set('syncStatus', syncFilter);

        const res = await fetch('/products/skus?' + params);
        const data = await res.json();

        if (data.skus && data.skus.length > 0) {
          data.skus.forEach(sku => selectedSkus.add(sku));
          allMatchingSelected = true;
          updateBulkActions();
          renderTable();
          showToast('Toate cele ' + data.skus.length + ' produse au fost selectate');
        }
      } catch (err) {
        console.error('Failed to select all:', err);
        showToast('Eroare la selectarea produselor', 'error');
      }
    });

    bannerClear.addEventListener('click', () => {
      selectedSkus.clear();
      allMatchingSelected = false;
      updateBulkActions();
      renderTable();
    });

    // Drawer events
    drawerOverlay.addEventListener('click', closeDrawer);
    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    document.getElementById('btn-drawer-cancel').addEventListener('click', closeDrawer);
    document.getElementById('btn-drawer-save').addEventListener('click', saveCurrentProduct);

    // Excel modal events
    document.getElementById('excel-modal-close').addEventListener('click', closeExcelModal);
    document.getElementById('btn-excel-cancel').addEventListener('click', closeExcelModal);
    document.getElementById('btn-excel-confirm').addEventListener('click', importExcel);

    excelUpload.addEventListener('click', () => excelFileInput.click());
    excelFileInput.addEventListener('change', () => handleExcelFile(excelFileInput.files[0]));
    excelUpload.addEventListener('dragover', (e) => { e.preventDefault(); excelUpload.classList.add('dragover'); });
    excelUpload.addEventListener('dragleave', () => excelUpload.classList.remove('dragover'));
    excelUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      excelUpload.classList.remove('dragover');
      handleExcelFile(e.dataTransfer.files[0]);
    });

    // Push modal events
    document.getElementById('push-modal-close').addEventListener('click', closePushModal);
    document.getElementById('btn-push-cancel').addEventListener('click', closePushModal);
    document.getElementById('btn-push-confirm').addEventListener('click', startBulkPush);

    // Utility
    function debounce(fn, ms) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
      };
    }

    // Lightbox close
    document.getElementById('image-lightbox').addEventListener('click', closeLightbox);

    // Job progress panel events
    jobProgressClose.addEventListener('click', hideJobProgress);
    jobErrorsToggle.addEventListener('click', () => {
      jobErrorsList.classList.toggle('visible');
    });

    // Top sellers timeframe change
    topSellersTimeframeSelect.addEventListener('change', () => {
      topSellersTimeframe = topSellersTimeframeSelect.value;
      loadTopSellers();
    });

    // Init
    console.log('[products] Initializing Products page');
    loadStores();
    loadProducts();
    loadTopSellers();
  </script>
</body>
</html>
  `;
}

module.exports = { productsPage };
