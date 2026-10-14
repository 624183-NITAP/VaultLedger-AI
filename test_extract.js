const http = require('http');

const sampleInvoice = `
ACME CLOUD SERVICES INC.
Invoice #: INV-2024-8891
Date: October 12, 2024
Due Date: November 12, 2024
Billed to: Sarah Jenkins (Freelance UI/UX Consultant)
123 Creative Studio Way, Austin, TX

Items:
1. High-Performance GPU Cloud Instance (160 hrs @ $1.75/hr) - $280.00
2. Enterprise Storage Bucket (2TB) - $45.00
3. Bandwidth Egress Tier 2 - $18.50

Subtotal: $343.50
Tax (8.25%): $28.34
Total Due: $371.84
Payment Method: Visa ending in 4092
`;

const prompt = `You are an expert freelance financial auditor and receipt parser.
Extract the structured financial details from this document into valid JSON ONLY.
Schema:
{
  "vendor_or_client": "Name of company or person",
  "document_type": "invoice" or "receipt" or "bill",
  "invoice_number": "string or null",
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "currency": "$",
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "category": "Software" or "Office Supplies" or "Meals" or "Travel" or "Subcontractor" or "Equipment" or "Advertising" or "Other",
  "is_tax_deductible": true,
  "deductibility_percentage": 100,
  "tax_rationale": "Short explanation why this qualifies as a business write-off under IRS Schedule C",
  "line_items": [
    {"description": "...", "amount": 0.00}
  ]
}

Document:
${sampleInvoice}`;

const postData = JSON.stringify({
  model: 'llama3.2:latest',
  prompt: prompt,
  format: 'json',
  stream: false
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 11434,
  path: '/api/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const json = JSON.parse(body);
    console.log("RESULT:\n", json.response);
  });
});

req.on('error', (e) => console.error("Error:", e));
req.write(postData);
req.end();
