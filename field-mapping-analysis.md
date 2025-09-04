# Enerflo Webhook to QuickBase Field Mapping Analysis

## Main Entity Structure

The webhook contains several main entities that need to be mapped to QuickBase:

### 1. Customer Entity
- `payload.customer.id` - Customer ID
- `payload.customer.firstName` - First Name
- `payload.customer.lastName` - Last Name

### 2. Deal Entity
- `payload.deal.id` - Deal ID
- `payload.deal.shortCode` - Deal Short Code
- `payload.deal.state` - Deal State (complex object with many sub-fields)

### 3. Proposal Entity
- `payload.proposal.id` - Proposal ID
- `payload.proposal.pricingOutputs` - Pricing information
- `payload.proposal.design` - System design details

### 4. Sales Rep Entity
- `payload.salesRep.id` - Sales Rep ID

### 5. Target Organization
- `payload.targetOrg` - Organization ID
- `payload.initiatedBy` - User who initiated the action

## Detailed Field Mapping

### Customer Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.customer.id` | String (UUID) | Customer ID | Primary key |
| `payload.customer.firstName` | String | First Name | |
| `payload.customer.lastName` | String | Last Name | |

### Deal Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.deal.id` | String (UUID) | Deal ID | Primary key |
| `payload.deal.shortCode` | String | Deal Code | |
| `payload.deal.state.hasDesign` | Boolean | Has Design | |
| `payload.deal.state.financingStatus` | String | Financing Status | |
| `payload.deal.state.selectedProposal` | String (UUID) | Selected Proposal ID | |
| `payload.deal.state.hasSignedContract` | Boolean | Contract Signed | |
| `payload.deal.state.hasApprovedContract` | Boolean | Contract Approved | |
| `payload.deal.state.hasSubmittedProject` | Boolean | Project Submitted | |
| `payload.deal.state.notes-comments` | String | Notes/Comments | |

### Site Survey Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.deal.state.site-survey.schedule-site-survey` | Boolean | Schedule Site Survey | |
| `payload.deal.state.site-survey.site-survey-selection` | String | Site Survey Type | |
| `payload.deal.state.site-survey.site-survey-calendly-id` | String | Calendly ID | |

### Utility Bill Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.deal.state.utility-bill.full-ub-example` | Boolean | Full UB Example | |
| `payload.deal.state.utility-bill.full-utility-bill[].id` | String | Utility Bill File ID | Array |
| `payload.deal.state.utility-bill.full-utility-bill[].name` | String | Utility Bill File Name | Array |

### System Offset Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.deal.state.system-offset.new-move-in` | String | New Move In | |
| `payload.deal.state.system-offset.layout-preferences` | String | Layout Preferences | |
| `payload.deal.state.system-offset.are-there-any-shading-concerns` | Boolean | Shading Concerns | |
| `payload.deal.state.system-offset.is-the-system-offset-below-100` | Boolean | System Offset Below 100% | |

### Financing Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.deal.state.lender-welcome-call.lender-dropdown` | String | Lender Type | |
| `payload.deal.state.lender-welcome-call.how-is-the-customer-making-their-down-payment` | String | Down Payment Method | |
| `payload.deal.state.lender-welcome-call.additional-steps-cash` | Boolean | Additional Steps Cash | |

### Additional Work Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.deal.state.additional-work-substage.is-there-additional-work` | Boolean | Has Additional Work | |
| `payload.deal.state.additional-work-substage.additional-work[]` | Array | Additional Work Types | |
| `payload.deal.state.additional-work-substage.tree-removal-contractor` | String | Tree Removal Contractor | |
| `payload.deal.state.additional-work-substage.tree-removal-contractor-phone-number` | String | Tree Removal Phone | |

### Proposal/Pricing Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.pricingOutputs.netPPW` | Number | Net Price Per Watt | |
| `payload.proposal.pricingOutputs.basePPW` | Number | Base Price Per Watt | |
| `payload.proposal.pricingOutputs.netCost` | Number | Net Cost | |
| `payload.proposal.pricingOutputs.baseCost` | Number | Base Cost | |
| `payload.proposal.pricingOutputs.grossCost` | Number | Gross Cost | |
| `payload.proposal.pricingOutputs.systemSizeWatts` | Number | System Size (Watts) | |
| `payload.proposal.pricingOutputs.downPayment` | Number | Down Payment % | |
| `payload.proposal.pricingOutputs.financeCost` | Number | Finance Cost | |

### Design Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.design.totalSystemSizeWatts` | Number | Total System Size | |
| `payload.proposal.design.arrays[].moduleCount` | Number | Panel Count | Array |
| `payload.proposal.design.arrays[].module.capacity` | Number | Panel Capacity | Array |
| `payload.proposal.design.arrays[].module.manufacturer` | String | Panel Manufacturer | Array |
| `payload.proposal.design.arrays[].module.model` | String | Panel Model | Array |
| `payload.proposal.design.arrays[].azimuth` | Number | Panel Azimuth | Array |
| `payload.proposal.design.arrays[].pitch` | Number | Panel Pitch | Array |

