const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || '127.0.0.1';
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;
const DEFAULT_MODEL = 'llama3.2:latest';

const DATA_FILE = path.join(__dirname, 'data', 'ledger.json');

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to query Ollama HTTP API
function callOllama(endpoint, payload, timeoutMs = 65000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: timeoutMs
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse Ollama response: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

function checkOllamaHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/tags',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({
            connected: true,
            models: data.models || [],
            hasDefaultModel: (data.models || []).some(m => m.name.includes('llama3.2'))
          });
        } catch (e) {
          resolve({ connected: false, error: 'Invalid JSON from Ollama', models: [] });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ connected: false, error: 'Connection timed out', models: [] });
    });

    req.on('error', (err) => {
      resolve({ connected: false, error: err.message, models: [] });
    });

    req.end();
  });
}

// Fallback rule-based extractor if Ollama is paused/busy
function fallbackExtract(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  let docType = 'receipt';
  let direction = 'expense';
  if (fullText.includes('invoice') || fullText.includes('billed to') || fullText.includes('due date')) {
    docType = 'invoice';
    if (fullText.includes('payable to me') || fullText.includes('freelance') || fullText.includes('design system') || fullText.includes('consultant')) {
      direction = 'income';
    }
  }

  // Find vendor/client
  let vendor = lines[0] || 'Unknown Merchant';
  for (let l of lines.slice(0, 4)) {
    if (!l.match(/invoice|receipt|date|bill|due|order|tax/i) && l.length > 2) {
      vendor = l;
      break;
    }
  }

  // Find numbers for total
  const amounts = [];
  const regexAmount = /\$?\s?([0-9]{1,4}(?:,[0-9]{3})*(?:\.[0-9]{2}))/g;
  let match;
  while ((match = regexAmount.exec(text)) !== null) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) amounts.push(num);
  }
  const total = amounts.length > 0 ? Math.max(...amounts) : 0.00;
  const subtotal = amounts.length > 1 ? amounts[amounts.length - 2] : total;
  const tax = total > subtotal ? Number((total - subtotal).toFixed(2)) : 0.00;

  // Date detection
  const dateMatch = text.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\w+ \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const dateStr = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];

  // Category
  let category = 'Other';
  let isDeductible = true;
  let deductPct = 100;
  let rationale = 'General operational expense.';

  if (fullText.includes('aws') || fullText.includes('cloud') || fullText.includes('hosting') || fullText.includes('github') || fullText.includes('figma') || fullText.includes('software')) {
    category = 'Software & Cloud';
    rationale = 'Essential software/cloud infrastructure for digital freelance operations.';
  } else if (fullText.includes('macbook') || fullText.includes('laptop') || fullText.includes('monitor') || fullText.includes('apple') || fullText.includes('hardware')) {
    category = 'Equipment & Hardware';
    rationale = 'Computer and peripheral equipment depreciable or eligible for Section 179 deduction.';
  } else if (fullText.includes('lunch') || fullText.includes('dinner') || fullText.includes('bistro') || fullText.includes('coffee') || fullText.includes('cafe')) {
    category = 'Meals & Entertainment';
    deductPct = 50;
    rationale = 'Client business meals qualify for 50% IRS deduction under current tax rules.';
  } else if (fullText.includes('uber') || fullText.includes('flight') || fullText.includes('airline') || fullText.includes('hotel') || fullText.includes('lyft')) {
    category = 'Travel & Transport';
    rationale = 'Business travel to client on-sites or industry conferences.';
  } else if (direction === 'income') {
    category = 'Client Invoicing';
    isDeductible = false;
    deductPct = 0;
    rationale = 'Client billable revenue (Schedule C Gross Receipts).';
  }

  return {
    vendor_or_client: vendor,
    document_type: docType,
    direction: direction,
    invoice_number: 'INV-' + Math.floor(1000 + Math.random() * 9000),
    date: dateStr,
    due_date: null,
    currency: '$',
    subtotal: subtotal,
    tax: tax,
    total: total,
    category: category,
    status: isDeductible ? 'Deductible' : (direction === 'income' ? 'Pending' : 'Recorded'),
    is_tax_deductible: isDeductible,
    deductibility_percentage: deductPct,
    tax_rationale: rationale,
    line_items: [
      { description: vendor + ' services or goods', amount: total }
    ]
  };
}

