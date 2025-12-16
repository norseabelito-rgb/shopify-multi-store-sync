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
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--accent-soft);
      border: 1px solid rgba(79, 140, 255, 0.3);
    }

    .bulk-actions.visible {
      display: flex;
    }

    .bulk-count {
      font-size: 12px;
      color: var(--accent);
      font-weight: 500;
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

    <div class="table-container" style="position: relative;">
      <div class="loading-overlay" id="table-loading">
        <div class="spinner"></div>
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
    let currentSku = null;
    let isNewProduct = false;
    let excelContent = null;

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

    async function loadProductDetail(sku) {
      try {
        const res = await fetch('/products/' + encodeURIComponent(sku) + '/full');
        return await res.json();
      } catch (err) {
        console.error('Failed to load product:', err);
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
      selectAllCheckbox.checked = selectedSkus.size > 0 && selectedSkus.size === products.length;
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Drawer
    function openDrawer(sku) {
      currentSku = sku;
      isNewProduct = !sku;

      drawerTitle.textContent = isNewProduct ? 'Produs Nou' : 'Editare Produs';
      drawerOverlay.classList.add('open');
      drawer.classList.add('open');

      if (isNewProduct) {
        renderDrawerForm({});
      } else {
        loadProductDetail(sku).then(detail => {
          if (detail) {
            renderDrawerForm(detail);
          }
        });
      }
    }

    function closeDrawer() {
      drawerOverlay.classList.remove('open');
      drawer.classList.remove('open');
      currentSku = null;
      isNewProduct = false;
    }

    function renderDrawerForm(detail) {
      const product = detail.product || {};
      const overrides = detail.overrides || [];
      const syncStatuses = detail.syncStatuses || [];

      drawerContent.innerHTML = '' +
        '<div class="section-header">Date Master</div>' +
        '<div class="form-group">' +
          '<label class="form-label">SKU (unic, nemodificabil)</label>' +
          '<input type="text" class="form-input" id="field-sku" value="' + escapeHtml(product.sku || '') + '" ' + (isNewProduct ? '' : 'disabled') + '>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Titlu</label>' +
          '<input type="text" class="form-input" id="field-title" value="' + escapeHtml(product.title_default || '') + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Descriere</label>' +
          '<textarea class="form-input" id="field-description">' + escapeHtml(product.description_default || '') + '</textarea>' +
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
            '<label class="form-label">SEO Title</label>' +
            '<input type="text" class="form-input" id="field-seo-title" value="' + escapeHtml(product.seo_title_default || '') + '" maxlength="70">' +
            '<div class="form-hint">Max 70 caractere</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">SEO Meta</label>' +
            '<input type="text" class="form-input" id="field-seo-meta" value="' + escapeHtml(product.seo_meta_default || '') + '" maxlength="160">' +
            '<div class="form-hint">Max 160 caractere</div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Google Drive Folder URL</label>' +
          '<input type="text" class="form-input" id="field-drive-url" value="' + escapeHtml(product.drive_folder_url || '') + '">' +
        '</div>';

      // Sync status per store
      if (!isNewProduct && stores.length > 0) {
        let syncHtml = '<div class="section-header">Status Sincronizare</div>';

        stores.forEach(store => {
          const sync = syncStatuses.find(s => s.store_id === store.store_id) || {};
          const status = sync.status || 'not_pushed';
          const lastPushed = sync.last_pushed_at ? formatDate(sync.last_pushed_at) : 'Niciodata';

          syncHtml += '' +
            '<div class="store-override-card">' +
              '<div class="store-override-header">' +
                '<span class="store-name">' + escapeHtml(store.store_name || store.store_id) + '</span>' +
                getStatusBadge(status) +
              '</div>' +
              '<div class="sync-status-row">' +
                '<span>Ultima sincronizare: ' + lastPushed + '</span>' +
                '<button class="btn" style="padding: 4px 8px; font-size: 11px;" onclick="pushSingleProduct(\\'' + currentSku + '\\', \\'' + store.store_id + '\\')">Push</button>' +
              '</div>' +
            '</div>';
        });

        drawerContent.innerHTML += syncHtml;
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
        await saveProduct(data.sku, data);
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
      pushProgress.style.display = 'block';

      try {
        const res = await fetch('/products/push/batch/' + storeId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skus, delayMs: 500 }),
        });

        const result = await res.json();

        pushProgressBar.style.width = '100%';
        pushProgressText.textContent = result.success + ' / ' + result.total + ' succes';

        showToast('Push finalizat: ' + result.success + ' succes, ' + result.failed + ' erori');

        setTimeout(() => {
          closePushModal();
          selectedSkus.clear();
          updateBulkActions();
          loadProducts();
        }, 1500);
      } catch (err) {
        showToast('Eroare la push: ' + err.message, 'error');
        document.getElementById('btn-push-confirm').disabled = false;
      }
    }

    // Event listeners
    searchInput.addEventListener('input', debounce(() => {
      searchQuery = searchInput.value.trim();
      currentPage = 1;
      loadProducts();
    }, 300));

    storeFilterEl.addEventListener('change', () => {
      storeFilter = storeFilterEl.value;
      currentPage = 1;
      loadProducts();
    });

    syncFilterEl.addEventListener('change', () => {
      syncFilter = syncFilterEl.value;
      currentPage = 1;
      loadProducts();
    });

    selectAllCheckbox.addEventListener('change', () => {
      if (selectAllCheckbox.checked) {
        products.forEach(p => selectedSkus.add(p.sku));
      } else {
        products.forEach(p => selectedSkus.delete(p.sku));
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
      updateBulkActions();
      loadProducts();
      showToast('Produse sterse');
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

    // Init
    loadStores();
    loadProducts();
  </script>
</body>
</html>
  `;
}

module.exports = { productsPage };
