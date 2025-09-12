# Filter Component Usage Guide

A universal filtering component that supports multiple filter types and can be flexibly used across different pages.

## Features

- 🎯 **Multiple Filter Types**: Supports checkboxes, radio buttons, and date range filtering
- 🔗 **URL State Management**: Automatically syncs filter state to URL parameters
- 📱 **Responsive Design**: Horizontal layout with automatic wrapping on overflow
- 🔄 **Real-time Filtering**: Choose between real-time filtering or manual application
- 🧹 **Reset Functionality**: One-click clear all filter conditions

## Basic Usage

```svelte
<script>
  import { Filter } from '$lib/components/Filter';
  
  const filters = [
    {
      key: 'category',
      label: 'Category',
      type: 'checkbox',
      options: [
        { value: 'parts', label: 'Parts' },
        { value: 'tools', label: 'Tools' }
      ]
    },
    {
      key: 'status',
      label: 'Status', 
      type: 'radio',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      key: 'date_range',
      label: 'Date Range',
      type: 'dateRange'
    }
  ];
</script>

<Filter {filters} />
```

## Pre-configured Filters

The component provides pre-configured filter configurations:

```svelte
<script>
  import { Filter, inventoryFilters, manageUserFilters, purchaseOrderFilters } from '$lib/components/Filter';
</script>

<!-- Inventory page -->
<Filter filters={inventoryFilters} />

<!-- User management page -->
<Filter filters={manageUserFilters} />

<!-- Purchase order page -->
<Filter filters={purchaseOrderFilters} />
```

## Filter Types

### Checkbox Filter
```javascript
{
  key: 'category',
  label: 'Category',
  type: 'checkbox',
  options: [
    { value: 'parts', label: 'Parts' },
    { value: 'tools', label: 'Tools' }
  ],
  defaultValue: []
}
```

### Radio Button Filter
```javascript
{
  key: 'status',
  label: 'Status',
  type: 'radio', 
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ],
  defaultValue: ''
}
```

### Date Range Filter
```javascript
{
  key: 'date_range',
  label: 'Date Range',
  type: 'dateRange',
  defaultValue: { start: '', end: '' }
}
```

## Backend Integration

Handle filter parameters in `+page.server.ts`:

```typescript
export const load: PageServerLoad = async ({ url }) => {
  // Parse filter parameters
  const filters = {};
  
  const categoryParam = url.searchParams.get("category");
  if (categoryParam) {
    filters.category = categoryParam.split(',');
  }
  
  const dateRangeParam = url.searchParams.get("date_range");
  if (dateRangeParam) {
    const [start, end] = dateRangeParam.split(',');
    filters.dateRange = { start, end };
  }
  
  // Apply filter conditions to database query
  const result = await getFilteredData(filters);
  return { data: result };
};
```

## URL Parameter Format

- **Checkbox**: `?category=parts,tools`
- **Radio Button**: `?status=active`
- **Date Range**: `?date_range=2024-01-01,2024-12-31`

## Component Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `filters` | `FilterConfig[]` | `[]` | Filter configuration array |
| `showResetButton` | `boolean` | `true` | Whether to show reset button |
| `autoApply` | `boolean` | `true` | Whether to auto-apply filters |

## Events

- `filter`: Triggered when filter conditions change
- `reset`: Triggered when filters are reset

```svelte
<Filter 
  {filters}
  on:filter={(e) => console.log('Filter changed:', e.detail)}
  on:reset={() => console.log('Filters reset')}
/>
```

## Style Customization

The component uses DaisyUI styles and can be customized via CSS variables:

```css
.filter-container {
  --filter-bg: oklch(var(--b2));
  --filter-padding: 1rem;
  --filter-border-radius: 0.5rem;
}
```

## Example Pages

The Filter component is now integrated in the following pages:

1. **Inventory Management** (`/dashboard/inventory`) - Supports category, subcategory, stock status, and item status filtering
2. **User Management** (`/admin/manage-user`) - Supports role and status filtering  
3. **Purchase Orders** (`/dashboard/purchase-order`) - Supports date range and order status filtering

You can reference these page implementations to use the Filter component in other pages. 