/**
 * @fileoverview Filter configurations for different pages
 * 
 * This file contains pre-configured filter setups for various pages
 * 
 * @author Bobby Sun
 * @version 1.0.0
 */

import type { FilterConfig } from './types.js';
import { UserRole, roleLabels } from '$lib/shared/roles.js';
import { OrderStatus, orderStatusLabels } from '$lib/shared/order-status.js';

// Note: inventoryFilters has been removed as it now uses dynamic filters generated from database
// The inventory page now generates filters dynamically based on database categories and subcategories

// Manage user page filters
export const manageUserFilters: FilterConfig[] = [
	{
		key: 'role',
		label: 'Role',
		type: 'checkbox',
		options: Object.values(UserRole).filter(role => role !== UserRole.Deleted).map(role => ({
			value: role as string | number,
			label: roleLabels[role]
		})),
		defaultValue: []
	},
	{
		key: 'enabled',
		label: 'Status',
		type: 'radio',
		options: [
			{ value: 'all', label: 'All' },
			{ value: 'enabled', label: 'Enabled' },
			{ value: 'disabled', label: 'Disabled' }
		],
		defaultValue: 'all'
	}
];

// Purchase order page filters
export const purchaseOrderFilters: FilterConfig[] = [
	{
		key: 'date_range',
		label: 'Order Date',
		type: 'dateRange',
		defaultValue: { start: '', end: '' }
	},
	{
		key: 'order_status',
		label: 'Order Status',
		type: 'checkbox',
		options: Object.values(OrderStatus).map(status => ({
			value: status as string | number,
			label: orderStatusLabels[status]
		})),
		defaultValue: []
	}
]; 