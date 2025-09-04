# Enerflo Webhook Integration Documentation

Based on the [Enerflo Developer's Hub](https://docs.enerflo.io/docs/welcome), this document provides comprehensive guidance for integrating Enerflo webhooks with QuickBase.

## Enerflo API Versions

Enerflo offers two API versions:
- **Enerflo 1.0**: REST API with traditional webhooks
- **Enerflo 2.0**: GraphQL API with enhanced webhook events

## Webhook Event Types

### Enerflo 1.0 Events
According to the [Enerflo 1.0 Event Definitions](https://docs.enerflo.io/docs/welcome), common events include:
- `deal.projectSubmitted` (which we have in our sample)
- `deal.contractSigned`
- `deal.proposalCreated`
- `deal.financingApproved`

### Enerflo 2.0 Events
The [Enerflo 2.0 Event Definitions](https://docs.enerflo.io/docs/welcome) provide more granular events and enhanced data structures.

## Webhook Authentication

### API Key Setup
1. **Global Access Key**: For full API access
2. **Lead Gen Keys**: For specific lead generation workflows

### Authentication Headers
```javascript
const headers = {
  'Authorization': 'Bearer your-enerflo-api-key',
  'Content-Type': 'application/json',
  'X-Enerflo-Event': 'deal.projectSubmitted' // Event type
};
```

## Webhook Payload Structure

Based on our sample webhook and Enerflo documentation, the payload structure is:

```json
{
  "event": "deal.projectSubmitted",
  "payload": {
    "targetOrg": "organization-id",
    "initiatedBy": "user-id",
    "deal": {
      "id": "deal-id",
      "shortCode": "deal-code",
      "state": { /* deal state object */ },
      "files": [ /* file attachments */ ]
    },
    "customer": {
      "id": "customer-id",
      "firstName": "Customer",
      "lastName": "Name"
    },
    "proposal": {
      "id": "proposal-id",
      "pricingOutputs": { /* pricing data */ },
      "design": { /* system design */ }
    },
    "salesRep": {
      "id": "sales-rep-id"
    }
  }
}
```

## Enhanced Integration Implementation

### Webhook Validation
```javascript
function validateEnerfloWebhook(payload, signature) {
  // Validate webhook signature if provided
  const expectedSignature = crypto
    .createHmac('sha256', process.env.ENERFLO_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

### Event-Specific Processing
```javascript
async function processEnerfloEvent(webhookData) {
  const eventType = webhookData.event;
  
  switch (eventType) {
    case 'deal.projectSubmitted':
      return await processProjectSubmitted(webhookData);
    case 'deal.contractSigned':
      return await processContractSigned(webhookData);
    case 'deal.proposalCreated':
      return await processProposalCreated(webhookData);
    case 'deal.financingApproved':
      return await processFinancingApproved(webhookData);
    default:
      console.log(`Unhandled event type: ${eventType}`);
      return { success: true, message: 'Event logged but not processed' };
  }
}
```

### Project Submitted Handler
```javascript
async function processProjectSubmitted(webhookData) {
  const dealId = webhookData.payload.deal.id;
  
  // Check if this is a new submission or update
  const existingRecord = await findExistingRecord(dealId);
  
  if (existingRecord) {
    // Update existing record with submission status
    await updateRecord(existingRecord.id, {
      155: { value: true }, // Has Submitted Project
      13: { value: new Date().toISOString() }, // Submission Date
      12: { value: 'Submitted' } // Project Status
    });
  } else {
    // Create new record
    const recordData = transformWebhookToQuickBase(webhookData);
    await addOrUpdateRecord(recordData);
  }
  
  return { success: true, dealId, action: 'project_submitted' };
}
```

## Rate Limiting and Best Practices

### Rate Limiting
According to Enerflo's [Rate Limits documentation](https://docs.enerflo.io/docs/welcome):
- Implement exponential backoff for failed requests
- Respect API rate limits
- Use batch operations when possible

### Error Handling
```javascript
async function handleEnerfloWebhookError(error, webhookData) {
  const errorContext = {
    event: webhookData.event,
    dealId: webhookData.payload?.deal?.id,
    timestamp: new Date().toISOString(),
    error: error.message
  };
  
  // Log to monitoring service
  console.error('Enerflo webhook error:', errorContext);
  
  // Send alert if critical
  if (error.status >= 500) {
    await sendAlert('Critical webhook processing error', errorContext);
  }
}
```

## GraphQL Integration (Enerflo 2.0)

If you're using Enerflo 2.0, you can also query additional data using GraphQL:

### GraphQL Query Example
```javascript
const GET_DEAL_DETAILS = `
  query GetDealDetails($dealId: String!) {
    deal(id: $dealId) {
      id
      shortCode
      state
      customer {
        id
        firstName
        lastName
        email
        phone
      }
      proposal {
        id
        pricingOutputs
        design
      }
    }
  }
`;

async function fetchDealDetails(dealId) {
  const response = await fetch('https://api.enerflo.io/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ENERFLO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: GET_DEAL_DETAILS,
      variables: { dealId }
    })
  });
  
  return await response.json();
}
```

## Complete Webhook Endpoint with Enerflo Best Practices

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json({ verify: (req, res, buf) => {
  req.rawBody = buf;
}}));

app.post('/webhook/enerflo', async (req, res) => {
  try {
    // Validate webhook signature
    const signature = req.headers['x-enerflo-signature'];
    if (!validateEnerfloWebhook(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Process the event
    const result = await processEnerfloEvent(req.body);
    
    // Log successful processing
    console.log(`Successfully processed ${req.body.event} for deal ${req.body.payload.deal.id}`);
    
    res.status(200).json({ success: true, result });
  } catch (error) {
    await handleEnerfloWebhookError(error, req.body);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/webhook/enerflo/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log('Enerflo webhook server running on port 3000');
});
```

