export interface FilterOption {
	value: string | number;
	label: string;
}

export interface FilterOption {
	value: string | number;
	label: string;
	category?: string;
}

export interface FilterConfig {
	key: string;
	label: string;
	type: 'checkbox' | 'radio' | 'dateRange';
	options?: FilterOption[];
	defaultValue?: any;
	groupByCategory?: boolean;
}

export type FilterState = Record<string, any>;

export interface FilterChangeEvent {
	key: string;
	value: any;
} 