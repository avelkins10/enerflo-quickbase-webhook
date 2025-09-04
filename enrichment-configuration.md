# Data Enrichment Configuration

## Environment Variables

To enable data enrichment, set the following environment variables:

```bash
# Enerflo API Configuration
ENERFLO_API_KEY=your_enerflo_api_key_here
ENERFLO_API_BASE_URL=https://api.enerflo.io

# Server Configuration
PORT=3000
NODE_ENV=production
```

## How It Works

1. **Webhook Processing**: When a webhook is received, the main data is processed and saved to QuickBase
2. **Background Enrichment**: After successful webhook processing, enrichment runs in the background
3. **API Calls**: The enrichment function makes additional API calls to Enerflo to fetch missing data
4. **QuickBase Updates**: Missing fields are updated in the QuickBase record

## Enriched Fields

The enrichment function fetches and populates the following missing fields:

### Customer Data
- **Customer Email** (Field ID 10)
- **Customer Phone** (Field ID 11)

### Project Management
- **Project Status** (Field ID 12)
- **Submission Date** (Field ID 13)
- **Created At** (Field ID 186)
- **Updated At** (Field ID 187)

### Notes & Comments
- **Notes Count** (Field ID 179)
- **Latest Note Text** (Field ID 180)
- **Latest Note Date** (Field ID 181)
- **Latest Note Author** (Field ID 182)
- **All Notes JSON** (Field ID 183)
- **Note Categories** (Field ID 184)
- **Note Authors List** (Field ID 185)

### Welcome Call Data
- **Welcome Call ID** (Field ID 171)
- **Welcome Call Date** (Field ID 172)
- **Welcome Call Duration** (Field ID 173)
- **Welcome Call Recording URL** (Field ID 174)
- **Welcome Call Questions JSON** (Field ID 175)
- **Welcome Call Answers JSON** (Field ID 176)
- **Welcome Call Agent** (Field ID 177)
- **Welcome Call Outcome** (Field ID 178)

### Design Validation
- **Design Validation Status** (Field ID 188)
- **Design Discrepancies JSON** (Field ID 189)
- **Validation Timestamp** (Field ID 190)
- **Validation Notes** (Field ID 191)

## API Endpoints

### Check Enrichment Status
```
GET /enrichment/status
```

Response:
```json
{
  "enabled": true,
  "apiConfigured": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Health Check (includes enrichment status)
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "enerflo-quickbase-webhook",
  "version": "2.0.0",
  "enrichment": {
    "enabled": true,
    "apiConfigured": true
  }
}
```

## Error Handling

- If the Enerflo API key is not configured, enrichment is disabled but webhook processing continues
- Individual API calls that fail are logged but don't stop the enrichment process
- All errors are tracked and reported in the enrichment results
- The webhook response includes `enrichmentStarted: true` when enrichment begins

## Performance

- Enrichment runs asynchronously in the background
- Webhook response is sent immediately without waiting for enrichment
- Multiple API calls are made in parallel using `Promise.allSettled()`
- Each API call has a 10-second timeout
- Failed API calls don't block other enrichment operations

## Monitoring

Check the server logs for enrichment activity:
- `🔄 Starting data enrichment for record {id}`
- `🎯 Data enrichment completed for record {id}`
- `⚠️ Data enrichment failed for record {id}`
- `❌ Data enrichment error for record {id}`

## Deployment

1. Set the `ENERFLO_API_KEY` environment variable in your deployment environment
2. Deploy the updated code
3. Check `/enrichment/status` to verify configuration
4. Monitor logs for enrichment activity
