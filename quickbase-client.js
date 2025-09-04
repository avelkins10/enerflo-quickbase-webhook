const config = require('./config');

class QuickBaseClient {
  constructor() {
    this.baseUrl = config.quickbase.baseUrl;
    this.tableId = config.quickbase.tableId;
    this.headers = {
      'QB-Realm-Hostname': config.quickbase.realm,
      'Authorization': `QB-USER-TOKEN ${config.quickbase.userToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Find existing record by Enerflo Deal ID
   */
  async findExistingRecord(dealId) {
    const url = `${this.baseUrl}/records/query`;
    
    const payload = {
      from: this.tableId,
      where: `{6.EX.'${dealId}'}`, // Field 6 = Enerflo Deal ID
      select: [3] // Field 3 = Record ID#
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`QuickBase query failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data.length > 0 ? result.data[0][3].value : null;
    } catch (error) {
      console.error('Error querying QuickBase:', error);
      return null;
    }
  }

  /**
   * Add new record to QuickBase
   */
  async addRecord(recordData) {
    const url = `${this.baseUrl}/records`;
    
    const payload = {
      to: this.tableId,
      data: [recordData]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuickBase add failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding record to QuickBase:', error);
      throw error;
    }
  }

  /**
   * Update existing record in QuickBase
   */
  async updateRecord(recordId, recordData) {
    const url = `${this.baseUrl}/records`;
    
    const payload = {
      to: this.tableId,
      data: [{
        [3]: { value: recordId }, // Field 3 = Record ID#
        ...recordData
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuickBase update failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating record in QuickBase:', error);
      throw error;
    }
  }

  /**
   * Add or update record (upsert functionality)
   */
  async upsertRecord(dealId, recordData) {
    try {
      const existingRecordId = await this.findExistingRecord(dealId);
      
      if (existingRecordId) {
        console.log(`Updating existing record ${existingRecordId} for deal ${dealId}`);
        return await this.updateRecord(existingRecordId, recordData);
      } else {
        console.log(`Creating new record for deal ${dealId}`);
        return await this.addRecord(recordData);
      }
    } catch (error) {
      console.error('Error in upsert operation:', error);
      throw error;
    }
  }

  /**
   * Test connection to QuickBase
   */
  async testConnection() {
    try {
      const url = `${this.baseUrl}/records/query`;
      const payload = {
        from: this.tableId,
        select: [3], // Just get Record ID#
        limit: 1
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log('✅ QuickBase connection successful');
        return true;
      } else {
        console.error('❌ QuickBase connection failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ QuickBase connection error:', error.message);
      return false;
    }
  }
}

module.exports = QuickBaseClient;
