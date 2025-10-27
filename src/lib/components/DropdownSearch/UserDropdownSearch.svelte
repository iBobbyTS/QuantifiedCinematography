<!--
@fileoverview User dropdown search component for selecting users with specific permissions

@author Bobby Sun
@version 1.0.0
-->
<script lang="ts">
	import DropdownSearch from '$lib/components/DropdownSearch/DropdownSearch.svelte';
	import { createEventDispatcher, onMount, tick } from 'svelte';

	let {
		initialUserId = -1,
		initialUserName = '',
		readonly = false,
		requiredPermissions = 0, // Required permissions to filter users
	}: {
		initialUserId?: number;
		initialUserName?: string;
		readonly?: boolean;
		requiredPermissions?: number;
	} = $props();

	const dispatch = createEventDispatcher();
	
	// Set initial input value
	let inputValue = initialUserName;
	let dropdownSearchComponent = $state<DropdownSearch | null>(null);

	// Initialize component with initial values
	$effect(() => {
		// Always set the input value when initialUserName changes, regardless of readonly state
		if (initialUserName && initialUserId > 0) {
			inputValue = initialUserName;
		}
	});
	
	// Handle initial values on mount (similar to ContactDropdownSearch)
	onMount(async () => {
		if (initialUserName && initialUserId > 0) {
			// Use setInputValue method to set the initial value
			await tick();
			dropdownSearchComponent?.setInputValue?.(initialUserName);
		}
	});

	// Ensure input retains value when toggling readonly
	$effect(() => {
		if (!readonly && dropdownSearchComponent && initialUserName && initialUserId > 0) {
			dropdownSearchComponent.setInputValue?.(initialUserName);
		}
	});

	// Search function for users
	async function searchUsers(query: string) {
		// If readonly, don't search
		if (readonly) {
			return [];
		}
		
		try {
			const response = await fetch('/api/admin/users/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					query,
					requiredPermissions 
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to search users');
			}

			const data = await response.json();
			return data.users.map((user: any) => ({
				id: user.id,
				title: user.nickname,
				sub1: user.username,
				sub2: user.email
			}));
		} catch (error) {
			console.error('Error searching users:', error);
			return [];
		}
	}

	// Validation function for users
	async function validateUser(query: string) {
		// If readonly, don't validate
		if (readonly) {
			return { valid: false };
		}
		
		try {
			const response = await fetch('/api/admin/users/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					query,
					requiredPermissions 
				}),
			});

			if (!response.ok) {
				return { valid: false };
			}

			const data = await response.json();
			if (data.valid && data.user) {
				return {
					valid: true,
					id: data.user.id,
					title: data.user.nickname,
					sub1: data.user.username,
					sub2: data.user.email
				};
			}
			return { valid: false };
		} catch (error) {
			console.error('Error validating user:', error);
			return { valid: false };
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
	<!-- Show readonly input with initial value -->
	<input
		class="input input-bordered w-full"
		value={initialUserName}
		readonly
		disabled
	/>

{:else}
	<DropdownSearch
		bind:this={dropdownSearchComponent}
		searchFn={searchUsers}
		validateFn={validateUser}
		placeholder="Search users..."
		debounce={400}
		showAddButton={false}
		on:select={handleSelect}
		on:validation={handleValidation}
	/>

{/if} 