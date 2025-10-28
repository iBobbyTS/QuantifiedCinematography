<!--
  @fileoverview Checkbox filter component
  
  Provides a checkbox group filter with multiple selection support.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import type { FilterOption } from './types.js';
	import { createEventDispatcher } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

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
		<div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{label}</div>
	{/if}
	
	{#if showAllAnySwitch}
		<div class="mb-3">
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-600 dark:text-gray-400">{m['administrator.manage_users.permission_modal.filter.match_mode']()}</span>
				<div class="btn-group">
					<button
						type="button"
						class="btn btn-sm {matchMode === 'any' 
							? 'btn-active bg-blue-600 dark:bg-blue-500 text-white dark:text-white border-blue-600 dark:border-blue-500 shadow-md dark:shadow-blue-500/25' 
							: 'btn-outline text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'} transition-all duration-200"
						onclick={() => { matchMode = 'any'; handleMatchModeChange(); }}
					>
						{m['administrator.manage_users.permission_modal.filter.any']()}
					</button>
					<button
						type="button"
						class="btn btn-sm {matchMode === 'all' 
							? 'btn-active bg-blue-600 dark:bg-blue-500 text-white dark:text-white border-blue-600 dark:border-blue-500 shadow-md dark:shadow-blue-500/25' 
							: 'btn-outline text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'} transition-all duration-200"
						onclick={() => { matchMode = 'all'; handleMatchModeChange(); }}
					>
						{m['administrator.manage_users.permission_modal.filter.all']()}
					</button>
				</div>
			</div>
		</div>
	{/if}
	
	<div class="flex flex-col gap-3">
		{#each categoryGroups as group (group.category)}
			<div class="flex flex-wrap gap-3">
				{#each group.options as option (option.value)}
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							class="checkbox checkbox-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
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