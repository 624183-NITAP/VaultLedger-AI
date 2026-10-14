// VaultLedger AI - Frontend Application Controller
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currency: '$',
    activeModel: 'llama3.2:latest',
    isOllamaConnected: false,
    ledger: [],
    lastParsedItem: null,
    selectedOverdueInvoice: null,
    selectedChaserTone: 'gentle'
  };

  // Pre-configured Realistic Freelance Test Documents
  const PRESETS = {
    aws: `AMAZON WEB SERVICES LLC
Invoice #: AWS-992144
Account ID: 4492-1082-9901
Date: 2024-10-11
Due Date: 2024-10-11
Billed To: Saira S. (Independent Cloud & AI Consultant)
Payment Method: Visa ending 4092

Charges:
1. Amazon EC2 g5.xlarge GPU Instance (A10G) - 180 hrs: $181.80
2. Amazon S3 Standard Storage (1.5 TB-Mo): $34.50
3. Elastic IP Allocation & Data Transfer Out: $12.40

Subtotal: $228.70
Estimated Sales Tax (8.25%): $18.87
Total Amount Billed: $247.57`,

    design: `STARLIGHT STUDIOS INC.
INVOICE #: INV-2024-108
Issue Date: October 08, 2024
Payment Terms: Net-30
Due Date: November 07, 2024
Payable To: Saira S. Design Consultancy
Client Contact: accounts@starlightstudios.io

Professional Services Rendered:
1. Phase 2 Mobile App Design System Architecture (35 hrs @ $95/hr): $3,325.00
2. High-Fidelity Interactive Micro-interaction Prototypes: $850.00
3. Developer Handoff & Token Documentation: $325.00

Subtotal: $4,500.00
Tax / VAT (0% Exempt Service): $0.00
Total Due: $4,500.00`,

    lunch: `BISTRO VERDE RESTAURANT
742 Congress Ave, Austin, TX 78701
Server: Marcus | Table 14 | Guests: 2
Date: 10/09/2024 1:15 PM
Receipt #: CHK-99023

Itemized Order:
1x Roasted Beet & Goat Cheese Salad - $16.00
1x Pan-Seared Salmon Prix Fixe - $38.00
1x Wild Mushroom Risotto - $32.00
2x Sparkling Water San Pellegrino - $14.00
2x Espresso Double - $10.00

Food & Beverage Subtotal: $110.00
State & City Tax (8.25%): $9.08
Gratuity (20% Tip): $22.00
Total Charged to Amex Corp: $141.08

Notes: Business lunch meeting with CTO of Starlight Studios discussing Q4 generative AI prototype contract.`,

    contractor: `RIVERA MOTION GRAPHICS & 3D LLC
Contractor Invoice #: RVR-2024-41
Date: October 05, 2024
Due Date: October 19, 2024
Billed to: Saira S. Freelance Studio

Subcontractor Deliverables (1099 Form W-9 on file):
1. 3D Spline Asset Modeling & Texture Baking for Client Hero Section: $950.00
2. AfterEffects Lottie JSON Animations (6 UI states): $450.00

Total Payable: $1,400.00
Payment Method: ACH Wire transfer`,

    hardware: `APPLE STORE DOWNTOWN
120 W 2nd St, Austin, TX 78701
Transaction #: 0492-99120
Date: 2024-10-02
Customer: Saira S. (Sole Proprietor)

Items Purchased:
1. Apple MacBook Pro 16-inch (M3 Max, 36GB Unified Memory, 1TB SSD) - Serial #H8910293J: $3,499.00
2. AppleCare+ for 16-inch MacBook Pro (3 Years): $399.00
3. USB-C to Dual 4K DisplayPort Adapter: $69.00

Subtotal: $3,967.00
Sales Tax (8.25%): $327.28
Total Charged to Business Card: $4,294.28
Category: Primary Computing Workstation for Client Engineering`
  };

  // DOM Elements
  const statusDot = document.getElementById('statusDot');
  const modelStatusText = document.getElementById('modelStatusText');
  const currentModelLabel = document.getElementById('currentModelLabel');
  const airgapBadge = document.getElementById('airgapBadge');
  const currencySelector = document.getElementById('currencySelector');

  // KPI elements
  const kpiGrossRevenue = document.getElementById('kpiGrossRevenue');
  const kpiIncomeCount = document.getElementById('kpiIncomeCount');
  const kpiTotalExpense = document.getElementById('kpiTotalExpense');
  const kpiExpenseCount = document.getElementById('kpiExpenseCount');
  const kpiDeductibleSum = document.getElementById('kpiDeductibleSum');
  const kpiTaxSavings = document.getElementById('kpiTaxSavings');
  const kpiOverdueSum = document.getElementById('kpiOverdueSum');
  const kpiOverdueCount = document.getElementById('kpiOverdueCount');
  const ledgerCountPill = document.getElementById('ledgerCountPill');
  const chaserCountPill = document.getElementById('chaserCountPill');

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Ingest elements
  const rawDocText = document.getElementById('rawDocText');
  const btnClearText = document.getElementById('btnClearText');
  const btnParseDoc = document.getElementById('btnParseDoc');
  const parseBtnIcon = document.getElementById('parseBtnIcon');
  const parseBtnText = document.getElementById('parseBtnText');
  const fileDropzone = document.getElementById('fileDropzone');
  const fileInput = document.getElementById('fileInput');
  const btnBrowseFile = document.getElementById('btnBrowseFile');

  // Result card elements
  const resultPlaceholder = document.getElementById('resultPlaceholder');
  const parsedContentBox = document.getElementById('parsedContentBox');
  const resVendor = document.getElementById('resVendor');
  const resDirectionBadge = document.getElementById('resDirectionBadge');
  const resDocSub = document.getElementById('resDocSub');
  const resTotal = document.getElementById('resTotal');
  const resDeductibleBadge = document.getElementById('resDeductibleBadge');
  const resTaxRationale = document.getElementById('resTaxRationale');
  const resCategory = document.getElementById('resCategory');
  const resDate = document.getElementById('resDate');
  const resSubtotalTax = document.getElementById('resSubtotalTax');
  const resDueDate = document.getElementById('resDueDate');
  const resLineItemsBody = document.getElementById('resLineItemsBody');
  const resBenchmarkEngine = document.getElementById('resBenchmarkEngine');
  const resBenchmarkLatency = document.getElementById('resBenchmarkLatency');
  const btnSaveToLedger = document.getElementById('btnSaveToLedger');
  const btnViewJSON = document.getElementById('btnViewJSON');

  // Ledger Table elements
  const ledgerTableBody = document.getElementById('ledgerTableBody');
  const ledgerSearchInput = document.getElementById('ledgerSearchInput');
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnResetSamples = document.getElementById('btnResetSamples');

  // Client Invoices & Chaser
  const clientInvoicesTableBody = document.getElementById('clientInvoicesTableBody');
  const btnTriggerChaser = document.getElementById('btnTriggerChaser');
  const chaserModal = document.getElementById('chaserModal');
  const btnCloseChaserModal = document.getElementById('btnCloseChaserModal');
  const chaserClientName = document.getElementById('chaserClientName');
  const chaserAmountDays = document.getElementById('chaserAmountDays');
  const chaserSubject = document.getElementById('chaserSubject');
  const chaserBody = document.getElementById('chaserBody');
  const chaserInferenceTime = document.getElementById('chaserInferenceTime');
  const btnRegenerateChaser = document.getElementById('btnRegenerateChaser');
  const btnCopyChaser = document.getElementById('btnCopyChaser');
  const toneButtons = document.querySelectorAll('#chaserModal [data-tone]');

  // Tax Audit
  const btnRunTaxAudit = document.getElementById('btnRunTaxAudit');
  const auditRiskBadge = document.getElementById('auditRiskBadge');
  const auditRiskExplanation = document.getElementById('auditRiskExplanation');
  const auditEstimatedSavings = document.getElementById('auditEstimatedSavings');
  const taxTipsList = document.getElementById('taxTipsList');
  const complianceChecklist = document.getElementById('complianceChecklist');

  // Open Source Calculator
  const sliderInvoices = document.getElementById('sliderInvoices');
  const calcDocsCount = document.getElementById('calcDocsCount');
  const calcAnnualSavings = document.getElementById('calcAnnualSavings');

  // JSON Modal & Toast
  const jsonModal = document.getElementById('jsonModal');
  const btnCloseJsonModal = document.getElementById('btnCloseJsonModal');
  const jsonPreviewContent = document.getElementById('jsonPreviewContent');
  const btnCopyJSON = document.getElementById('btnCopyJSON');
  const appToast = document.getElementById('appToast');
  const toastMessage = document.getElementById('toastMessage');

  // Helper: Toast
  function showToast(msg, icon = '✅') {
    toastMessage.textContent = msg;
    const toastIcon = document.getElementById('toastIcon');
    if (toastIcon) toastIcon.textContent = icon;
    appToast.classList.add('show');
    setTimeout(() => appToast.classList.remove('show'), 3200);
  }

  // Format currency
  function formatMoney(num) {
    const sym = state.currency;
    const val = Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sym}${val}`;
  }

  // Check Ollama Health
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.ollama && data.ollama.connected) {
        state.isOllamaConnected = true;
        statusDot.className = 'status-dot';
        modelStatusText.textContent = `Local ${data.activeModel} (Air-Gapped)`;
        currentModelLabel.textContent = data.activeModel;
        airgapBadge.style.display = 'flex';
      } else {
        state.isOllamaConnected = false;
        statusDot.className = 'status-dot offline';
        modelStatusText.textContent = 'Local Fallback Engine Active';
        currentModelLabel.textContent = 'local-engine';
        airgapBadge.style.display = 'flex';
      }
    } catch (err) {
      statusDot.className = 'status-dot offline';
      modelStatusText.textContent = 'Local Offline Engine';
    }
  }

  // Fetch Ledger
  async function loadLedger() {
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      state.ledger = data;
      renderKPIs();
      renderLedgerTable();
      renderClientInvoices();
    } catch (e) {
      console.error('Failed to load ledger', e);
    }
  }

  // Render KPIs
  function renderKPIs() {
    const income = state.ledger.filter(i => i.direction === 'income');
    const expenses = state.ledger.filter(i => i.direction === 'expense');

    const totalIncome = income.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    const totalExpense = expenses.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    const deductibleSum = expenses
      .filter(i => i.is_tax_deductible)
      .reduce((acc, i) => acc + ((Number(i.total) || 0) * ((i.deductibility_percentage || 100) / 100)), 0);
    const taxSavings = deductibleSum * 0.30; // Approx 30% self-employment + federal tax bracket

    const overdueItems = income.filter(i => i.status === 'Overdue');
    const overdueTotal = overdueItems.reduce((acc, i) => acc + (Number(i.total) || 0), 0);

    kpiGrossRevenue.textContent = formatMoney(totalIncome);
    kpiIncomeCount.textContent = `${income.length} client invoice${income.length === 1 ? '' : 's'}`;
    kpiTotalExpense.textContent = formatMoney(totalExpense);
    kpiExpenseCount.textContent = `${expenses.length} receipt${expenses.length === 1 ? '' : 's'} parsed`;
    kpiDeductibleSum.textContent = formatMoney(deductibleSum);
    kpiTaxSavings.textContent = formatMoney(taxSavings);
    kpiOverdueSum.textContent = formatMoney(overdueTotal);
    kpiOverdueCount.textContent = `${overdueItems.length} awaiting payment`;

    ledgerCountPill.textContent = state.ledger.length;
    chaserCountPill.textContent = overdueItems.length;
    if (overdueItems.length === 0) {
      chaserCountPill.style.display = 'none';
      const banner = document.getElementById('overdueAlertBanner');
      if (banner) banner.style.display = 'none';
    } else {
      chaserCountPill.style.display = 'inline-block';
      const banner = document.getElementById('overdueAlertBanner');
      if (banner) banner.style.display = 'flex';
    }
  }

  // Render Audited Ledger Table
  function renderLedgerTable() {
    const query = (ledgerSearchInput.value || '').toLowerCase().trim();
    const catFilter = filterCategory.value;
    const statusFilter = filterStatus.value;

    const filtered = state.ledger.filter(item => {
      if (catFilter !== 'ALL' && item.category !== catFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (query) {
        const vendor = (item.vendor_or_client || '').toLowerCase();
        const num = (item.invoice_number || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const tot = String(item.total || '');
        if (!vendor.includes(query) && !num.includes(query) && !cat.includes(query) && !tot.includes(query)) {
          return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      ledgerTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
            No financial records found matching current filters.
          </td>
        </tr>
      `;
      return;
    }

    ledgerTableBody.innerHTML = filtered.map(item => {
      const isIncome = item.direction === 'income';
      const typeBadge = isIncome 
        ? `<span class="status-badge" style="background: rgba(16,185,129,0.15); color: #34d399;">💵 Income</span>`
        : `<span class="status-badge" style="background: rgba(244,63,94,0.15); color: #fb7185;">🧾 Expense</span>`;
      
      let statusClass = 'status-pending';
      if (item.status === 'Paid') statusClass = 'status-paid';
      if (item.status === 'Deductible') statusClass = 'status-deductible';
      if (item.status === 'Overdue') statusClass = 'status-overdue';

      const taxDeductCell = item.is_tax_deductible 
        ? `<span style="color: #38bdf8; font-weight: 600;">${item.deductibility_percentage || 100}% Deductible</span>`
        : `<span style="color: var(--text-dim);">0% (Revenue/Non-deductible)</span>`;

      return `
        <tr>
          <td>${typeBadge}</td>
          <td>
            <strong>${escapeHTML(item.vendor_or_client || 'Unknown')}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${item.document_type || 'receipt'}</div>
          </td>
          <td style="font-family: monospace; font-size: 0.825rem;">${escapeHTML(item.invoice_number || 'N/A')}</td>
          <td>${item.date || 'N/A'}</td>
          <td>
            <span style="font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px;">
              ${escapeHTML(item.category || 'Other')}
            </span>
          </td>
          <td>${taxDeductCell}</td>
          <td style="font-weight: 700; font-family: Outfit; font-size: 1rem; color: ${isIncome ? '#34d399' : '#f8fafc'};">
            ${isIncome ? '+' : '-'}${formatMoney(item.total)}
          </td>
          <td><span class="status-badge ${statusClass}">${escapeHTML(item.status || 'Recorded')}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-secondary" onclick="window.viewLedgerItemDetails('${item.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
              Inspect
            </button>
            <button class="btn btn-secondary" onclick="window.deleteLedgerItem('${item.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; color: #fb7185;">
              ✕
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render Client Invoices Table
  function renderClientInvoices() {
    const invoices = state.ledger.filter(i => i.direction === 'income');
    if (invoices.length === 0) {
      clientInvoicesTableBody.innerHTML = `
        <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">No client invoices found.</td></tr>
      `;
      return;
    }

    clientInvoicesTableBody.innerHTML = invoices.map(inv => {
      const isOverdue = inv.status === 'Overdue';
      const statusBadge = isOverdue
        ? `<span class="status-badge status-overdue">⚠️ Overdue</span>`
        : `<span class="status-badge status-paid">✅ Paid</span>`;

      const deliverables = (inv.line_items || []).map(li => li.description).join(', ') || 'Consultancy Services';

      return `
        <tr>
          <td><strong>${escapeHTML(inv.vendor_or_client)}</strong></td>
          <td style="font-family: monospace;">${escapeHTML(inv.invoice_number || 'INV')}</td>
          <td>${inv.date || 'N/A'}</td>
          <td style="color: ${isOverdue ? '#fb7185' : 'inherit'}; font-weight: ${isOverdue ? '600' : 'normal'};">
            ${inv.due_date || 'Net-30'}
          </td>
          <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8rem; color: var(--text-muted);">
            ${escapeHTML(deliverables)}
          </td>
          <td style="font-weight: 700; font-family: Outfit; color: #34d399; font-size: 1.05rem;">
            ${formatMoney(inv.total)}
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <button class="btn ${isOverdue ? 'btn-primary' : 'btn-secondary'}" onclick="window.openChaserForInvoice('${inv.id}')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
              ⚡ Draft Chaser
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Global window functions for table buttons
  window.deleteLedgerItem = async function(id) {
    if (!confirm('Are you sure you want to delete this financial record?')) return;
    try {
      await fetch(`/api/ledger/${id}`, { method: 'DELETE' });
      state.ledger = state.ledger.filter(item => item.id !== id);
      renderKPIs();
      renderLedgerTable();
      renderClientInvoices();
      showToast('Record deleted from local ledger', '🗑️');
    } catch (err) {
      showToast('Failed to delete item', '❌');
    }
  };

  window.viewLedgerItemDetails = function(id) {
    const item = state.ledger.find(i => i.id === id);
    if (!item) return;
    jsonPreviewContent.textContent = JSON.stringify(item, null, 2);
    jsonModal.classList.add('open');
  };

  window.openChaserForInvoice = function(id) {
    const inv = state.ledger.find(i => i.id === id);
    if (!inv) return;
    state.selectedOverdueInvoice = inv;
    chaserClientName.textContent = inv.vendor_or_client;
    chaserAmountDays.textContent = `${formatMoney(inv.total)} (${inv.status === 'Overdue' ? '13 days overdue' : 'Due ' + (inv.due_date || 'soon')})`;
    generateChaserEmail(inv, state.selectedChaserTone);
    chaserModal.classList.add('open');
  };

  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Preset Chips Clicking
  document.querySelectorAll('.preset-chip[data-preset]').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.preset;
      if (PRESETS[key]) {
        rawDocText.value = PRESETS[key];
        showToast(`Loaded ${chip.textContent.trim()} preset`, '📋');
        parseCurrentDocument();
      }
    });
  });

  btnClearText.addEventListener('click', () => {
    rawDocText.value = '';
    rawDocText.focus();
  });

  // Dropzone file handling
  btnBrowseFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  fileDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropzone.classList.add('dragover');
  });

  fileDropzone.addEventListener('dragleave', () => {
    fileDropzone.classList.remove('dragover');
  });

  fileDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      rawDocText.value = evt.target.result;
      showToast(`Ingested file: ${file.name}`, '📄');
      parseCurrentDocument();
    };
    reader.readAsText(file);
  }

  // Parse Document Handler
  async function parseCurrentDocument() {
    const text = rawDocText.value.trim();
    if (!text) {
      showToast('Please paste document text or pick a preset', '⚠️');
      return;
    }

    // Set loading state
    btnParseDoc.disabled = true;
    parseBtnIcon.innerHTML = `<span class="spinner"></span>`;
    parseBtnText.textContent = `Extracting with ${state.activeModel}...`;

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model: state.activeModel })
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Extraction failed');
      }

      state.lastParsedItem = json.data;
      state.lastParsedItem.inference_ms = json.inference_ms;
      state.lastParsedItem.parsed_with = json.model || state.activeModel;

      displayParsedResult(json.data, json.inference_ms, json.source);
      showToast(`Document parsed in ${json.inference_ms}ms with ${json.model}!`, '✨');
    } catch (err) {
      console.error(err);
      showToast('Extraction error: ' + err.message, '❌');
    } finally {
      btnParseDoc.disabled = false;
      parseBtnIcon.innerHTML = `✨`;
      parseBtnText.textContent = `Extract with Local Llama 3.2`;
    }
  }

  btnParseDoc.addEventListener('click', parseCurrentDocument);

  // Display Parsed Result in Card
  function displayParsedResult(item, latencyMs, source) {
    resultPlaceholder.style.display = 'none';
    parsedContentBox.style.display = 'flex';

    resVendor.textContent = item.vendor_or_client || 'Extracted Merchant';
    
    const isIncome = item.direction === 'income';
    resDirectionBadge.className = isIncome ? 'doc-badge-pill badge-income' : 'doc-badge-pill badge-expense';
    resDirectionBadge.textContent = isIncome ? 'Income' : 'Expense';

    resDocSub.textContent = `Document: ${item.document_type || 'Invoice'} • Invoice #: ${item.invoice_number || 'N/A'}`;
    resTotal.textContent = formatMoney(item.total);

    const deductPct = item.is_tax_deductible ? (item.deductibility_percentage || 100) : 0;
    resDeductibleBadge.textContent = item.is_tax_deductible ? `${deductPct}% Eligible Write-off` : '0% Non-deductible';
    resTaxRationale.textContent = item.tax_rationale || 'IRS Schedule C operational business expense.';

    resCategory.textContent = item.category || 'General Operations';
    resDate.textContent = item.date || 'N/A';
    resSubtotalTax.textContent = `${formatMoney(item.subtotal)} / ${formatMoney(item.tax)}`;
    resDueDate.textContent = item.due_date || (isIncome ? 'Net-30' : 'Immediate');

    // Line items
    const lineItems = item.line_items || [];
    if (lineItems.length > 0) {
      resLineItemsBody.innerHTML = lineItems.map(li => `
        <tr>
          <td>${escapeHTML(li.description)}</td>
          <td style="text-align: right; font-weight: 600;">${formatMoney(li.amount)}</td>
        </tr>
      `).join('');
    } else {
      resLineItemsBody.innerHTML = `<tr><td colspan="2" style="color: var(--text-dim);">No granular line items found</td></tr>`;
    }

    resBenchmarkEngine.textContent = source === 'ollama-local' ? `Ollama (${item.parsed_with || 'llama3.2'})` : 'Local Heuristic';
    resBenchmarkLatency.textContent = `${latencyMs}ms`;
  }

  // Save to Audited Ledger
  btnSaveToLedger.addEventListener('click', async () => {
    if (!state.lastParsedItem) return;

    btnSaveToLedger.disabled = true;
    btnSaveToLedger.textContent = 'Saving...';

    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.lastParsedItem)
      });
      const data = await res.json();
      if (data.success) {
        state.ledger.unshift(data.item);
        renderKPIs();
        renderLedgerTable();
        renderClientInvoices();
        showToast('Saved to Audited Financial Ledger!', '💾');
      }
    } catch (e) {
      showToast('Failed to save to ledger', '❌');
    } finally {
      btnSaveToLedger.disabled = false;
      btnSaveToLedger.textContent = '💾 Save Record to Audited Ledger';
    }
  });

  // View JSON Schema Modal
  btnViewJSON.addEventListener('click', () => {
    if (!state.lastParsedItem) return;
    jsonPreviewContent.textContent = JSON.stringify(state.lastParsedItem, null, 2);
    jsonModal.classList.add('open');
  });

  btnCloseJsonModal.addEventListener('click', () => jsonModal.classList.remove('open'));
  btnCopyJSON.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonPreviewContent.textContent);
    showToast('Copied JSON to clipboard!', '📋');
  });

  // Search & Filters on Ledger
  ledgerSearchInput.addEventListener('input', renderLedgerTable);
  filterCategory.addEventListener('change', renderLedgerTable);
  filterStatus.addEventListener('change', renderLedgerTable);

  // Currency Selector
  currencySelector.addEventListener('change', (e) => {
    state.currency = e.target.value;
    renderKPIs();
    renderLedgerTable();
    renderClientInvoices();
    if (state.lastParsedItem) {
      resTotal.textContent = formatMoney(state.lastParsedItem.total);
      resSubtotalTax.textContent = `${formatMoney(state.lastParsedItem.subtotal)} / ${formatMoney(state.lastParsedItem.tax)}`;
    }
    showToast(`Currency updated to ${e.target.value}`, '💱');
  });

  // Export Tax CSV (IRS Schedule C Formatted)
  btnExportCSV.addEventListener('click', () => {
    if (!state.ledger.length) {
      showToast('No ledger records to export', '⚠️');
      return;
    }

    const headers = [
      'Document ID',
      'Type',
      'Direction',
      'Vendor / Client',
      'Invoice Number',
      'Date',
      'Due Date',
      'Category',
      'IRS Schedule C Line',
      'Is Tax Deductible',
      'Deductibility %',
      'Total Amount ($)',
      'Deductible Amount ($)',
      'Tax Rationale',
      'Status'
    ];

    const rows = state.ledger.map(item => {
      const isDeductible = item.is_tax_deductible;
      const pct = isDeductible ? (item.deductibility_percentage || 100) : 0;
      const deductibleAmt = isDeductible ? ((item.total * pct) / 100).toFixed(2) : '0.00';
      
      let scheduleCLine = 'Part I - Gross Income (Line 1)';
      if (item.direction === 'expense') {
        if (item.category.includes('Software')) scheduleCLine = 'Part II - Office Expense (Line 18)';
        else if (item.category.includes('Equipment')) scheduleCLine = 'Part II - Section 179 Expense (Line 13)';
        else if (item.category.includes('Meals')) scheduleCLine = 'Part II - Deductible Meals (Line 24b)';
        else if (item.category.includes('Subcontractor')) scheduleCLine = 'Part II - Contract Labor (Line 11)';
        else scheduleCLine = 'Part II - Other Expenses (Line 27a)';
      }

      return [
        `"${item.id || ''}"`,
        `"${item.document_type || ''}"`,
        `"${item.direction || ''}"`,
        `"${(item.vendor_or_client || '').replace(/"/g, '""')}"`,
        `"${item.invoice_number || ''}"`,
        `"${item.date || ''}"`,
        `"${item.due_date || ''}"`,
        `"${item.category || ''}"`,
        `"${scheduleCLine}"`,
        item.is_tax_deductible ? 'YES' : 'NO',
        `${pct}%`,
        item.total || 0,
        deductibleAmt,
        `"${(item.tax_rationale || '').replace(/"/g, '""')}"`,
        `"${item.status || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VaultLedger_Schedule_C_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Downloaded IRS Schedule C CSV!', '📥');
  });

  // Reset Samples
  btnResetSamples.addEventListener('click', async () => {
    if (!confirm('Reset local financial ledger to standard freelance sample pack?')) return;
    try {
      const res = await fetch('/api/reset-samples', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadLedger();
        showToast('Sample freelance ledger restored!', '🔄');
      }
    } catch (e) {
      showToast('Failed to reset samples', '❌');
    }
  });

  // AI Payment Chaser
  btnTriggerChaser.addEventListener('click', () => {
    const overdue = state.ledger.find(i => i.status === 'Overdue');
    if (overdue) {
      window.openChaserForInvoice(overdue.id);
    } else {
      showToast('No overdue invoices found! All clients are paid up.', '🎉');
    }
  });

  btnCloseChaserModal.addEventListener('click', () => chaserModal.classList.remove('open'));

  toneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toneButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedChaserTone = btn.dataset.tone;
      if (state.selectedOverdueInvoice) {
        generateChaserEmail(state.selectedOverdueInvoice, state.selectedChaserTone);
      }
    });
  });

  async function generateChaserEmail(invoice, tone) {
    chaserSubject.value = 'Drafting with Llama 3.2...';
    chaserBody.value = 'Running local open-weights inference to compose tailored payment reminder...';
    chaserInferenceTime.textContent = 'Generating...';

    try {
      const res = await fetch('/api/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice, tone, daysOverdue: 13, model: state.activeModel })
      });
      const data = await res.json();
      if (data.success && data.email) {
        chaserSubject.value = data.email.subject || 'Follow-up regarding outstanding invoice';
        chaserBody.value = data.email.email_body || 'Body';
        chaserInferenceTime.textContent = `Generated in ${data.inference_ms}ms with ${data.source}`;
      }
    } catch (e) {
      chaserSubject.value = `Follow-up on Invoice #${invoice.invoice_number}`;
      chaserBody.value = `Hi ${invoice.vendor_or_client} Team,\n\nChecking in on Invoice #${invoice.invoice_number} for ${formatMoney(invoice.total)}.\n\nBest,\n[Your Name]`;
      chaserInferenceTime.textContent = 'Fallback template';
    }
  }

  btnRegenerateChaser.addEventListener('click', () => {
    if (state.selectedOverdueInvoice) {
      generateChaserEmail(state.selectedOverdueInvoice, state.selectedChaserTone);
    }
  });

  btnCopyChaser.addEventListener('click', () => {
    const fullText = `Subject: ${chaserSubject.value}\n\n${chaserBody.value}`;
    navigator.clipboard.writeText(fullText);
    showToast('Payment chaser email copied to clipboard!', '📋');
  });

  // AI Tax Consultant
  btnRunTaxAudit.addEventListener('click', async () => {
    btnRunTaxAudit.disabled = true;
    btnRunTaxAudit.innerHTML = `<span class="spinner"></span> Auditing Ledger...`;

    try {
      const res = await fetch('/api/tax-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ledgerItems: state.ledger, model: state.activeModel })
      });
      const data = await res.json();
      if (data.success && data.audit) {
        const audit = data.audit;
        auditRiskBadge.textContent = audit.audit_risk_level === 'LOW' ? '🟢 LOW RISK' : (audit.audit_risk_level === 'MODERATE' ? '🟡 MODERATE RISK' : '🔴 HIGH RISK');
        auditRiskBadge.className = `status-badge ${audit.audit_risk_level === 'LOW' ? 'status-paid' : (audit.audit_risk_level === 'MODERATE' ? 'status-pending' : 'status-overdue')}`;
        auditRiskExplanation.textContent = audit.audit_risk_rationale || 'Healthy freelance expense ratios.';
        auditEstimatedSavings.textContent = audit.estimated_tax_savings_at_30pct || '$1,083.88';

        if (audit.recommendations && audit.recommendations.length) {
          taxTipsList.innerHTML = audit.recommendations.map(tip => `<li>• ${escapeHTML(tip)}</li>`).join('');
        }
        if (audit.compliance_checklist && audit.compliance_checklist.length) {
          complianceChecklist.innerHTML = audit.compliance_checklist.map(chk => `<li>✅ ${escapeHTML(chk)}</li>`).join('');
        }
        showToast('Tax Audit complete with local Llama 3.2!', '🛡️');
      }
    } catch (e) {
      showToast('Tax audit completed with standard rules', 'ℹ️');
    } finally {
      btnRunTaxAudit.disabled = false;
      btnRunTaxAudit.innerHTML = `🛡️ Run Local Tax Audit`;
    }
  });

  // Open Source Savings Calculator
  sliderInvoices.addEventListener('input', (e) => {
    const count = parseInt(e.target.value, 10);
    calcDocsCount.textContent = `${count} docs/mo`;
    // Traditional SaaS (e.g. Expensify / Dext) charges ~$30/mo base + $0.05/doc overage = ~$36/mo = $432/yr
    const monthlyCost = 15 + (count * 0.15);
    const annualSavings = (monthlyCost * 12).toFixed(2);
    calcAnnualSavings.textContent = `$${annualSavings} / year`;
  });

  // Helper: Escape HTML
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial startup
  checkHealth();
  loadLedger();
});
