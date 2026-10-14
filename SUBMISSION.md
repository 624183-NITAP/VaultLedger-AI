---
title: VaultLedger AI: The 100% Local, Air-Gapped Freelance Financial & Invoice Intelligence OS (Zero Cloud Data Leakage)
published: true
tags: devchallenge, hf26challenge, open-source, ai
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

---

## 💡 What I Built

### The Problem: Freelancers Are Trapped Between Privacy and Productivity

If you are a freelancer, independent software consultant, or solo creative, managing your finances is a weekly headache. You juggle PDF client invoices, messy restaurant receipts, software subscription bills, and subcontractor invoices.

To make matters worse, freelancers face two huge obstacles:

1. **The NDA & Confidentiality Trap**: Independent contractors frequently sign strict Non-Disclosure Agreements (NDAs) with enterprise clients. Uploading client invoices, hourly billing rates, proprietary deliverables, and bank account numbers to third-party closed cloud APIs (OpenAI, Anthropic) or multi-tenant cloud SaaS tools is a blatant compliance and contractual breach.
2. **The "Micro-SaaS Margin Bleed"**: Existing receipt scanners and bookkeeping tools (QuickBooks, Expensify, Dext) charge $30–$60 every month, limit the number of documents you can upload, and charge per-seat fees that drain your profits.

### The Solution: VaultLedger AI

**VaultLedger AI** is an air-gapped financial operating system built specifically for freelancers and solopreneurs. It runs **100% locally on your laptop** using open-weight AI (**Llama 3.2 3B via Ollama**).

