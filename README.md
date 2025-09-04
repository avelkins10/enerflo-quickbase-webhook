# Enerflo-QuickBase Webhook Integration

This project provides a complete webhook integration between Enerflo and QuickBase, automatically syncing deal data when projects are submitted.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Update `config.js` with your Enerflo API credentials:
```javascript
enerflo: {
  apiKey: 'your_enerflo_api_key_here',
  webhookSecret: 'your_webhook_secret_here'
}
```

### 3. Test the Integration
```bash
npm test
```

### 4. Start the Server
```bash
npm start
```

## 📡 Endpoints

- **Health Check**: `GET /health`
- **Test Connection**: `GET /test`
- **Webhook Endpoint**: `POST /webhook/enerflo`
- **Test Webhook**: `POST /webhook/test`

## 🔧 Configuration

### QuickBase Settings (Already Configured)
- **Realm**: `kin.quickbase.com`
- **Table ID**: `bveiu6xy5`
- **User Token**: `b6um6p_p3bs_0_bmrupwzbc82cdnb44a7pirtbxif`

### Enerflo Settings (Update Required)
- **API Key**: Add your Enerflo API key to `config.js`
- **Webhook Secret**: Add your webhook secret for signature validation

## 📊 Field Mapping

The integration maps 150+ fields from Enerflo webhooks to your QuickBase fields:

### Key Mappings
- **Deal ID** → Field 6 (Enerflo Deal ID)
- **Customer Info** → Fields 16, 17, 7 (First Name, Last Name, Full Name)
- **System Specs** → Fields 19, 14, 15 (Watts, kW, Panel Count)
- **Pricing** → Fields 21, 33, 34 (Gross Cost, Base Cost, Net Cost)
- **Status Flags** → Fields 41-158 (Contract Signed, Design, etc.)
- **Address** → Fields 73-78 (Address components and coordinates)
- **Files** → Fields 22, 144-150 (Contract URLs, document links)

### JSON Fields
Complex data is stored as JSON:
- **Field 58**: Arrays JSON (panel configurations)
- **Field 59**: Value Adder JSON (additional services)
- **Field 60**: System Adders JSON (system upgrades)
- **Field 61**: All Files JSON (document attachments)

## 🧪 Testing

### Test QuickBase Connection
```bash
curl http://localhost:3000/test
```

### Test Webhook Processing
```bash
curl -X POST http://localhost:3000/webhook/test
```

### Test with Sample Data
The integration includes your actual webhook sample data for testing.

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
The server provides detailed logging:
- ✅ Successful operations
- ❌ Error conditions
- 📨 Webhook receipts
- 🔄 Data transformations

## 🚀 Deployment

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production
```bash
npm start
```

### Environment Variables
Set these in production:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (info/debug/error)

## 🔒 Security

- **Helmet**: Security headers
- **CORS**: Cross-origin protection
- **Input Validation**: Webhook payload validation
- **Error Handling**: Secure error responses

## 📋 Webhook Events Supported

- `deal.projectSubmitted` ✅ (Primary event)
- `deal.contractSigned` ✅
- `deal.proposalCreated` ✅
- `deal.financingApproved` ✅

## 🛠️ Troubleshooting

### Common Issues

1. **QuickBase Connection Failed**
   - Verify credentials in `config.js`
   - Check network connectivity
   - Ensure QuickBase API access is enabled

2. **Webhook Processing Errors**
   - Check webhook payload format
   - Verify field mappings
   - Review server logs

3. **Missing Data**
   - Some fields may be empty if not provided by Enerflo
   - Check JSON fields for complex data
   - Verify array handling for multiple values

### Debug Mode
Enable detailed logging:
```javascript
// In config.js
logging: {
  level: 'debug'
}
```

## 📞 Support

For issues or questions:
1. Check server logs for error details
2. Verify QuickBase field mappings
3. Test with sample webhook data
4. Review Enerflo webhook documentation

## 🔄 Updates

To update field mappings:
1. Edit `webhook-processor.js`
2. Update the `transformWebhookToQuickBase` function
3. Test with sample data
4. Deploy changes

---

**Status**: ✅ Ready for Production
**Last Updated**: January 2025
**Version**: 1.0.0
# Force redeploy Wed Sep  3 21:05:37 MDT 2025
