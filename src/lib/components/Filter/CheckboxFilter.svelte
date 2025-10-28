<!--
  @fileoverview Checkbox filter component
  
  Provides a checkbox group filter with multiple selection support.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import type { FilterOption } from './types.js';
	import { createEventDispatcher } from 'svelte';

	let {
		label,
		options = [],
		value = $bindable([]),
		groupByCategory = false,
		selectedCategories = [],
		showAllAnySwitch = false,
		matchMode = $bindable('any') // 'any' or 'all'
	} = $props<{
		label: string;
		options: FilterOption[];
		value: (string | number)[];
		groupByCategory?: boolean;
		selectedCategories?: string[];
		showAllAnySwitch?: boolean;
		matchMode?: 'any' | 'all';
	}>();

	const dispatch = createEventDispatcher<{ 
		change: (string | number)[];
		matchModeChange: 'any' | 'all';
	}>();

	// Group options by category if groupByCategory is true
	let categoryGroups = $state<{ category: string; options: FilterOption[] }[]>([]);
	
	$effect(() => {
		if (!groupByCategory) {
			// Return single group with all options
			categoryGroups = [{ category: 'all', options }];
			return;
		}

		// Group by category (assuming options have category property)
		const groups: Record<string, FilterOption[]> = {};
		options.forEach((option: FilterOption) => {
			const category = (option as any).category;
			if (!category) {
				return; // Skip options without category
			}
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(option);
		});

		// Ensure selectedCategories is an array
		const safeSelectedCategories = Array.isArray(selectedCategories) ? selectedCategories : [];
		
		// Filter groups based on selectedCategories
		const filteredGroups = Object.entries(groups).filter(([category]) => {
			// If no categories are selected, show all
			if (safeSelectedCategories.length === 0) {
				return true;
			}
			// Only show categories that are selected
			return safeSelectedCategories.includes(category);
		});

		categoryGroups = filteredGroups.map(([category, options]) => ({
			category,
			options
		}));
	});

	function handleChange() {
		dispatch('change', value);
	}

	function handleMatchModeChange() {
		dispatch('matchModeChange', matchMode);
	}
</script>

<div class="filter-group">
	{#if label}
		<div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{label}</div>
	{/if}
	
	{#if showAllAnySwitch}
		<div class="mb-3">
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-600 dark:text-gray-400">匹配模式:</span>
				<div class="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 border border-gray-200 dark:border-gray-700">
					<button
						type="button"
						class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 {matchMode === 'any' 
							? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
						onclick={() => { matchMode = 'any'; handleMatchModeChange(); }}
					>
						Any
					</button>
					<button
						type="button"
						class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 {matchMode === 'all' 
							? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
						onclick={() => { matchMode = 'all'; handleMatchModeChange(); }}
					>
						All
					</button>
				</div>
			</div>
		</div>
	{/if}
	
	<div class="flex flex-col gap-2.5">
		{#each categoryGroups as group (group.category)}
			<div class="flex flex-wrap gap-2">
				{#each group.options as option (option.value)}
					<label class="inline-flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
						<input
							type="checkbox"
							class="checkbox checkbox-sm accent-blue-600"
							bind:group={value}
							value={option.value}
							onchange={handleChange}
						/>
						<span class="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
					</label>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.filter-group {
		min-width: 200px;
	}
</style> 