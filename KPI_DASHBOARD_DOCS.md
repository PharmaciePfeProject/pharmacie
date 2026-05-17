# KPI Dashboard Documentation

## Overview
The KPI Dashboard provides comprehensive Key Performance Indicators (KPIs) across four main areas: Stock, Prescriptions, Distributions, and BI & Reporting.

## API Endpoints

### Get All KPIs
- **Endpoint**: `GET /api/kpis`
- **Permission**: `ANALYTICS_READ`
- **Response**: Combined KPIs from all modules

### Stock KPIs
- **Endpoint**: `GET /api/kpis/stock`
- **Permission**: `STOCK_READ`
- **Indicators**:
  - `availability_rate`: Percentage of products with available stock
  - `stock_outs`: Number of products with zero quantity
  - `avg_consumption`: Average consumption over last 30 days
  - `total_value`: Total monetary value of stock

### Prescriptions KPIs
- **Endpoint**: `GET /api/kpis/prescriptions`
- **Permission**: `PRESCRIPTIONS_READ`
- **Indicators**:
  - `total_prescriptions`: Total number of prescriptions
  - `prescriptions_by_doctor`: Top prescriptions per doctor
  - `top_medicines`: Most prescribed medicines
  - `avg_quantity`: Average quantity per prescription

### Distribution KPIs
- **Endpoint**: `GET /api/kpis/distributions`
- **Permission**: `DISTRIBUTIONS_READ`
- **Indicators**:
  - `total_distributions`: Total number of distributions
  - `top_products`: Most distributed products
  - `by_day`: Distributions by day (last 30 days)
  - `by_week`: Distributions by week (last 12 weeks)
  - `by_month`: Distributions by month (last 12 months)

### BI & Reporting KPIs
- **Endpoint**: `GET /api/kpis/reporting`
- **Permission**: `ANALYTICS_READ`
- **Indicators**:
  - `monthly_consumption`: Monthly consumption for last 12 months
  - `stock_evolution`: Stock entries vs exits over 30 days
  - `movement_analysis`: Analysis of stock movements

## Frontend Components

### KPIDashboard
Full-featured dashboard displaying all KPI metrics with charts and visualizations.
- Location: `/src/pages/bi/KPIDashboard.jsx`
- Route: `/app/bi/kpis`
- Charts: Line charts, bar charts, pie charts

### QuickKPIs
Summary component showing key metrics at a glance.
- Location: `/src/components/QuickKPIs.jsx`
- Used in: Home page dashboard
- Shows top 5 KPI metrics with quick links

## Database Queries
All KPI queries are optimized for performance and use parameterized queries to prevent SQL injection.

### Tables Used
- `STOCK`: Product stock information
- `MOUVEMENTS_STOCK`: Stock movement history
- `PRESCRIPTIONS`: Prescription records
- `DISTRIBUTIONS`: Distribution records
- `REFERENTIEL`: Product references
- `DOCTORS`: Doctor information

## Performance Considerations
- Results are cached when possible
- Queries use date filtering to limit data scope
- Aggregation functions used for efficiency
- Indexes recommended on date fields and foreign keys

## Permissions
- `ANALYTICS_READ`: Required for all KPI endpoints
- Module-specific permissions also checked:
  - `STOCK_READ` for stock KPIs
  - `PRESCRIPTIONS_READ` for prescription KPIs
  - `DISTRIBUTIONS_READ` for distribution KPIs

## Language Support
- English: Complete
- French: Complete
- Messages defined in `/src/i18n/messages.js`
