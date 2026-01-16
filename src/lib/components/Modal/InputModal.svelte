<!--
  @fileoverview Input Modal component
  
  Provides a reusable input modal with customizable title, message, and actions.
  Based on ConfirmModal.
-->

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	let {
		isOpen = $bindable(),
		title = 'Input Required',
		message = 'Please enter a value:',
		inputValue = $bindable(''),
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		confirmButtonColor = 'btn-primary',
		showIcon = true,
		iconName = 'mdi:pencil',
		iconColor = 'text-blue-500',
		placeholder = ''
	} = $props<{
		isOpen: boolean;
		title?: string;
		message?: string;
		inputValue?: string;
		confirmText?: string;
		cancelText?: string;
		confirmButtonColor?: string;
		showIcon?: boolean;
		iconName?: string;
		iconColor?: string;
		placeholder?: string;
	}>();

	const dispatch = createEventDispatcher<{
		confirm: string;
		cancel: void;
	}>();

	let inputElement: HTMLInputElement | null = $state(null);

	// Focus input when modal opens
	$effect(() => {
		if (isOpen && inputElement) {
			// Use setTimeout to ensure the modal is fully rendered
			setTimeout(() => {
				inputElement?.focus();
			}, 0);
		}
	});

	function handleConfirm() {
		dispatch('confirm', inputValue);
		isOpen = false;
	}

	function handleCancel() {
		dispatch('cancel');
		isOpen = false;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		} else if (event.key === 'Enter') {
			handleConfirm();
		}
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="input-modal-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center space-x-3">
					{#if showIcon}
						<Icon icon={iconName} class="w-6 h-6 {iconColor}" />
					{/if}
					<h3 id="input-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
						{title}
					</h3>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
					{message}
				</p>
			<input
				type="text"
				bind:value={inputValue}
				bind:this={inputElement}
				{placeholder}
				class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
			/>
			</div>

			<!-- Footer -->
			<div
				class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3"
			>
				<button
					onclick={handleCancel}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-600 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					{cancelText}
				</button>
				<button
					onclick={handleConfirm}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 {confirmButtonColor} dark:bg-blue-500 dark:hover:bg-blue-600"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
