<!--
  @fileoverview Radio filter component
  
  Provides a radio button group filter with single selection support.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import type { FilterOption } from './types.js';
	import { createEventDispatcher } from 'svelte';

	let {
		label,
		options = [],
		value = $bindable(''),
		groupName
	} = $props<{
		label: string;
		options: FilterOption[];
		value: string | number;
		groupName?: string;
	}>();

	const dispatch = createEventDispatcher<{ change: string | number }>();

	function handleChange() {
		dispatch('change', value);
	}
</script>

<div class="filter-group">
	{#if label}
		<div class="text-sm font-medium text-gray-700 mb-2 block">{label}</div>
	{/if}
	<div class="flex flex-wrap gap-3">
		{#each options as option (option.value)}
			<label class="flex items-center gap-2 cursor-pointer">
				<input
					type="radio"
					class="radio radio-sm"
					bind:group={value}
					value={option.value}
					name={groupName || label}
					onchange={handleChange}
				/>
				<span class="text-sm">{option.label}</span>
			</label>
		{/each}
	</div>
</div>

<style>
	.filter-group {
		min-width: 200px;
	}
</style> 