// Routes

// 1. Health & Model check
app.get('/api/health', async (req, res) => {
  const health = await checkOllamaHealth();
  res.json({
    app: 'VaultLedger AI',
    version: '1.0.0',
    mode: 'air-gapped-local',
    ollama: health,
    activeModel: DEFAULT_MODEL
  });
});

// 2. Parse Invoice / Receipt using Ollama
app.post('/api/parse', async (req, res) => {
  const { text, model = DEFAULT_MODEL } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const prompt = `You are VaultLedger AI, a strict financial auditor and invoice/receipt parser for self-employed freelancers and solo entrepreneurs.
Analyze the provided document text and extract accurate financial details according to IRS Schedule C tax accounting rules.
Return ONLY a valid JSON object matching the schema below. No markdown backticks, no comments, no intro or outro text.

Schema:
{
  "vendor_or_client": "Exact company or client name",
  "document_type": "invoice" | "receipt" | "bill",
  "direction": "expense" | "income",
  "invoice_number": "string or null",
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "currency": "$",
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "category": "Software & Cloud" | "Equipment & Hardware" | "Office Supplies" | "Meals & Entertainment" | "Travel & Transport" | "Subcontractors" | "Advertising & Marketing" | "Client Invoicing" | "Other",
  "is_tax_deductible": true or false,
  "deductibility_percentage": 100 or 50 or 0,
  "tax_rationale": "Clear, specific justification of why this is or is not an eligible tax write-off under IRS Schedule C",
  "line_items": [
    { "description": "Short line item description", "amount": 0.00 }
  ]
}

Document:
${text}`;

  const startTime = Date.now();
  try {
    const ollamaResponse = await callOllama('/api/generate', {
      model: model,
      prompt: prompt,
      format: 'json',
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 350
      }
    }, 60000);

    const latency = Date.now() - startTime;
    let parsedData;
    try {
      parsedData = JSON.parse(ollamaResponse.response);
    } catch (err) {
      // Clean up common Ollama JSON wrapping
      const cleaned = ollamaResponse.response
        .replace(/^```json\s*/, '')
        .replace(/```$/, '')
        .trim();
      parsedData = JSON.parse(cleaned);
    }

    // Ensure status field
    if (!parsedData.status) {
      parsedData.status = parsedData.direction === 'income' ? 'Pending' : (parsedData.is_tax_deductible ? 'Deductible' : 'Standard');
    }

    return res.json({
      success: true,
      source: 'ollama-local',
      model: model,
      inference_ms: latency,
      data: parsedData
    });
  } catch (error) {
    console.warn('Ollama local parse failed or timed out, using fallback parser:', error.message);
    const latency = Date.now() - startTime;
    const fallbackData = fallbackExtract(text);
    return res.json({
      success: true,
      source: 'rule-engine-fallback',
      model: 'deterministic-fallback',
      inference_ms: latency,
      data: fallbackData,
      note: 'Processed via local fallback engine. Ollama connection: ' + error.message
    });
  }
});

