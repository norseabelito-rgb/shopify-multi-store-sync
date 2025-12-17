// routes/products.js
// API Routes for Products Module
// Master products, store overrides, Excel import/export, Shopify push

const express = require('express');
const router = express.Router();

const {
  getMasterProducts,
  getMasterProductBySku,
  createMasterProduct,
  updateMasterProduct,
  deleteMasterProduct,
  bulkUpsertMasterProducts,
  getStoreOverride,
  upsertStoreOverride,
  deleteStoreOverride,
  getEffectiveProduct,
  getProductsForTable,
  getProductFullDetail,
  getStoreSyncStatus,
  getAllStoreSyncStatuses,
} = require('../services/productsService');

const {
  generateExcelTemplate,
  exportMasterProductsToExcel,
  importFromExcel,
  validateExcel,
} = require('../services/productsExcelService');

const {
  pushProductToStore,
  pushProductsBatch,
  getProductPushPreview,
} = require('../services/productsPushService');

const {
  getJob,
  getRecentJobs,
  getRunningJob,
  cancelJob,
  startPushAllProducts,
  startPushSelectedProducts,
  startPushToAllStores,
} = require('../jobs/productsPush');

const { loadStoresRows } = require('../lib/stores');
const { productsPage } = require('../ui/productsPage');
const {
  getTopSellers,
  getProductPerformance,
  backfill2025: backfillProductSales2025,
} = require('../services/productSalesAggService');

// ==================== UI PAGE ====================

// GET /products/ui - Render the Products UI page
router.get('/ui', (req, res) => {
  res.send(productsPage());
});

// ==================== TOP SELLERS / ANALYTICS ====================

