<!--
  @fileoverview Confirm Modal component
  
  Provides a reusable confirmation modal with customizable title, message, and actions.
  Supports responsive design and consistent styling with other modals.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	let {
		isOpen = $bindable(),
		title = 'Confirm Action',
		message = 'Are you sure you want to proceed?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		confirmButtonColor = 'btn-error',
		showIcon = true,
		iconName = 'mdi:alert-circle',
		iconColor = 'text-red-500'
	} = $props<{
		isOpen: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		confirmButtonColor?: string;
		showIcon?: boolean;
		iconName?: string;
		iconColor?: string;
	}>();

	const dispatch = createEventDispatcher<{
		confirm: void;
		cancel: void;
	}>();

	function handleConfirm() {
		dispatch('confirm');
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
		aria-labelledby="confirm-modal-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center space-x-3">
					{#if showIcon}
						<Icon icon={iconName} class="w-6 h-6 {iconColor}" />
					{/if}
					<h3 id="confirm-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
						{title}
					</h3>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
					{message}
				</p>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
				<button
					onclick={handleCancel}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					{cancelText}
				</button>
				<button
					onclick={handleConfirm}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 {confirmButtonColor}"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