// 3. Draft Overdue Payment Follow-Up Email
app.post('/api/draft-email', async (req, res) => {
  const { invoice, tone = 'gentle', daysOverdue = 14, model = DEFAULT_MODEL } = req.body;

  const prompt = `You are an expert freelance business advocate. Write a polite, effective, professional payment follow-up email from a freelancer to a client for an overdue invoice.
Details:
- Client / Company Name: ${invoice.vendor_or_client || 'Client'}
- Invoice #: ${invoice.invoice_number || 'INV-PENDING'}
- Amount Due: ${invoice.currency || '$'}${invoice.total || '0.00'}
- Date Issued: ${invoice.date || 'Recent'}
- Due Date: ${invoice.due_date || 'Past Due'}
- Days Overdue: ${daysOverdue} days
- Tone: ${tone} (Options: gentle reminder, professional follow-up, firm final notice)

Return ONLY a JSON object with this schema:
{
  "subject": "Clear email subject line",
  "email_body": "Complete email text formatted with salutation, body paragraphs, and professional sign-off placeholder"
}`;

  const startTime = Date.now();
  try {
    const ollamaResponse = await callOllama('/api/generate', {
      model: model,
      prompt: prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0.3 }
    }, 30000);

    const latency = Date.now() - startTime;
    let result;
    try {
      result = JSON.parse(ollamaResponse.response);
    } catch (e) {
      const cleaned = ollamaResponse.response.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      result = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      inference_ms: latency,
      source: 'ollama-local',
      email: result
    });
  } catch (error) {
    // Intelligent fallback email template
    const fallbackTemplates = {
      gentle: {
        subject: `Friendly reminder: Invoice #${invoice.invoice_number || 'INV'} for ${invoice.vendor_or_client}`,
        email_body: `Hi team at ${invoice.vendor_or_client},\n\nI hope you're having a productive week! Just checking in regarding Invoice #${invoice.invoice_number || 'INV'} for ${invoice.currency || '$'}${invoice.total || '0.00'}, which was due on ${invoice.due_date || 'recently'}.\n\nPlease let me know if you need any additional billing documentation or if this is already queued for your next payment cycle.\n\nThank you for the great collaboration!\n\nBest regards,\n[Your Name]`
      },
      formal: {
        subject: `Follow-up: Overdue Payment for Invoice #${invoice.invoice_number || 'INV'}`,
        email_body: `Dear Accounts Payable at ${invoice.vendor_or_client},\n\nThis is a formal follow-up regarding outstanding Invoice #${invoice.invoice_number || 'INV'} in the amount of ${invoice.currency || '$'}${invoice.total || '0.00'}. According to our records, this invoice is now ${daysOverdue} days overdue.\n\nCould you please confirm the scheduled release date for this payment? If there are any discrepancies with the deliverables, please let me know right away.\n\nWarm regards,\n[Your Name]`
      },
      firm: {
        subject: `URGENT: Past Due Notice for Invoice #${invoice.invoice_number || 'INV'}`,
        email_body: `Dear ${invoice.vendor_or_client} Leadership,\n\nI am writing to request immediate attention to Invoice #${invoice.invoice_number || 'INV'} totaling ${invoice.currency || '$'}${invoice.total || '0.00'}, which is now ${daysOverdue} days past the agreed payment terms.\n\nPlease arrange for settlement within the next 48 hours to avoid suspension of ongoing services and deliverables transfer.\n\nSincerely,\n[Your Name]`
      }
    };

    res.json({
      success: true,
      inference_ms: Date.now() - startTime,
      source: 'fallback-template',
      email: fallbackTemplates[tone] || fallbackTemplates.formal
    });
  }
});