### Inverter Fields
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.pricingOutputs.design.inverters[].name` | String | Inverter Name | Array |
| `payload.proposal.pricingOutputs.design.inverters[].model` | String | Inverter Model | Array |
| `payload.proposal.pricingOutputs.design.inverters[].count` | Number | Inverter Count | Array |
| `payload.proposal.pricingOutputs.design.inverters[].acOutput` | Number | AC Output | Array |
| `payload.proposal.pricingOutputs.design.inverters[].manufacturer` | String | Inverter Manufacturer | Array |

### Utility Information
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.pricingOutputs.design.utility.name` | String | Utility Company | |
| `payload.proposal.pricingOutputs.design.utility.genabilityId` | Number | Utility Genability ID | |
| `payload.proposal.pricingOutputs.design.consumptionProfile.annualConsumption` | Number | Annual Consumption | |
| `payload.proposal.pricingOutputs.design.consumptionProfile.annualBill` | Number | Annual Bill | |
| `payload.proposal.pricingOutputs.design.consumptionProfile.averageUtilityRate` | Number | Average Utility Rate | |

### Project Address
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.pricingOutputs.deal.projectAddress.line1` | String | Address Line 1 | |
| `payload.proposal.pricingOutputs.deal.projectAddress.line2` | String | Address Line 2 | |
| `payload.proposal.pricingOutputs.deal.projectAddress.city` | String | City | |
| `payload.proposal.pricingOutputs.deal.projectAddress.state` | String | State | |
| `payload.proposal.pricingOutputs.deal.projectAddress.postalCode` | Number | ZIP Code | |
| `payload.proposal.pricingOutputs.deal.projectAddress.fullAddress` | String | Full Address | |
| `payload.proposal.pricingOutputs.deal.projectAddress.lat` | Number | Latitude | |
| `payload.proposal.pricingOutputs.deal.projectAddress.lng` | Number | Longitude | |

### File Attachments
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.deal.files[].id` | String | File ID | Array |
| `payload.deal.files[].name` | String | File Name | Array |
| `payload.deal.files[].source` | String | File Source | Array |
| `payload.deal.files[].url` | String | File URL | Array |
| `payload.deal.files[].isPublic` | Boolean | File Public | Array |

### Rebates and Incentives
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.pricingOutputs.rebates[].displayName` | String | Rebate Name | Array |
| `payload.proposal.pricingOutputs.rebates[].pricingOption.type` | String | Rebate Type | Array |
| `payload.proposal.pricingOutputs.rebatesTotal` | Number | Total Rebates | |
| `payload.proposal.pricingOutputs.federalRebateTotal` | Number | Federal Rebate Total | |

### Adders (Additional Services)
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.pricingOutputs.adderPricing.valueAdders[].displayName` | String | Value Adder Name | Array |
| `payload.proposal.pricingOutputs.adderPricing.valueAdders[].amount` | Number | Value Adder Amount | Array |
| `payload.proposal.pricingOutputs.adderPricing.systemAdders[].displayName` | String | System Adder Name | Array |
| `payload.proposal.pricingOutputs.adderPricing.systemAdders[].amount` | Number | System Adder Amount | Array |
| `payload.proposal.pricingOutputs.valueAddersTotal` | Number | Total Value Adders | |
| `payload.proposal.pricingOutputs.systemAddersTotal` | Number | Total System Adders | |

### Finance Product
| Enerflo Path | Data Type | QuickBase Field | Notes |
|--------------|-----------|-----------------|-------|
| `payload.proposal.pricingOutputs.financeProduct.name` | String | Finance Product Name | |
| `payload.proposal.pricingOutputs.financeProduct.plugin` | String | Finance Plugin | |
| `payload.proposal.pricingOutputs.financeProduct.termMonths` | Number | Term Months | |
| `payload.proposal.pricingOutputs.financeProduct.dealerFeePercent` | Number | Dealer Fee % | |

## Implementation Notes

1. **Array Fields**: Many fields are arrays (indicated by `[]`). You'll need to decide how to handle these in QuickBase - either as separate records or concatenated strings.

2. **Nested Objects**: Some fields are deeply nested. Consider flattening these for easier QuickBase integration.

3. **Data Types**: Ensure proper data type mapping between JSON and QuickBase field types.

4. **Required vs Optional**: Identify which fields are required for your business process.

5. **File Handling**: File URLs may need special handling for QuickBase file attachments.

6. **Relationships**: Consider how to maintain relationships between entities (Customer → Deal → Proposal).

## Next Steps

1. Create QuickBase tables for each main entity
2. Set up field mappings in your integration tool
3. Handle array fields appropriately
4. Test with sample data
5. Implement error handling for missing fields
