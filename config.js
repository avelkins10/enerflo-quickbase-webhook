// Configuration file for Enerflo-QuickBase integration
module.exports = {
  // QuickBase Configuration
  quickbase: {
    realm: 'kin.quickbase.com',
    tableId: 'bveiu6xy5',
    userToken: 'b6um6p_p3bs_0_bmrupwzbc82cdnb44a7pirtbxif',
    baseUrl: 'https://api.quickbase.com/v1'
  },
  
  // Enerflo Configuration (update with your actual values)
  enerflo: {
    apiKey: process.env.ENERFLO_API_KEY || 'your_enerflo_api_key_here',
    webhookSecret: process.env.ENERFLO_WEBHOOK_SECRET || 'your_webhook_secret_here',
    baseUrl: 'https://api.enerflo.io'
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