// 4. Financial Audit & Tax Recommendation Engine
app.post('/api/tax-audit', async (req, res) => {
  const { ledgerItems, model = DEFAULT_MODEL } = req.body;
  if (!ledgerItems || !ledgerItems.length) {
    return res.status(400).json({ error: 'No ledger items provided' });
  }

  const expenses = ledgerItems.filter(i => i.direction === 'expense');
  const income = ledgerItems.filter(i => i.direction === 'income');
  const totalExpense = expenses.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const totalIncome = income.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const deductibleSum = expenses
    .filter(i => i.is_tax_deductible)
    .reduce((acc, i) => acc + ((Number(i.total) || 0) * ((i.deductibility_percentage || 100) / 100)), 0);

  const summary = `Freelance Financial Summary:
- Total Gross Invoiced: $${totalIncome.toFixed(2)}
- Total Raw Expenses: $${totalExpense.toFixed(2)}
- Identified Tax-Deductible Write-offs: $${deductibleSum.toFixed(2)}
- Categories: ${[...new Set(expenses.map(e => e.category))].join(', ')}
- Sample Items: ${expenses.slice(0, 8).map(e => `${e.vendor_or_client} ($${e.total}, ${e.category})`).join('; ')}`;

  const prompt = `You are VaultLedger's Senior Tax Consultant AI for freelancers.
Analyze the following freelance financial summary and provide actionable tax write-off recommendations, audit risk flags, and potential missed deductions under IRS Schedule C.
Return ONLY valid JSON:
{
  "audit_risk_level": "LOW" | "MODERATE" | "HIGH",
  "audit_risk_rationale": "Short explanation of audit flags",
  "estimated_tax_savings_at_30pct": "$XX.XX",
  "recommendations": [
    "Specific write-off tip 1",
    "Specific write-off tip 2",
    "Specific write-off tip 3"
  ],
  "compliance_checklist": [
    "Item to verify for audit proof",
    "Receipt retention advice"
  ]
}

Summary:
${summary}`;

  try {
    const ollamaResponse = await callOllama('/api/generate', {
      model: model,
      prompt: prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0.2 }
    }, 25000);

    let parsed;
    try {
      parsed = JSON.parse(ollamaResponse.response);
    } catch (e) {
      const cleaned = ollamaResponse.response.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({ success: true, source: 'ollama-local', audit: parsed });
  } catch (err) {
    const estSavings = (deductibleSum * 0.30).toFixed(2);
    res.json({
      success: true,
      source: 'heuristic-audit',
      audit: {
        audit_risk_level: deductibleSum > totalIncome * 0.8 ? 'MODERATE' : 'LOW',
        audit_risk_rationale: 'Expenses are within typical freelance consulting benchmarks. Ensure 50% rule is applied on meals.',
        estimated_tax_savings_at_30pct: `$${estSavings}`,
        recommendations: [
          'Section 179 allows 100% first-year deduction for qualifying computer hardware (MacBooks, monitors).',
          'Document client names and business discussion topics on meal receipts to satisfy IRS substantiation.',
          'Consider home office deduction (simplified $5/sq ft) if maintaining a dedicated workspace.'
        ],
        compliance_checklist: [
          'Retain digital receipts for all expenses over $75 for 3 years.',
          'Issue 1099-NEC for contractors paid over $600 during the tax year.'
        ]
      }
    });
  }
});

// 5. Ledger Data CRUD
app.get('/api/ledger', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read ledger: ' + e.message });
  }
});

app.post('/api/ledger', (req, res) => {
  try {
    const newItem = req.body;
    if (!newItem.id) {
      newItem.id = 'rec_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }
    let data = [];
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    data.unshift(newItem);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, item: newItem });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save item: ' + e.message });
  }
});

app.delete('/api/ledger/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!fs.existsSync(DATA_FILE)) return res.json({ success: true });
    let data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data = data.filter(item => item.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete item: ' + e.message });
  }
});

