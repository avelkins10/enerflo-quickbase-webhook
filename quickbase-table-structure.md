# QuickBase Table Structure for Enerflo Integration

## Recommended Table Structure

### 1. Customers Table
**Primary Key**: Customer ID
**Purpose**: Store customer information

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| Customer ID | Text | Yes | Primary Key |
| First Name | Text | Yes | |
| Last Name | Text | Yes | |
| Full Name | Text | No | Calculated field |
| Created Date | Date/Time | No | |
| Modified Date | Date/Time | No | |

### 2. Deals Table
**Primary Key**: Deal ID
**Purpose**: Store deal/project information and status

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| Deal ID | Text | Yes | Primary Key |
| Deal Code | Text | No | Short code |
| Customer ID | Text | Yes | Link to Customers |
| Target Organization | Text | Yes | |
| Initiated By | Text | Yes | |
| Sales Rep ID | Text | Yes | |
| Has Design | Checkbox | No | |
| Financing Status | Text | No | |
| Selected Proposal ID | Text | No | Link to Proposals |
| Contract Signed | Checkbox | No | |
| Contract Approved | Checkbox | No | |
| Project Submitted | Checkbox | No | |
| Proposal Created | Checkbox | No | |
| Contract Generated | Checkbox | No | |
| Financing Docs Signed | Checkbox | No | |
| Financing App Submitted | Checkbox | No | |
| Notes Comments | Text | No | |
| Schedule Site Survey | Checkbox | No | |
| Site Survey Type | Text | No | |
| Site Survey Calendly ID | Text | No | |
| Full UB Example | Checkbox | No | |
| New Move In | Text | No | |
| Layout Preferences | Text | No | |
| Shading Concerns | Checkbox | No | |
| System Offset Below 100% | Checkbox | No | |
| Lender Type | Text | No | |
| Down Payment Method | Text | No | |
| Additional Steps Cash | Checkbox | No | |
| Has Additional Work | Checkbox | No | |
| Additional Work Types | Text | No | Comma separated |
| Tree Removal Contractor | Text | No | |
| Tree Removal Phone | Text | No | |
| Tree Trimming Contractor | Text | No | |
| Tree Trimming Phone | Text | No | |
| HVAC Contractor | Text | No | |
| HVAC Phone | Text | No | |
| Roof Contractor | Text | No | |
| Roof Contractor Phone | Text | No | |
| Created Date | Date/Time | No | |
| Modified Date | Date/Time | No | |

### 3. Proposals Table
**Primary Key**: Proposal ID
**Purpose**: Store proposal and pricing information

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| Proposal ID | Text | Yes | Primary Key |
| Deal ID | Text | Yes | Link to Deals |
| Net Price Per Watt | Number | No | |
| Base Price Per Watt | Number | No | |
| Gross Price Per Watt | Number | No | |
| Net Cost | Currency | No | |
| Base Cost | Currency | No | |
| Gross Cost | Currency | No | |
| System Size Watts | Number | No | |
| Down Payment Percent | Number | No | |
| Finance Cost | Currency | No | |
| Dealer Fee | Currency | No | |
| Tax Rate | Number | No | |
| Total Rebates | Currency | No | |
| Total Discounts | Currency | No | |
| Total Value Adders | Currency | No | |
| Total System Adders | Currency | No | |
| Federal Rebate Total | Currency | No | |
| Total System Size Watts | Number | No | |
| Total Panel Count | Number | No | |
| Panel Capacity | Number | No | |
| Panel Manufacturer | Text | No | |
| Panel Model | Text | No | |
| Panel Efficiency | Number | No | |
| Primary Azimuth | Number | No | |
| Primary Pitch | Number | No | |
| Average Solar Access | Number | No | |
| Inverter Name | Text | No | |
| Inverter Model | Text | No | |
| Inverter Count | Number | No | |
| AC Output | Number | No | |
| Inverter Manufacturer | Text | No | |
| Inverter Efficiency | Number | No | |
| Utility Company | Text | No | |
| Utility Genability ID | Number | No | |
| Annual Consumption | Number | No | |
| Annual Bill | Currency | No | |
| Average Utility Rate | Number | No | |
| Average Monthly Bill | Currency | No | |
| Average Monthly Consumption | Number | No | |
| Building Area | Number | No | |
| Utility Rate | Number | No | |
| Post Solar Rate | Number | No | |
| First Year Production | Number | No | |
| System Offset | Number | No | |
| Weighted TSRF | Number | No | |
| Mounting Type | Text | No | |
| Roof Material | Text | No | |
| Battery Count | Number | No | |
| Battery Purpose | Text | No | |
| Inverter Count | Number | No | |
| Address Line 1 | Text | No | |
| Address Line 2 | Text | No | |
| Address Line 3 | Text | No | |
| City | Text | No | |
| State | Text | No | |
| ZIP Code | Number | No | |
| Country | Text | No | |
| Full Address | Text | No | |
| Latitude | Number | No | |
| Longitude | Number | No | |
| Finance Product Name | Text | No | |
| Finance Plugin | Text | No | |
| Term Months | Number | No | |
| Dealer Fee Percent | Number | No | |
| Finance Product Status | Text | No | |
| Finance Method ID | Text | No | |
| Finance Method Name | Text | No | |
| Created Date | Date/Time | No | |
| Modified Date | Date/Time | No | |

