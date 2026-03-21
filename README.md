# ⚖️ Samvid AI — Intelligent Legal Document Assistant

> **"सम्विद्" (Samvid)** — Sanskrit for "awareness" and "understanding"

Samvid AI helps ordinary Indian citizens understand complex legal documents in plain, simple language. Upload any rental agreement, employment contract, loan document, or court notice — get an instant AI-powered explanation with risk analysis, key obligations, deadlines, and voice explanations in 10 Indian languages.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│              Hosted on S3 / Vercel / Netlify / Amplify          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS API Gateway (REST)                        │
│                   /api/v1/documents/*                           │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┬──────┘
   │          │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼          ▼
Upload     OCR       Analyze   Translate   Voice     Results/Delete
Lambda     Lambda     Lambda     Lambda     Lambda    Lambda
   │          │          │          │          │          │
   └──────────┴──────────┴──────────┴──────────┴──────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          DynamoDB          S3             S3
       (Metadata +       (Documents)    (Audio MP3)
         Results)
              │              │
              ▼              ▼
         AWS Textract    AWS Polly
         AWS Translate   OpenAI GPT-4o
         Secrets Manager (Bedrock fallback)
```

---

## 🚀 Features

| Feature | Technology |
|---|---|
| Document upload (PDF, JPG, PNG, up to 50MB) | S3 Presigned URLs |
| OCR text extraction | AWS Textract |
| Legal simplification + risk analysis | OpenAI GPT-4o (Bedrock fallback) |
| 10 Indian language translations | AWS Translate |
| Voice audio explanation | AWS Polly |
| Auto-deletion after 24 hours | DynamoDB TTL + S3 Lifecycle |
| Encrypted at rest | AWS KMS (S3 + DynamoDB SSE) |
| Serverless, pay-per-use | AWS Lambda + API Gateway |

**Supported Languages:** English, Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Bengali (বাংলা), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ)

---

## 📁 Project Structure

```
samvid-ai/
├── template.yaml                    # AWS SAM infrastructure
├── Makefile                         # Dev/deploy commands
├── env.json                         # SAM local env overrides
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Root component + layout
│   │   ├── main.tsx                 # React entry point
│   │   ├── components/
│   │   │   ├── Upload/UploadArea.tsx         # Drag-and-drop upload
│   │   │   ├── Results/AnalysisDashboard.tsx # Full analysis view
│   │   │   ├── Translation/TranslationPanel.tsx
│   │   │   ├── Voice/VoicePanel.tsx
│   │   │   └── Layout/ProcessingStepper.tsx
│   │   ├── services/api.ts          # All API calls
│   │   ├── hooks/index.ts           # Custom React hooks
│   │   ├── types/index.ts           # TypeScript types
│   │   └── utils/index.ts           # Helpers
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/
│   ├── layers/shared/
│   │   ├── requirements.txt
│   │   └── python/
│   │       ├── models.py            # Pydantic data models
│   │       ├── utils.py             # DynamoDB, S3, Secrets helpers
│   │       └── errors.py            # Custom exception classes
│   │
│   ├── services/
│   │   ├── upload/handler.py        # POST /documents/upload
│   │   ├── ocr/handler.py           # POST /documents/{id}/ocr
│   │   ├── ai_processor/handler.py  # POST /documents/{id}/analyze
│   │   ├── translation/handler.py   # POST /documents/{id}/translate
│   │   ├── voice/handler.py         # POST /documents/{id}/voice
│   │   ├── results/handler.py       # GET  /documents/{id}/results
│   │   └── deletion/handler.py      # DELETE /documents/{id}
│   │
│   └── .env.example
```

---

## 🛠️ Prerequisites

- **AWS CLI** v2+ configured with appropriate permissions
- **AWS SAM CLI** v1.100+
- **Python** 3.11+
- **Node.js** 18+ and npm
- **Docker** (for `sam local` and `--use-container` builds)
- **OpenAI API Key** (GPT-4o access required)

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd samvid-ai

# Install backend layer dependencies
make build-layer

# Install frontend dependencies
make frontend-install
```

### 2. Configure Secrets

```bash
# Store your OpenAI API key in AWS Secrets Manager
make seed-secret OPENAI_KEY=sk-your-openai-key-here
```

### 3. Deploy to AWS

```bash
# First time — guided deploy
make deploy-guided ENV=dev

# Subsequent deploys
make deploy ENV=dev
```

After deploy, note the **ApiBaseUrl** from stack outputs:

```bash
make outputs ENV=dev
```

### 4. Configure Frontend

```bash
cp frontend/.env.example frontend/.env.local
# Edit .env.local: set VITE_API_BASE_URL to the ApiBaseUrl from step 3
```

### 5. Run Frontend

```bash
make frontend-dev
# Opens at http://localhost:3000
```

---

## 🖥️ Local Development

Run the full backend locally using SAM local:

```bash
# Edit env.json with your local values first
make local
# Backend at http://localhost:3001

# In another terminal
make frontend-dev
# Frontend at http://localhost:3000
```

> **Note:** SAM local still calls real AWS services (Textract, Translate, Polly, DynamoDB, S3). Ensure your AWS credentials have the required permissions and the DynamoDB table/S3 buckets exist in your account.

### Create local DynamoDB table for testing:

```bash
aws dynamodb create-table \
  --table-name samvid-ai-documents-dev \
  --attribute-definitions AttributeName=documentId,AttributeType=S AttributeName=recordType,AttributeType=S \
  --key-schema AttributeName=documentId,KeyType=HASH AttributeName=recordType,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

---

## 🔌 API Reference

### Base URL
```
https://{api-id}.execute-api.ap-south-1.amazonaws.com/dev/api/v1
```

### Endpoints

#### `POST /documents/upload`
Create a document record and get a presigned S3 upload URL.

**Request:**
```json
{
  "file_name": "rental_agreement.pdf",
  "file_size": 204800,
  "mime_type": "application/pdf",
  "document_type": "Rental Agreement"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "550e8400-e29b-41d4-a716-446655440000",
    "upload_url": "https://s3.amazonaws.com/...(presigned PUT URL)...",
    "s3_key": "documents/550e8400.../original.pdf",
    "expires_in": 3600
  }
}
```

> **Important:** After receiving this response, PUT the file binary directly to `upload_url` with the correct `Content-Type` header.

---

#### `POST /documents/{documentId}/ocr`
Extract text from the uploaded document using AWS Textract.

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "550e8400-...",
    "word_count": 3842,
    "page_count": 4,
    "confidence_score": 98.7,
    "status": "ocr_complete"
  }
}
```

---

#### `POST /documents/{documentId}/analyze`
Run AI legal analysis using GPT-4o. Returns the full structured analysis.

**Response (abbreviated):**
```json
{
  "success": true,
  "data": {
    "document_id": "550e8400-...",
    "status": "completed",
    "overall_risk_level": "high",
    "document_type_detected": "Rental Agreement",
    "key_points_count": 8,
    "risks_count": 3,
    "model_used": "gpt-4o"
  }
}
```

---

#### `GET /documents/{documentId}/results`
Fetch all analysis data for a document.

**Response (abbreviated):**
```json
{
  "success": true,
  "data": {
    "document_id": "550e8400-...",
    "status": "completed",
    "metadata": { "file_name": "rental.pdf", ... },
    "analysis": {
      "plain_language_summary": "This is a rental agreement between...",
      "document_type_detected": "Rental Agreement",
      "overall_risk_level": "medium",
      "risk_summary": "This agreement contains 2 clauses that are unfavorable to you as the tenant.",
      "key_points": [...],
      "obligations": [...],
      "deadlines": [...],
      "penalties": [...],
      "risks": [...],
      "actions_to_take": [...],
      "disclaimer": "This analysis is generated by AI..."
    },
    "translations": {},
    "voice": {}
  }
}
```

---

#### `POST /documents/{documentId}/translate`
Translate the analysis into an Indian language.

**Request:**
```json
{ "target_language": "hi" }
```

**Supported codes:** `hi`, `ta`, `te`, `bn`, `mr`, `gu`, `kn`, `ml`, `pa`, `or`

---

#### `POST /documents/{documentId}/voice`
Generate an audio explanation using AWS Polly.

**Request:**
```json
{ "language_code": "hi" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "audio_url": "https://s3.amazonaws.com/...(presigned GET URL)...",
    "language_name": "Hindi",
    "duration_estimate_seconds": 145,
    "voice_id": "Aditi"
  }
}
```

---

#### `DELETE /documents/{documentId}`
Delete all document data (S3 files + all DynamoDB records).

---

## 📊 Sample AI Analysis Output

```json
{
  "plain_language_summary": "This is a rental agreement between you (the tenant) and the landlord for a 2BHK apartment in Pune. The rent is ₹18,000 per month with a security deposit of ₹54,000 (3 months). The agreement is for 11 months starting 1st April 2024...",
  "document_type_detected": "Residential Rental Agreement",
  "overall_risk_level": "medium",
  "risk_summary": "This agreement has 2 clauses that are unfair to you as a tenant. The landlord can increase rent by up to 10% every 6 months without prior notice.",
  "key_points": [
    {
      "heading": "Monthly Rent",
      "detail": "You must pay ₹18,000 every month by the 5th of each month.",
      "important": true
    }
  ],
  "obligations": [
    {
      "party": "You (Tenant)",
      "obligation": "Pay monthly rent of ₹18,000 by the 5th of every month",
      "frequency": "Monthly",
      "amount": "₹18,000"
    }
  ],
  "deadlines": [
    {
      "description": "Monthly rent payment",
      "date_or_period": "5th of every month",
      "consequence": "Late payment penalty of ₹500 per day after the 7th",
      "priority": "high"
    }
  ],
  "penalties": [
    {
      "trigger": "Rent paid after 7th of the month",
      "penalty_description": "Late payment penalty",
      "amount_or_severity": "₹500 per day",
      "risk_level": "medium"
    }
  ],
  "risks": [
    {
      "clause_text": "Landlord reserves the right to revise rent by up to 10% every 6 months",
      "plain_language_explanation": "The landlord can increase your rent twice a year without your agreement. This is unusual — most agreements fix rent for the entire lease period.",
      "risk_level": "high",
      "recommendation": "Ask the landlord to remove this clause or limit rent revision to once a year at lease renewal only."
    }
  ],
  "actions_to_take": [
    {
      "action": "Request the landlord to limit rent revision to annual renewals only",
      "priority": "high",
      "deadline": "Before signing",
      "note": "This is negotiable and common to request"
    },
    {
      "action": "Get a receipt for your security deposit of ₹54,000",
      "priority": "high",
      "deadline": "Before moving in",
      "note": null
    }
  ]
}
```

---

## 🔒 Security

- **Encryption at rest:** All S3 objects and DynamoDB items are encrypted using AWS KMS
- **No permanent storage:** Documents are auto-deleted after 24 hours via DynamoDB TTL and S3 Lifecycle rules
- **Least privilege IAM:** Each Lambda function uses a shared role scoped to only required resources
- **Secrets Management:** OpenAI API key stored in AWS Secrets Manager, never in code or env vars in production
- **No public S3:** All buckets block public access; files accessed only via signed URLs
- **CORS configured:** API Gateway enforces CORS headers for browser security

---

## 💰 Cost Estimate (Monthly, Low Usage — ~500 documents/month)

| Service | Usage | Estimated Cost |
|---|---|---|
| Lambda | 500 × 7 invocations × 300ms avg | ~$0.50 |
| API Gateway | ~3,500 requests | ~$0.01 |
| S3 (Documents) | ~500 files × 2MB avg, auto-deleted | ~$0.05 |
| S3 (Audio) | ~500 audio files, auto-deleted | ~$0.05 |
| DynamoDB | On-demand, ~3,500 writes | ~$0.05 |
| Textract | 500 × 4 pages | ~$7.50 |
| AWS Translate | 500 × 2,000 chars | ~$5.00 |
| AWS Polly | 500 × 2,000 chars | ~$2.00 |
| OpenAI GPT-4o | 500 × 3,000 tokens avg | ~$10.00 |
| **Total** | | **~$25/month** |

> OpenAI costs dominate at scale. Consider batching or caching for high-volume use.

---

## 🧪 Testing Workflow

```bash
# 1. Create upload session
DOC_ID=$(curl -s -X POST http://localhost:3001/api/v1/documents/upload \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test.pdf","file_size":50000,"mime_type":"application/pdf"}' \
  | jq -r '.data.document_id')
echo "Document ID: $DOC_ID"

# 2. Upload file to presigned URL
UPLOAD_URL=$(curl -s -X POST http://localhost:3001/api/v1/documents/upload \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test.pdf","file_size":50000,"mime_type":"application/pdf"}' \
  | jq -r '.data.upload_url')
curl -X PUT "$UPLOAD_URL" -H "Content-Type: application/pdf" --data-binary @test.pdf

# 3. Run OCR
curl -X POST http://localhost:3001/api/v1/documents/$DOC_ID/ocr | jq .

# 4. Run Analysis
curl -X POST http://localhost:3001/api/v1/documents/$DOC_ID/analyze | jq .

# 5. Get Results
curl -s http://localhost:3001/api/v1/documents/$DOC_ID/results | jq '.data.analysis.plain_language_summary'

# 6. Translate to Hindi
curl -X POST http://localhost:3001/api/v1/documents/$DOC_ID/translate \
  -H "Content-Type: application/json" \
  -d '{"target_language":"hi"}' | jq .

# 7. Generate Voice
curl -X POST http://localhost:3001/api/v1/documents/$DOC_ID/voice \
  -H "Content-Type: application/json" \
  -d '{"language_code":"hi"}' | jq '.data.audio_url'
```

---

## 🤝 Contributing

This project was built as a hackathon/portfolio demonstration. Contributions welcome:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a pull request

---

## ⚖️ Disclaimer

Samvid AI provides AI-generated analysis for informational purposes only. It is **not a substitute for professional legal advice**. Always consult a qualified lawyer before making decisions based on any legal document.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for 🇮🇳 India — making legal knowledge accessible to every citizen.*