app.post('/api/reset-samples', (req, res) => {
  try {
    const initialSamples = [
      {
        id: "rec_001",
        document_type: "invoice",
        direction: "income",
        vendor_or_client: "Starlight Studios LLC",
        invoice_number: "INV-2024-104",
        date: "2024-10-01",
        due_date: "2024-10-31",
        currency: "$",
        subtotal: 4200.00,
        tax: 0.00,
        total: 4200.00,
        category: "Client Invoicing",
        status: "Paid",
        is_tax_deductible: false,
        deductibility_percentage: 0,
        tax_rationale: "Gross freelance revenue from UI/UX design & design system deliverables.",
        line_items: [
          { description: "Design System Architecture (40 hrs @ $85/hr)", amount: 3400.00 },
          { description: "Interactive Figma Prototyping & Handoff", amount: 800.00 }
        ],
        parsed_with: "llama3.2:latest",
        inference_ms: 1120
      },
      {
        id: "rec_002",
        document_type: "receipt",
        direction: "expense",
        vendor_or_client: "Amazon Web Services (AWS)",
        invoice_number: "AWS-8829103",
        date: "2024-10-03",
        due_date: "2024-10-03",
        currency: "$",
        subtotal: 142.50,
        tax: 11.75,
        total: 154.25,
        category: "Software & Cloud",
        status: "Deductible",
        is_tax_deductible: true,
        deductibility_percentage: 100,
        tax_rationale: "Direct cloud infrastructure expense necessary for client application hosting and staging (Schedule C Line 18).",
        line_items: [
          { description: "AWS EC2 c6g.xlarge staging server", amount: 96.00 },
          { description: "S3 Cloud Storage & CloudFront Egress", amount: 46.50 }
        ],
        parsed_with: "llama3.2:latest",
        inference_ms: 890
      },
      {
        id: "rec_003",
        document_type: "receipt",
        direction: "expense",
        vendor_or_client: "Apple Store Fifth Ave",
        invoice_number: "APL-902184",
        date: "2024-10-05",
        due_date: "2024-10-05",
        currency: "$",
        subtotal: 1999.00,
        tax: 177.41,
        total: 2176.41,
        category: "Equipment & Hardware",
        status: "Deductible",
        is_tax_deductible: true,
        deductibility_percentage: 100,
        tax_rationale: "Qualifies for Section 179 immediate full expense deduction as essential professional computing equipment.",
        line_items: [
          { description: "MacBook Pro 14-inch M3 Pro (18GB, 512GB)", amount: 1999.00 }
        ],
        parsed_with: "llama3.2:latest",
        inference_ms: 1250
      },
      {
        id: "rec_004",
        document_type: "receipt",
        direction: "expense",
        vendor_or_client: "Bistro Verde Client Lunch",
        invoice_number: "CHK-4491",
        date: "2024-10-08",
        due_date: "2024-10-08",
        currency: "$",
        subtotal: 124.00,
        tax: 10.54,
        total: 134.54,
        category: "Meals & Entertainment",
        status: "Deductible",
        is_tax_deductible: true,
        deductibility_percentage: 50,
        tax_rationale: "Business meal with prospective client discussing Q4 retainer. Under IRS rules, business meals are 50% deductible.",
        line_items: [
          { description: "2x Executive Prix Fixe Lunch & Coffee", amount: 124.00 }
        ],
        parsed_with: "llama3.2:latest",
        inference_ms: 940
      },
      {
        id: "rec_005",
        document_type: "bill",
        direction: "expense",
        vendor_or_client: "Alex Rivera (Motion Designer)",
        invoice_number: "AR-2024-03",
        date: "2024-10-10",
        due_date: "2024-10-24",
        currency: "$",
        subtotal: 1200.00,
        tax: 0.00,
        total: 1200.00,
        category: "Subcontractors",
        status: "Deductible",
        is_tax_deductible: true,
        deductibility_percentage: 100,
        tax_rationale: "1099 contractor expense directly related to client deliverable animation. 100% tax deductible on Schedule C Line 11.",
        line_items: [
          { description: "Lottie animations for onboarding screen flow", amount: 1200.00 }
        ],
        parsed_with: "llama3.2:latest",
        inference_ms: 1050
      },
      {
        id: "rec_006",
        document_type: "invoice",
        direction: "income",
        vendor_or_client: "Apex Fintech Labs",
        invoice_number: "INV-2024-105",
        date: "2024-09-15",
        due_date: "2024-10-01",
        currency: "$",
        subtotal: 3850.00,
        tax: 0.00,
        total: 3850.00,
        category: "Client Invoicing",
        status: "Overdue",
        is_tax_deductible: false,
        deductibility_percentage: 0,
        tax_rationale: "Billed revenue currently 13 days past Net-15 term. Needs payment follow-up email.",
        line_items: [
          { description: "Fintech Dashboard Redesign & React Component Kit", amount: 3850.00 }
        ],
        parsed_with: "llama3.2:latest",
        inference_ms: 1180
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialSamples, null, 2), 'utf8');
    res.json({ success: true, count: initialSamples.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reset: ' + e.message });
  }
});

app.listen(PORT, () => {
  console.log(`VaultLedger AI server listening on http://localhost:${PORT}`);
});