### 4. Files Table
**Primary Key**: File ID
**Purpose**: Store file attachments and documents

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| File ID | Text | Yes | Primary Key |
| Deal ID | Text | Yes | Link to Deals |
| File Name | Text | Yes | |
| File Source | Text | No | |
| File URL | URL | No | |
| Is Public | Checkbox | No | |
| Created Date | Date/Time | No | |
| Modified Date | Date/Time | No | |

### 5. Rebates Table
**Primary Key**: Auto-generated
**Purpose**: Store rebate information

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| Record ID | Auto-number | Yes | Primary Key |
| Proposal ID | Text | Yes | Link to Proposals |
| Rebate Name | Text | No | |
| Rebate Type | Text | No | |
| ITC Percent | Number | No | |
| Rebate Amount | Currency | No | |
| Created Date | Date/Time | No | |
| Modified Date | Date/Time | No | |

### 6. Adders Table
**Primary Key**: Auto-generated
**Purpose**: Store additional services and adders

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| Record ID | Auto-number | Yes | Primary Key |
| Proposal ID | Text | Yes | Link to Proposals |
| Adder Name | Text | No | |
| Adder Amount | Currency | No | |
| Adder Type | Text | No | Value or System |
| Field Inputs | Text | No | JSON string |
| Created Date | Date/Time | No | |
| Modified Date | Date/Time | No | |

### 7. Sales Teams Table
**Primary Key**: Auto-generated
**Purpose**: Store sales team information

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| Record ID | Auto-number | Yes | Primary Key |
| Proposal ID | Text | Yes | Link to Proposals |
| Sales Team ID | Text | No | |
| Sales Team Name | Text | No | |
| Created Date | Date/Time | No | |
| Modified Date | Date/Time | No | |

## Table Relationships

```
Customers (1) ←→ (Many) Deals
Deals (1) ←→ (Many) Proposals
Deals (1) ←→ (Many) Files
Proposals (1) ←→ (Many) Rebates
Proposals (1) ←→ (Many) Adders
Proposals (1) ←→ (Many) Sales Teams
```

## Implementation Notes

1. **Array Handling**: For array fields, create separate records in related tables (Rebates, Adders, Sales Teams, Files)

2. **Data Types**: 
   - Use Currency fields for monetary values
   - Use Number fields for numeric values
   - Use Text fields for strings
   - Use Checkbox for boolean values
   - Use URL fields for web addresses

3. **Required Fields**: Only mark fields as required if they're essential for your business process

4. **Calculated Fields**: Consider adding calculated fields for:
   - Full Name (First + Last)
   - Total System Size in kW (Watts / 1000)
   - System Payback Period
   - Monthly Savings

5. **Indexing**: Add indexes on frequently queried fields like:
   - Customer ID
   - Deal ID
   - Proposal ID
   - Created Date
   - Modified Date

6. **Permissions**: Set up appropriate user permissions for each table

7. **Forms**: Create user-friendly forms for data entry and viewing

8. **Reports**: Create reports for:
   - Deal pipeline
   - Proposal summaries
   - Financial analysis
   - Customer information

## Integration Considerations

1. **Webhook Processing**: Process the webhook payload and create/update records in the appropriate tables

2. **Duplicate Handling**: Implement logic to handle duplicate webhook deliveries

3. **Error Handling**: Log errors for failed record creation/updates

4. **Data Validation**: Validate data before inserting into QuickBase

5. **Batch Processing**: Consider batching multiple records for better performance

6. **Monitoring**: Set up monitoring for webhook processing success/failure rates