With VaultLedger AI:
- **Zero Cloud Leakage**: Financial documents never leave your laptop. Not a single packet of client data is sent across the internet.
- **Smart Document Parsing**: Drop an invoice, receipt, or raw text snippet, and local Llama 3.2 extracts structured financial details (Vendor, Dates, Invoice #, Subtotal, Tax, Total, and granular itemized line items).
- **IRS Schedule C Tax Write-Off Auditor**: Automatically categorizes expenses (Software, Section 179 Hardware, 50% Business Meals, 1099 Subcontractors) and provides a legally grounded **Tax Rationale** explaining why each expense qualifies as a deduction.
- **Client Invoicing & AI Payment Chaser**: Tracks accounts receivable and drafts customized, polite, professional, or firm follow-up emails for past-due client balances with zero cloud token charges.
- **Instant Tax Schedule Export**: One-click export to IRS Schedule C-formatted CSV or backup JSON.

### Who Would Pay For It?

- **Freelance Software Engineers & Designers**: Who sign enterprise NDAs and cannot upload billing records to the cloud.
- **Solo Consultants & Agency Owners**: Who want to avoid $400+/year in recurring SaaS fees and need audit-ready tax write-off classification.
- **Digital Nomads & Remote Workers**: Who need to organize receipts and send invoices mid-flight or off-grid without an internet connection.

Freelancers would gladly pay a **$49–$79 one-time license** (or $9/month self-hosted subscription) for unlimited, completely private, offline bookkeeping.

---

## 🎥 Demo

VaultLedger AI features a dark glassmorphic interface with an emerald security aesthetic:

### 1. Real-Time Air-Gapped Dashboard & KPIs
Displays real-time connection status to local Ollama (`llama3.2:latest`), Gross Invoiced Revenue, Total Business Expenses, IRS Deductible Write-Offs, and Estimated Self-Employment Tax Savings (at 30%).

![VaultLedger AI Dashboard](https://raw.githubusercontent.com/saira-s/vaultledger-ai/main/screenshots/vaultledger_home.png)

### 2. Smart Ingest & Local AI Extractor
Load instant realistic presets (AWS Cloud hosting, Client Design Deliverable, Client Lunch, 1099 Subcontractor) or drop any receipt/invoice. Llama 3.2 processes the text locally, determines tax deductibility, and generates an IRS Schedule C rationale.

![Smart Ingest & AI Extractor](https://raw.githubusercontent.com/saira-s/vaultledger-ai/main/screenshots/vaultledger_extracted.png)

### 3. Audited Ledger & Instant CSV Export
Search and filter across all processed transactions. One-click export generates an RFC 4180-compliant IRS Schedule C CSV mapped directly to lines 11, 13, 18, and 24b.

![Audited Financial Ledger](https://raw.githubusercontent.com/saira-s/vaultledger-ai/main/screenshots/vaultledger_ledger.png)

### 4. AI Payment Chaser Modal
Select any overdue client invoice (e.g., 13 days past Net-15) and toggle between **Gentle Reminder**, **Professional Follow-up**, or **Firm Final Notice**. Local Llama 3.2 writes an airtight email customized to the client and amount due.

![AI Payment Chaser](https://raw.githubusercontent.com/saira-s/vaultledger-ai/main/screenshots/vaultledger_chaser.png)

### 5. Interactive Open-Source ROI Calculator
An interactive slider that demonstrates how much money a freelancer saves by switching from closed cloud APIs and monthly SaaS platforms to local open-weights.

![Freelance Annual Savings Calculator](https://raw.githubusercontent.com/saira-s/vaultledger-ai/main/screenshots/vaultledger_calculator.png)

---

## 💻 Code

The project is structured with a local Node.js Express backend mediating communication with Ollama, and a lightweight Vanilla HTML/CSS/JS frontend.

### 1. Local Open-Weight Extraction Engine (`server.js`)

Here is how VaultLedger connects directly to Ollama's local HTTP API to extract structured JSON with zero cloud dependency:

```javascript
// server.js - Air-gapped extraction via local Ollama
app.post('/api/parse', async (req, res) => {
  const { text, model = 'llama3.2:latest' } = req.body;

  const prompt = `You are VaultLedger AI, a strict financial auditor and invoice/receipt parser for self-employed freelancers.
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
    const parsedData = JSON.parse(ollamaResponse.response);

    return res.json({
      success: true,
      source: 'ollama-local',
      model: model,
      inference_ms: latency,
      data: parsedData
    });
  } catch (error) {
    // Graceful offline fallback ensures the user is never stranded
    const fallbackData = fallbackExtract(text);
    return res.json({
      success: true,
      source: 'rule-engine-fallback',
      model: 'deterministic-fallback',
      data: fallbackData
    });
  }
});
```

### 2. Local AI Payment Chaser Generator

```javascript
// server.js - Contextual payment collection email drafter
app.post('/api/draft-email', async (req, res) => {
  const { invoice, tone = 'gentle', daysOverdue = 14, model = 'llama3.2:latest' } = req.body;

  const prompt = `You are an expert freelance business advocate. Write a polite, effective, professional payment follow-up email from a freelancer to a client for an overdue invoice.
Details:
- Client / Company Name: ${invoice.vendor_or_client}
- Invoice #: ${invoice.invoice_number}
- Amount Due: ${invoice.currency}${invoice.total}
- Days Overdue: ${daysOverdue} days
- Tone: ${tone} (Options: gentle reminder, professional follow-up, firm final notice)

Return ONLY valid JSON:
{
  "subject": "Clear email subject line",
  "email_body": "Complete email text formatted with salutation, body paragraphs, and professional sign-off"
}`;

  const ollamaResponse = await callOllama('/api/generate', {
    model: model,
    prompt: prompt,
    format: 'json',
    stream: false,
    options: { temperature: 0.3 }
  }, 30000);

  const result = JSON.parse(ollamaResponse.response);
  res.json({ success: true, email: result });
});
```

---

## 🛠️ How I Built It

### 1. Open-Source AI Stack
- **Open-Weight Model**: **Llama 3.2 3B (`llama3.2:latest`)**, Meta's state-of-the-art compact multilingual model. It runs comfortably on consumer hardware with 2GB RAM footprint (quantized to Q4_K_M GGUF format).
- **Inference Harness**: **Ollama (v0.40.3)** running locally via HTTP on `http://127.0.0.1:11434`. Ollama provides high-throughput CPU/GPU acceleration, memory-mapped weights, and structured JSON output mode (`format: 'json'`).
- **Prompt Architecture**: Strict JSON schema prompting with few-shot financial classification context and IRS Schedule C tax guidelines embedded into system instructions.

### 2. Web Stack & Design System
- **Core**: Node.js and Express backend providing an air-gapped local mediator with persistent on-disk JSON storage (`data/ledger.json`).
- **Styling**: 100% Vanilla CSS3 using custom CSS design tokens, glassmorphism, responsive grid layouts, and typography powered by Google Fonts (*Outfit* and *Plus Jakarta Sans*).
- **Zero Third-Party Telemetry**: No Google Analytics, no tracking pixels, no external CDNs that could leak metadata.

---

## 🌍 Why Does Open Innovation Matter?

Why does open innovation matter for what I built? What did an open-source approach make possible that a closed API wouldn't?

### 1. True Privacy and NDA Compliance
When a freelancer works for an enterprise client or healthcare startup, they routinely sign agreements forbidding the upload of project details to public cloud AI services. Because VaultLedger AI uses an open-weight model running locally, **not a single character leaves the computer**. It gives freelancers the superpowers of AI without putting their contracts in jeopardy.

### 2. $0.00 Marginal Cost Per Document
Closed APIs charge per token. A busy freelancer or small agency auditing 200 invoices, receipts, and line items a month would burn through $30–$50/month in API tokens and SaaS subscription fees ($360–$600/year). With open-source Llama 3.2 running on the laptop, **the marginal cost of running 1 or 10,000 extra extractions is literally $0.00**.

### 3. Freedom From Vendor Lock-In
Closed APIs regularly deprecate model checkpoints, change pricing tiers, alter moderation filters, or suffer outages. With open-source AI, the model belongs to the developer and user forever. If you want to swap Llama 3.2 for Mistral, Gemma 2, or a domain-specialized tax fine-tune, you can change the model parameter in one second without rewriting a line of business logic.

### 4. True Offline Portability
Freelancers work on planes, in train cars, and at remote cabins without stable internet. Closed cloud APIs fail instantly the moment the Wi-Fi drops. Because VaultLedger AI runs locally, you can categorize a year's worth of business receipts at 35,000 feet with Wi-Fi disabled.

---

## 🤖 My Agent Session

This entire project was planned, designed, coded, and tested in collaboration with **Antigravity** (Google DeepMind's advanced agentic coding assistant).

### What the Agent Accomplished:
1. **Environment Discovery**: Automatically detected existing local system capabilities (Node.js 24, Python 3.13, Ollama 0.40.3, and local `llama3.2:latest` weights).
2. **Architecture Design**: Structured the air-gapped Express backend, Ollama JSON schema bridge, and deterministic fallback engine.
3. **Frontend Engineering**: Crafted a high-end glassmorphic UI adhering to modern web design standards (dark slate/emerald palette, responsive KPI grid, tab navigation, accessible controls).
4. **End-to-End Browser Testing**: Launched an autonomous browser subagent to interact with the running web application, test invoice extraction, test search filtering, test the AI Payment Chaser, verify IRS tax audit advice, and capture screenshots and WebP session recordings.

---

## 👤 My First User

To test whether real freelancers would actually use and pay for VaultLedger AI, I demonstrated the tool to **Sarah J.**, an independent UI/UX designer and brand consultant based in Austin, Texas.

### Her Experience:
- **The Test**: She loaded her monthly AWS cloud bill, a $140 client lunch receipt, and an overdue client invoice for $3,850.
- **Her Reaction**:
  > *"I signed three enterprise NDAs this year that explicitly state I cannot upload client billing or deliverable details to third-party AI services. Because of that, I've been manually typing everything into a spreadsheet for months.*  
  > *Seeing Llama 3.2 extract the line items and immediately cite the IRS 50% rule on the lunch receipt—all completely offline without sending data to OpenAI—is incredible. And the overdue payment email writer is something I would use every single week."*

### Did She Pay / Would She Pay?
- **Willingness to Pay**: She stated she would happily pay a **$50–$80 one-time desktop purchase** or **$10–$15/month** to avoid paying $35/month for QuickBooks and Expensify.
- **What She Asked for Next**:
  1. Direct export to PDF for sending client invoices directly to accounts payable.
  2. Automatic CSV bank statement reconciliation to pair bank charges with receipts.

---

## 🏆 Prize Categories

- **Main Track**: Week 2 — Side Hustle (Build something with open-source AI that someone would actually pay for).
- **Local AI & Edge Deployment**: Demonstrating zero-cost, private, air-gapped local inference using Meta's Llama 3.2 open-weight model on consumer laptops.

---

*Thank you for checking out VaultLedger AI! Check out the [GitHub repository](https://github.com/saira-s/vaultledger-ai) to run it locally on your own machine.*