// GET /products/top-sellers - Get top selling products with lazy refresh
// Query params: store_id (default 'ALL'), timeframe ('7d'|'month'|'ytd', default 'month'), limit (default 5)
router.get('/top-sellers', async (req, res) => {
  try {
    const {
      store_id = 'ALL',
      timeframe = 'month',
      limit = 5,
    } = req.query;

    // Validate timeframe
    const validTimeframes = ['7d', 'month', 'ytd'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe',
        valid_timeframes: validTimeframes,
      });
    }

    const result = await getTopSellers(store_id, timeframe, Math.min(Number(limit), 20));
    res.json(result);
  } catch (err) {
    console.error('[products] GET /top-sellers error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/performance/:sku - Get detailed performance for a specific product
router.get('/performance/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const { timeframe = 'month' } = req.query;

    const result = await getProductPerformance(sku, timeframe);

    if (result.error) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[products] GET /performance/:sku error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/sales/backfill-2025 - Backfill product sales aggregation for 2025
// This is a one-time utility endpoint for initial data load
router.post('/sales/backfill-2025', async (req, res) => {
  try {
    console.log('[products] Starting product sales backfill for 2025...');
    const result = await backfillProductSales2025();
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[products] POST /sales/backfill-2025 error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== MASTER PRODUCTS ====================

// GET /products - List master products with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'updated_at',
      sortOrder = 'desc',
    } = req.query;

    const result = await getMasterProducts({
      page: Number(page),
      limit: Math.min(Number(limit), 200),
      search,
      sortBy,
      sortOrder,
    });

    res.json(result);
  } catch (err) {
    console.error('[products] GET / error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/table - Get products for table view with store sync status
router.get('/table', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'updated_at',
      sortOrder = 'desc',
      storeId,
    } = req.query;

    const result = await getProductsForTable({
      page: Number(page),
      limit: Math.min(Number(limit), 200),
      search,
      sortBy,
      sortOrder,
      storeId,
    });

    res.json(result);
  } catch (err) {
    console.error('[products] GET /table error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/:sku - Get single master product
router.get('/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await getMasterProductBySku(sku);

    if (!product) {
      return res.status(404).json({ error: `Produs negăsit: ${sku}` });
    }

    res.json({ product });
  } catch (err) {
    console.error('[products] GET /:sku error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/:sku/full - Get full product detail with overrides, sync status, and images
// This is the main endpoint for the product drawer
router.get('/:sku/full', async (req, res) => {
  try {
    const { sku } = req.params;
    const { includeImages = 'true' } = req.query;

    console.log(`[products] GET /:sku/full called for SKU: ${sku}`);

    // Load stores to compute effective values
    const stores = await loadStoresRows();
    console.log(`[products] Loaded ${stores.length} stores for effective values`);

    const detail = await getProductFullDetail(sku, {
      stores,
      includeImages: includeImages !== 'false',
    });

    if (!detail) {
      console.log(`[products] Product not found: ${sku}`);
      return res.status(404).json({ error: `Produs negăsit: ${sku}` });
    }

    console.log(`[products] Returning full detail for ${sku}: ${detail.images?.length || 0} images, ${Object.keys(detail.effectiveByStore || {}).length} effective stores`);

    res.json(detail);
  } catch (err) {
    console.error('[products] GET /:sku/full error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products - Create new master product
router.post('/', async (req, res) => {
  try {
    const productData = req.body;

    if (!productData.sku) {
      return res.status(400).json({ error: 'SKU este obligatoriu' });
    }

    if (!productData.title_default) {
      return res.status(400).json({ error: 'Titlul (title_default) este obligatoriu' });
    }

    const product = await createMasterProduct(productData);

    console.log(`[products] Created product: ${product.sku}`);
    res.status(201).json({ product });
  } catch (err) {
    console.error('[products] POST / error:', err);

    // Check for duplicate key error
    if (err.code === '23505' || err.message?.includes('duplicate key')) {
      return res.status(409).json({ error: `Produs cu SKU ${req.body.sku} există deja` });
    }

    res.status(500).json({ error: err.message || String(err) });
  }
});

// PUT /products/:sku - Update master product (SKU cannot be changed)
router.put('/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const updates = req.body;

    // Prevent SKU modification
    if (updates.sku && updates.sku !== sku) {
      return res.status(400).json({ error: 'SKU nu poate fi modificat' });
    }

    const product = await updateMasterProduct(sku, updates);

    if (!product) {
      return res.status(404).json({ error: `Produs negăsit: ${sku}` });
    }

    console.log(`[products] Updated product: ${sku}`);
    res.json({ product });
  } catch (err) {
    console.error('[products] PUT /:sku error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// DELETE /products/:sku - Delete master product
router.delete('/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const deleted = await deleteMasterProduct(sku);

    if (!deleted) {
      return res.status(404).json({ error: `Produs negăsit: ${sku}` });
    }

    console.log(`[products] Deleted product: ${sku}`);
    res.json({ success: true, deleted: sku });
  } catch (err) {
    console.error('[products] DELETE /:sku error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== STORE OVERRIDES ====================

// GET /products/:sku/overrides/:storeId - Get store override for a product
router.get('/:sku/overrides/:storeId', async (req, res) => {
  try {
    const { sku, storeId } = req.params;
    const override = await getStoreOverride(sku, storeId);

    // Return empty object if no override exists (not an error)
    res.json({ override: override || {} });
  } catch (err) {
    console.error('[products] GET /:sku/overrides/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// PUT /products/:sku/overrides/:storeId - Create/update store override
router.put('/:sku/overrides/:storeId', async (req, res) => {
  try {
    const { sku, storeId } = req.params;
    const overrideData = req.body;

    // Verify master product exists
    const masterProduct = await getMasterProductBySku(sku);
    if (!masterProduct) {
      return res.status(404).json({ error: `Produs master negăsit: ${sku}` });
    }

    const override = await upsertStoreOverride(sku, storeId, overrideData);

    console.log(`[products] Upserted override for ${sku} in store ${storeId}`);
    res.json({ override });
  } catch (err) {
    console.error('[products] PUT /:sku/overrides/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// DELETE /products/:sku/overrides/:storeId - Delete store override
router.delete('/:sku/overrides/:storeId', async (req, res) => {
  try {
    const { sku, storeId } = req.params;
    const deleted = await deleteStoreOverride(sku, storeId);

    if (!deleted) {
      return res.status(404).json({ error: `Override negăsit pentru ${sku} în ${storeId}` });
    }

    console.log(`[products] Deleted override for ${sku} in store ${storeId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[products] DELETE /:sku/overrides/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/:sku/effective/:storeId - Get effective product data (master + override merged)
router.get('/:sku/effective/:storeId', async (req, res) => {
  try {
    const { sku, storeId } = req.params;
    const effective = await getEffectiveProduct(sku, storeId);

    if (!effective) {
      return res.status(404).json({ error: `Produs negăsit: ${sku}` });
    }

    res.json({ product: effective });
  } catch (err) {
    console.error('[products] GET /:sku/effective/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== SYNC STATUS ====================

// GET /products/:sku/sync - Get sync status for a product across all stores
router.get('/:sku/sync', async (req, res) => {
  try {
    const { sku } = req.params;
    const syncStatuses = await getAllStoreSyncStatuses(sku);

    res.json({ sku, stores: syncStatuses });
  } catch (err) {
    console.error('[products] GET /:sku/sync error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/:sku/sync/:storeId - Get sync status for specific store
router.get('/:sku/sync/:storeId', async (req, res) => {
  try {
    const { sku, storeId } = req.params;
    const syncStatus = await getStoreSyncStatus(sku, storeId);

    res.json({ syncStatus: syncStatus || { status: 'not_pushed' } });
  } catch (err) {
    console.error('[products] GET /:sku/sync/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== EXCEL IMPORT/EXPORT ====================

// GET /products/excel/template - Download Excel template
router.get('/excel/template', async (req, res) => {
  try {
    const buffer = generateExcelTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="products_template.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('[products] GET /excel/template error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/excel/export - Export all master products to Excel
router.get('/excel/export', async (req, res) => {
  try {
    const buffer = await exportMasterProductsToExcel();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="products_export.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('[products] GET /excel/export error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/excel/validate - Validate Excel without importing
router.post('/excel/validate', express.raw({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', limit: '10mb' }), async (req, res) => {
  try {
    const buffer = req.body;

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Fisierul Excel este necesar' });
    }

    const validation = validateExcel(buffer);

    res.json(validation);
  } catch (err) {
    console.error('[products] POST /excel/validate error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/excel/import - Import products from Excel
router.post('/excel/import', express.raw({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', limit: '10mb' }), async (req, res) => {
  try {
    const buffer = req.body;

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Fisierul Excel este necesar' });
    }

    const result = await importFromExcel(buffer);

    console.log(`[products] Excel import: ${result.imported} inserted, ${result.updated} updated, ${result.errors?.length || 0} errors`);
    res.json(result);
  } catch (err) {
    console.error('[products] POST /excel/import error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== SHOPIFY PUSH ====================

// GET /products/:sku/push/preview/:storeId - Preview what would happen on push
router.get('/:sku/push/preview/:storeId', async (req, res) => {
  try {
    const { sku, storeId } = req.params;
    const preview = await getProductPushPreview(sku, storeId);

    res.json(preview);
  } catch (err) {
    console.error('[products] GET /:sku/push/preview/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/:sku/push/:storeId - Push single product to store
router.post('/:sku/push/:storeId', async (req, res) => {
  try {
    const { sku, storeId } = req.params;
    const { imageUrls = [], forceUpdate = false } = req.body || {};

    const result = await pushProductToStore(sku, storeId, { imageUrls, forceUpdate });

    if (result.success) {
      console.log(`[products] Pushed ${sku} to ${storeId}: ${result.action}`);
      res.json(result);
    } else {
      console.error(`[products] Push failed for ${sku} to ${storeId}:`, result.error);
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[products] POST /:sku/push/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/push/batch/:storeId - Push multiple products to a store
router.post('/push/batch/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { skus, delayMs = 500 } = req.body || {};

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'skus array is required' });
    }

    if (skus.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 products per batch. Use /tasks/products/push for larger batches.' });
    }

    console.log(`[products] Starting batch push of ${skus.length} products to ${storeId}`);

    const result = await pushProductsBatch(skus, storeId, { delayMs });

    console.log(`[products] Batch push complete: ${result.success}/${result.total} success`);
    res.json(result);
  } catch (err) {
    console.error('[products] POST /push/batch/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== JOB-BASED PUSH (WITH PROGRESS TRACKING) ====================

const {
  createJob,
  startJob,
  updateJobProgress,
  addJobError,
  completeJob,
  failJob,
  getJobSummary,
} = require('../services/jobsService');

// POST /products/push/job/:storeId - Create a push job for selected SKUs with progress tracking
router.post('/push/job/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { skus } = req.body || {};

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'skus array is required' });
    }

    console.log(`[products] Creating push job for ${skus.length} products to ${storeId}`);

    // Create job
    const job = await createJob({
      type: 'push_selected',
      storeId,
      total: skus.length,
      metadata: { skus },
    });

    // Start job in background (don't await)
    runPushJob(job.id, skus, storeId).catch(err => {
      console.error(`[products] Push job ${job.id} failed:`, err);
    });

    res.json({
      success: true,
      jobId: job.id,
      message: `Push job created for ${skus.length} products`,
    });
  } catch (err) {
    console.error('[products] POST /push/job/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/push/job-all/:storeId - Create a push job for ALL products
router.post('/push/job-all/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    // Get all product SKUs
    const products = await getMasterProducts({ page: 1, limit: 10000 });
    const skus = products.products.map(p => p.sku);

    if (skus.length === 0) {
      return res.status(400).json({ error: 'No products found' });
    }

    console.log(`[products] Creating push-all job for ${skus.length} products to ${storeId}`);

    // Create job
    const job = await createJob({
      type: 'push_all',
      storeId,
      total: skus.length,
      metadata: { allProducts: true },
    });

    // Start job in background
    runPushJob(job.id, skus, storeId).catch(err => {
      console.error(`[products] Push-all job ${job.id} failed:`, err);
    });

    res.json({
      success: true,
      jobId: job.id,
      message: `Push job created for all ${skus.length} products`,
    });
  } catch (err) {
    console.error('[products] POST /push/job-all/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * Run a push job in the background
 * @param {string} jobId - Job ID
 * @param {Array<string>} skus - SKUs to push
 * @param {string} storeId - Store ID
 */
async function runPushJob(jobId, skus, storeId) {
  console.log(`[products] Starting push job ${jobId}: ${skus.length} products to ${storeId}`);

  try {
    await startJob(jobId);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];

      try {
        // Update progress with current item
        await updateJobProgress(jobId, {
          processed: i,
          success,
          failed,
          currentItem: sku,
        });

        // Push product
        const result = await pushProductToStore(sku, storeId);

        if (result.success) {
          success++;
          console.log(`[products] Job ${jobId}: ${sku} pushed (${i + 1}/${skus.length})`);
        } else {
          failed++;
          await addJobError(jobId, {
            item: sku,
            message: result.error || result.action,
          });
          console.log(`[products] Job ${jobId}: ${sku} failed: ${result.error}`);
        }
      } catch (err) {
        failed++;
        await addJobError(jobId, {
          item: sku,
          message: err.message,
        });
        console.error(`[products] Job ${jobId}: ${sku} error:`, err.message);
      }

      // Rate limit delay (except for last item)
      if (i < skus.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Complete job
    await updateJobProgress(jobId, {
      processed: skus.length,
      success,
      failed,
      currentItem: null,
    });

    await completeJob(jobId, 'completed');
    console.log(`[products] Push job ${jobId} completed: ${success}/${skus.length} success, ${failed} failed`);
  } catch (err) {
    console.error(`[products] Push job ${jobId} failed:`, err);
    await failJob(jobId, err.message);
  }
}

// ==================== IMAGES ====================

// POST /products/:sku/images/refresh - Force refresh images from Google Drive
router.post('/:sku/images/refresh', async (req, res) => {
  try {
    const { sku } = req.params;

    console.log(`[products] POST /:sku/images/refresh called for SKU: ${sku}`);

    // Get product to get drive_folder_url
    const product = await getMasterProductBySku(sku);
    if (!product) {
      return res.status(404).json({ error: `Produs negăsit: ${sku}` });
    }

    if (!product.drive_folder_url) {
      return res.status(400).json({ error: 'Produsul nu are un folder Drive configurat' });
    }

    const { refreshProductImages } = require('../services/productsImagesService');
    const images = await refreshProductImages(sku, product.drive_folder_url);

    console.log(`[products] Refreshed ${images.length} images for SKU: ${sku}`);
    res.json({ success: true, images });
  } catch (err) {
    console.error('[products] POST /:sku/images/refresh error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== STORES LIST ====================

// GET /products/stores - Get list of available stores
router.get('/stores/list', async (req, res) => {
  try {
    const stores = await loadStoresRows();

    const storesList = stores.map(s => ({
      store_id: s.store_id,
      store_name: s.store_name || s.store_id,
      shopify_domain: s.shopify_domain,
    }));

    res.json({ stores: storesList });
  } catch (err) {
    console.error('[products] GET /stores error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ==================== BACKGROUND JOBS ====================

// GET /products/jobs - Get recent push jobs
router.get('/jobs', async (req, res) => {
  try {
    const { store_id, status, limit = 20 } = req.query;

    const jobs = await getRecentJobs({
      storeId: store_id,
      status,
      limit: Math.min(Number(limit), 100),
    });

    res.json({ jobs });
  } catch (err) {
    console.error('[products] GET /jobs error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/jobs/:jobId - Get specific job details
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: `Job negăsit: ${jobId}` });
    }

    res.json({ job });
  } catch (err) {
    console.error('[products] GET /jobs/:jobId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /products/jobs/running/:storeId - Get running job for a store
router.get('/jobs/running/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const job = await getRunningJob(storeId);

    res.json({ job: job || null });
  } catch (err) {
    console.error('[products] GET /jobs/running/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/jobs/:jobId/cancel - Cancel a running job
router.post('/jobs/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = await cancelJob(jobId);

    if (!cancelled) {
      return res.status(400).json({ error: `Job ${jobId} nu poate fi anulat (nu e pending/running)` });
    }

    console.log(`[products] Cancelled job ${jobId}`);
    res.json({ success: true, cancelled: jobId });
  } catch (err) {
    console.error('[products] POST /jobs/:jobId/cancel error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/jobs/push-all/:storeId - Start push all products to a store
router.post('/jobs/push-all/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { created_by = 'api' } = req.body || {};

    const result = await startPushAllProducts(storeId, { createdBy: created_by });

    if (result.success) {
      console.log(`[products] Started push-all job ${result.job.id} for ${storeId}`);
      res.status(202).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[products] POST /jobs/push-all/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/jobs/push-selected/:storeId - Start push selected products to a store
router.post('/jobs/push-selected/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { skus, created_by = 'api' } = req.body || {};

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'skus array is required' });
    }

    const result = await startPushSelectedProducts(storeId, skus, { createdBy: created_by });

    if (result.success) {
      console.log(`[products] Started push-selected job ${result.job.id} for ${skus.length} products to ${storeId}`);
      res.status(202).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[products] POST /jobs/push-selected/:storeId error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /products/jobs/push-all-stores - Start push all products to all stores
router.post('/jobs/push-all-stores', async (req, res) => {
  try {
    const { created_by = 'api' } = req.body || {};

    const result = await startPushToAllStores({ createdBy: created_by });

    if (result.success) {
      console.log(`[products] Started push to all stores: ${result.jobs.length} jobs`);
      res.status(202).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[products] POST /jobs/push-all-stores error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
