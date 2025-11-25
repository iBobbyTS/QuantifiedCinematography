<!--
@fileoverview Brand dropdown search component for selecting camera brands
-->
<script lang="ts">
	import DropdownSearch from '$lib/components/DropdownSearch/DropdownSearch.svelte';
	import InputModal from '$lib/components/Modal/InputModal.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { createEventDispatcher, onMount, tick } from 'svelte';

	let {
		initialBrandId = -1,
		initialBrandName = '',
		readonly = false
	}: {
		initialBrandId?: number;
		initialBrandName?: string;
		readonly?: boolean;
	} = $props();

	const dispatch = createEventDispatcher();

	// Set initial input value
	let inputValue = initialBrandName;
	let dropdownSearchComponent = $state<DropdownSearch | null>(null);
	let showAddBrandModal = false;
	let newBrandName = '';

	// Initialize component with initial values
	$effect(() => {
		if (initialBrandName && initialBrandId > 0) {
			inputValue = initialBrandName;
		}
	});

	// Handle initial values on mount
	onMount(async () => {
		if (initialBrandName && initialBrandId > 0) {
			await tick();
			dropdownSearchComponent?.setInputValue?.(initialBrandName);
		}
	});

	// Ensure input retains value when toggling readonly
	$effect(() => {
		if (!readonly && dropdownSearchComponent && initialBrandName && initialBrandId > 0) {
			dropdownSearchComponent.setInputValue?.(initialBrandName);
		}
	});

	// Search function for brands
	async function searchBrands(query: string) {
		if (readonly) {
			return [];
		}

		try {
			const response = await fetch('/api/camera/search/brand', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			});

			if (!response.ok) {
				throw new Error('Failed to search brands');
			}

			const data = await response.json();
			return data.brands.map((brand: any) => ({
				id: brand.id,
				title: brand.name,
				sub1: '', // No subtitle needed for brands usually
				sub2: ''
			}));
		} catch (error) {
			console.error('Error searching brands:', error);
			return [];
		}
	}

	// Validation function for brands (optional, can reuse search or implement specific validate endpoint)
	// For now, we'll assume validation happens via selection or we can implement a specific validate endpoint if needed.
	// Given the requirement "backend corresponding query api also needs to be done /api/camera/search/brand",
	// we will focus on search. If validation is needed for free text entry, we might need another endpoint,
	// but DropdownSearch usually enforces selection from list or allows custom.
	// Assuming we want to select from existing brands.
	async function validateBrand(query: string) {
		if (readonly) {
			return { valid: false };
		}

		// For simplicity, we can use the search endpoint to validate if an exact match exists
		// Or implement a specific validate endpoint. Let's stick to search for now or implement a simple check.
		// Ideally, we should have a validate endpoint. Let's assume we might add one or just rely on search.
		// But UserDropdownSearch has validateUser. Let's implement a simple validate using search for now
		// or just return valid: false if we want to force selection.
		// Actually, let's implement a validate endpoint to be consistent with UserDropdownSearch pattern if possible,
		// but the user only asked for /api/camera/search/brand.
		// Let's try to use search to validate for now to avoid extra endpoints if not strictly requested,
		// but for robustness, a validate endpoint is better.
		// Let's implement a basic validate that calls search and checks for exact match.

		try {
			const response = await fetch('/api/camera/search/brand', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query }) // Search for the exact name
			});

			if (!response.ok) {
				return { valid: false };
			}

			const data = await response.json();
			const exactMatch = data.brands.find((b: any) => b.name.toLowerCase() === query.toLowerCase());

			if (exactMatch) {
				return {
					valid: true,
					id: exactMatch.id,
					title: exactMatch.name,
					sub1: '',
					sub2: ''
				};
			}
			return { valid: false };
		} catch (error) {
			console.error('Error validating brand:', error);
			return { valid: false };
		}
	}

	async function handleAddBrand(name: string) {
		try {
			const response = await fetch('/api/camera/brand/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (!response.ok) {
				throw new Error('Failed to add brand');
			}

			const data = await response.json();
			if (data.success && data.brand) {
				// Close modal
				showAddBrandModal = false;

				// Update dropdown
				await tick();
				dropdownSearchComponent?.setInputValue?.(data.brand.name);

				// Dispatch select event
				dispatch('select', { id: data.brand.id, title: data.brand.name });

				// Trigger validation to turn green
				dropdownSearchComponent?.revalidate?.();
			}
		} catch (error) {
			console.error('Error adding brand:', error);
		}
	}

	function handleSelect(event: CustomEvent) {
		dispatch('select', event.detail);
	}

	function handleValidation(event: CustomEvent) {
		dispatch('validation', event.detail);
	}
</script>

{#if readonly}
	<input class="input input-bordered w-full" value={initialBrandName} readonly disabled />
{:else}
	<DropdownSearch
		bind:this={dropdownSearchComponent}
		searchFn={searchBrands}
		validateFn={validateBrand}
		placeholder={m['camera.add.brand_search.placeholder']()}
		debounce={400}
		showAddButton={true}
		addButtonText={m['camera.add.brand_search.add_brand']()}
		on:select={handleSelect}
		on:validation={handleValidation}
	>
		<svelte:fragment slot="add-modal" let:showAddModal let:addModalInputValue>
			<InputModal
				isOpen={showAddModal}
				title={m['camera.add.brand_search.add_modal.title']()}
				message={m['camera.add.brand_search.add_modal.message']()}
				inputValue={addModalInputValue}
				confirmText={m['camera.add.brand_search.add_modal.confirm']()}
				cancelText={m['camera.add.brand_search.add_modal.cancel']()}
				on:confirm={(e) => {
					handleAddBrand(e.detail);
					dropdownSearchComponent?.closeAddModal?.();
				}}
				on:cancel={() => dropdownSearchComponent?.closeAddModal?.()}
			/>
		</svelte:fragment>
	</DropdownSearch>
{/if}
