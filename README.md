# Enerflo → QuickBase Webhook Integration

🚀 **Bulletproof webhook integration** that maps Enerflo deal submissions to QuickBase CRM records with perfect field mapping.

## 🏗️ Project Structure

```
enerflo-webhook/
├── src/                          # Source code
│   ├── index.js                  # Main webhook server
│   ├── field-mapping.js          # Enerflo → QuickBase field mapping
│   └── enerflo-api-enrichment.js # API enrichment for missing data
├── config/                       # Configuration files
│   └── render.yaml              # Render deployment config
├── tests/                        # Test files
│   └── test-webhook.js          # Webhook testing script
├── docs/                         # Documentation
│   ├── api/                     # API documentation
│   │   └── QuickBase_RESTful_API_2025-08-28T17_29_31.942Z.json
│   ├── quickbase/               # QuickBase field references
│   │   └── Quickbase Field Reference - Sheet1.csv
│   └── webhook-actual.json      # Sample webhook payload
├── Dockerfile                   # Docker configuration
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

## 🚀 Features

- ✅ **153+ Field Mapping** - Comprehensive Enerflo → QuickBase data transfer
- ✅ **CallPilot Integration** - Welcome call data from CallPilot API
- ✅ **API Enrichment** - Customer emails and missing data from Enerflo API
- ✅ **Smart Upsert Logic** - Updates existing records, prevents duplicates
- ✅ **Design Image URLs** - Maps design images from multiple sources
- ✅ **Error Handling** - Robust error handling and validation
- ✅ **Fast Processing** - ~1.7 second processing time

## 🔧 Setup

### Environment Variables
```bash
QB_REALM=your-quickbase-realm
QB_TABLE_ID=your-table-id
QB_USER_TOKEN=your-user-token
ENERFLO_API_KEY=your-enerflo-api-key
PORT=3000
```

### Local Development
```bash
npm install
npm run dev
```

### Testing
```bash
npm test
```

## 🌐 Deployment

**Live URL**: `https://enerflo-quickbase-webhook.onrender.com/webhook/enerflo`

Deployed on Render with automatic deployments from GitHub main branch.

## 📊 Field Mapping

### Core Fields
- **Deal ID** (Field 6) - Enerflo Deal ID
- **Customer Info** (Fields 7, 10, 11, 16, 17) - Name, email, phone
- **System Design** (Fields 14-15, 19-32) - Size, panels, inverters
- **Pricing** (Fields 21, 33-40) - Costs, PPW, rebates
- **Address** (Fields 18, 73-78) - Full address and coordinates

### Welcome Call Data (CallPilot)
- **Welcome Call ID** (Field 171)
- **Welcome Call Date** (Field 172)
- **Welcome Call Recording URL** (Field 174)
- **Welcome Call Questions/Answers** (Fields 175-176)
- **Welcome Call Agent** (Field 177)
- **Welcome Call Outcome** (Field 178)

### Design & Images
- **Design ID** (Field 168) - Aurora design ID
- **Design Tool** (Field 169) - AuroraDTPDesignPlugin
- **Design Source ID** (Field 170) - Aurora design source
- **Design Image URL** (Field 220) - Design images from multiple sources

## 🔄 Data Flow

1. **Enerflo** sends webhook → **Our Server**
2. **API Enrichment** fetches missing data from Enerflo API
3. **CallPilot Integration** fetches welcome call data
4. **Field Mapping** transforms data to QuickBase format
5. **QuickBase Upsert** creates or updates record
6. **Response** confirms successful processing

## 🛠️ Future Enhancements

- [ ] **Setter/Closer Mapping** - Map sales rep roles
- [ ] **Sales Office Correction** - Fix sales team name mapping
- [ ] **Aurora Design Images** - Enhanced design image fetching
- [ ] **Error Monitoring** - Enhanced logging and monitoring
- [ ] **Performance Optimization** - Further speed improvements

## 📝 Version History

- **v1.0.10** - Fixed welcome call mapping, customer email handling
- **v1.0.9** - Fixed QuickBase upsert logic, deployment issues
- **v1.0.8** - Added design image URL mapping
- **v1.0.0** - Initial release with basic field mapping

## 🤝 Contributing

This project is maintained for Enerflo → QuickBase integration. For issues or enhancements, please contact the development team.

---

**Status**: ✅ Production Ready | **Last Updated**: September 4, 2025