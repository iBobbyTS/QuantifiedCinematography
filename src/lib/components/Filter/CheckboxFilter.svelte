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
		selectedCategories = []
	} = $props<{
		label: string;
		options: FilterOption[];
		value: (string | number)[];
		groupByCategory?: boolean;
		selectedCategories?: string[];
	}>();

	const dispatch = createEventDispatcher<{ change: (string | number)[] }>();

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
</script>

<div class="filter-group">
	{#if label}
		<div class="text-sm font-medium text-gray-700 mb-2 block">{label}</div>
	{/if}
	<div class="flex flex-col gap-3">
		{#each categoryGroups as group (group.category)}
			<div class="flex flex-wrap gap-3">
				{#each group.options as option (option.value)}
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							class="checkbox checkbox-sm"
							bind:group={value}
							value={option.value}
							onchange={handleChange}
						/>
						<span class="text-sm">{option.label}</span>
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