## Testing with Enerflo

### Test Webhook Endpoint
```javascript
async function testEnerfloWebhook() {
  const testPayload = {
    event: 'deal.projectSubmitted',
    payload: {
      targetOrg: 'test-org',
      initiatedBy: 'test-user',
      deal: {
        id: 'test-deal-123',
        shortCode: 'test123',
        state: {
          hasDesign: true,
          hasSignedContract: true,
          hasSubmittedProject: true
        }
      },
      customer: {
        id: 'test-customer',
        firstName: 'Test',
        lastName: 'Customer'
      }
    }
  };
  
  try {
    const result = await processEnerfloEvent(testPayload);
    console.log('Test successful:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

## Monitoring and Analytics

### Webhook Processing Metrics
```javascript
const metrics = {
  totalWebhooks: 0,
  successfulWebhooks: 0,
  failedWebhooks: 0,
  eventTypes: {}
};

function trackWebhookMetrics(eventType, success) {
  metrics.totalWebhooks++;
  if (success) {
    metrics.successfulWebhooks++;
  } else {
    metrics.failedWebhooks++;
  }
  
  metrics.eventTypes[eventType] = (metrics.eventTypes[eventType] || 0) + 1;
}

// Expose metrics endpoint
app.get('/webhook/enerflo/metrics', (req, res) => {
  res.json(metrics);
});
```

## Deployment Checklist

- [ ] Set up Enerflo API credentials
- [ ] Configure webhook endpoint URL in Enerflo
- [ ] Implement webhook signature validation
- [ ] Set up error monitoring and alerting
- [ ] Test with sample webhook data
- [ ] Deploy to production environment
- [ ] Monitor webhook processing success rates
- [ ] Set up backup/retry mechanisms

## Next Steps

1. **Review Enerflo Documentation**: Study the [Enerflo Developer's Hub](https://docs.enerflo.io/docs/welcome) for the latest API changes
2. **Choose API Version**: Decide between Enerflo 1.0 (REST) or 2.0 (GraphQL)
3. **Set Up Authentication**: Obtain API keys from Enerflo
4. **Implement Webhook Endpoint**: Use the provided code examples
5. **Test Integration**: Validate with sample data
6. **Deploy and Monitor**: Go live with proper monitoring

This integration leverages the official Enerflo documentation to ensure compatibility and best practices for your webhook processing system.
