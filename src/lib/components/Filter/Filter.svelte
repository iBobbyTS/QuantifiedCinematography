<!--
  @fileoverview Main Filter component
  
  Provides a flexible filtering interface with multiple filter types
  arranged horizontally with automatic wrapping.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { FilterConfig, FilterState } from './types.js';
	import CheckboxFilter from './CheckboxFilter.svelte';
	import RadioFilter from './RadioFilter.svelte';
	import DateRangeFilter from './DateRangeFilter.svelte';
    import { createEventDispatcher, onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';

	let {
		filters = [],
		showResetButton = true,
		autoApply = true
	} = $props<{
		filters: FilterConfig[];
		showResetButton?: boolean;
		autoApply?: boolean;
	}>();

	const dispatch = createEventDispatcher<{
		filter: FilterState;
		reset: void;
		filterChange: FilterState;
	}>();

	let filterState = $state<FilterState>({});
	let isInitializedFromUrl = false;

    $effect(() => {
        const newState = { ...filterState };
        let hasChanged = false;

        // Ensure all filter keys from the prop have a corresponding entry in the state
        filters.forEach((filter: any) => {
            if (!(filter.key in newState)) {
                hasChanged = true;
                // Initialize with default value
                switch (filter.type) {
                    case 'checkbox':
                        newState[filter.key] = filter.defaultValue || [];
                        break;
                    case 'dateRange':
                        newState[filter.key] = filter.defaultValue || { start: '', end: '' };
                        break;
                    default:
                        newState[filter.key] = filter.defaultValue || '';
                }
            }
        });

        // One-time initialization from URL params after the first valid filters are received
        if (!isInitializedFromUrl && filters.length > 0) {
            const urlParams = $page.url.searchParams;
            filters.forEach((filter: any) => {
                const paramValue = urlParams.get(filter.key);
                if (paramValue) {
                    hasChanged = true;
                    switch (filter.type) {
                        case 'checkbox':
                            newState[filter.key] = paramValue.split(',').filter((v: string) => v.trim());
                            break;
                        case 'dateRange':
                            const [start, end] = paramValue.split(',');
                            newState[filter.key] = {
                                start: start?.trim() || '',
                                end: end?.trim() || ''
                            };
                            break;
                        default:
                            newState[filter.key] = paramValue;
                    }
                }
            });
            isInitializedFromUrl = true;
        }

        if (hasChanged) {
            filterState = newState;
        }
    });

    async function handleFilterChange(key: string, value: any) {
        const normalized = Array.isArray(value)
            ? [...value]
            : value ?? (filters.find((f: any) => f.key === key)?.type === 'checkbox' ? [] : '');
        filterState[key] = normalized;
        await tick();
        if (autoApply) {
            // Dispatch a plain JSON to avoid proxy surprises
            const plain = JSON.parse(JSON.stringify(filterState));
            dispatch('filterChange', plain);
            // Backward-compatible event
            dispatch('filter', plain);
            return;
        }
    }

    function applyFilters() {
        const plain = JSON.parse(JSON.stringify(filterState));
        dispatch('filterChange', plain);
        dispatch('filter', plain);
    }

	function resetFilters() {
		const resetState: FilterState = {};
		filters.forEach((filter: FilterConfig) => {
			switch (filter.type) {
				case 'checkbox':
					resetState[filter.key] = [];
					break;
				case 'dateRange':
					resetState[filter.key] = { start: '', end: '' };
					break;
				default:
					// For radio filters, always reset to empty string (All Types)
					resetState[filter.key] = '';
			}
		});
		
		filterState = resetState;
		
		// Dispatch filter change event for API-based approach
		dispatch('filterChange', filterState);
		
		// Also dispatch the original reset event for backward compatibility
		dispatch('reset');
	}

	// Check if any filters are active (different from default values)
	let hasActiveFilters = $derived(() => {
		return filters.some((filter: FilterConfig) => {
			const currentValue = filterState[filter.key];
			const defaultValue = filter.defaultValue;
			
			if (filter.type === 'checkbox') {
				const currentArray = currentValue || [];
				const defaultArray = defaultValue || [];
				return currentArray.length > 0 && currentArray.length !== defaultArray.length;
			} else if (filter.type === 'dateRange') {
				const current = currentValue || { start: '', end: '' };
				return current.start || current.end;
			} else {
				// For radio filters, check if the value is not empty and not the "All" option
				return currentValue && currentValue !== '' && currentValue !== null && currentValue !== undefined;
			}
		});
	});
</script>

<div class="filter-container">
	<div class="filter-table">
		{#each filters as filter (filter.key)}
			{#if filterState[filter.key] !== undefined}
				<div class="filter-row">
					<div class="filter-label">
						{filter.label}
					</div>
					<div class="filter-content">
						{#if filter.type === 'checkbox'}
							<CheckboxFilter
								label=""
								options={filter.options || []}
								bind:value={filterState[filter.key]}
								groupByCategory={filter.groupByCategory || false}
								selectedCategories={filter.key === 'subcategory' ? (filterState.category || []) : []}
								on:change={(e: any) => handleFilterChange(filter.key, e.detail)}
							/>
						{:else if filter.type === 'radio'}
							<RadioFilter
								label=""
								options={filter.options || []}
								bind:value={filterState[filter.key]}
								groupName={filter.key}
								on:change={(e: any) => handleFilterChange(filter.key, e.detail)}
							/>
						{:else if filter.type === 'dateRange'}
							<DateRangeFilter
								label=""
								bind:value={filterState[filter.key]}
								on:change={(e: any) => handleFilterChange(filter.key, e.detail)}
							/>
						{/if}
					</div>
				</div>
			{/if}
		{/each}
		
		{#if showResetButton && hasActiveFilters() || !autoApply}
			<div class="filter-row">
				<div class="filter-label">Actions</div>
				<div class="filter-content">
					<div class="flex gap-2">
						{#if showResetButton && hasActiveFilters()}
							<button
								class="btn btn-outline btn-sm"
								onclick={resetFilters}
								title="Reset all filters"
							>
								<Icon icon="mdi:filter-off" />
								Reset
							</button>
						{/if}
						
						{#if !autoApply}
							<button
								class="btn btn-primary btn-sm"
								onclick={applyFilters}
							>
								<Icon icon="mdi:filter" />
								Apply Filters
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.filter-container {
		padding: 1rem;
		background-color: var(--fallback-b2, oklch(var(--b2)));
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.filter-table {
		display: grid;
		grid-template-columns: 150px 1fr;
		gap: 0;
		border-collapse: collapse;
	}

	.filter-row {
		display: contents;
	}

	.filter-label {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.2));
		font-weight: 500;
		background-color: var(--fallback-b3, oklch(var(--b3)));
		display: flex;
		align-items: center;
	}

	.filter-content {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.2));
		border-left: 1px solid var(--fallback-bc, oklch(var(--bc) / 0.2));
		display: flex;
		align-items: center;
	}

	/* Remove bottom border from last row */
	.filter-row:last-child .filter-label,
	.filter-row:last-child .filter-content {
		border-bottom: none;
	}
	
	/* Override child component styles to remove unnecessary spacing */
	:global(.filter-content .filter-group) {
		min-width: auto;
		margin: 0;
	}
	
	:global(.filter-content .filter-group .text-sm.font-medium) {
		display: none;
	}
</style> 