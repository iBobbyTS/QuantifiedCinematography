<!--
  @fileoverview Modal dialog component
  
  Provides a reusable modal dialog with customizable title, message, actions,
  and content. Supports responsive design and automatic centering based on content size.
  
  @author Raymond Li
  @version 1.0.0
-->

<script lang="ts">
	let {
		isOpen = $bindable(),
		title,
		message,
		showActions = true,
		primaryButtonText = 'OK',
		secondaryButtonText = 'Cancel',
		hidePrimaryButton = false,
		primaryButtonColor = '',
		onprimary,
		onsecondary,
		modalWidth = '',
		children = undefined,
		isLoading = false,
	} = $props();

	let modalElement: HTMLDivElement | undefined = $state();
	let shouldCenter = $state(true);

	function handlePrimary() {
		onprimary();
	}

	function handleSecondary() {
		onsecondary();
	}

	function checkIfShouldCenter() {
		if (modalElement) {
			const modalHeight = modalElement.scrollHeight;
			const viewportHeight = window.innerHeight;
			shouldCenter = modalHeight + 160 < viewportHeight; // 160px = 5rem * 2 for margins
		}
	}

	$effect(() => {
		if (isOpen && modalElement) {
			checkIfShouldCenter();

			const resizeObserver = new ResizeObserver(() => {
				checkIfShouldCenter();
			});

			resizeObserver.observe(modalElement);

			const handleResize = () => checkIfShouldCenter();
			window.addEventListener('resize', handleResize);

			return () => {
				resizeObserver.disconnect();
				window.removeEventListener('resize', handleResize);
			};
		}
	});

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		title;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		message;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		children;
		if (modalElement) {
			requestAnimationFrame(checkIfShouldCenter);
		}
	});
</script>

{#if isOpen}
	<div class="modal modal-open" class:modal-scrollable={!shouldCenter}>
		<div
			class="modal-box modal-smart"
			style={modalWidth !== '' ? `max-width: ${modalWidth};` : ''}
			bind:this={modalElement}
		>
			<h3 class="font-bold text-lg mb-2">{title}</h3>
			<div class="mb-4 whitespace-pre-line">
				{message}
				{#if isLoading}
					<div class="mt-2 text-sm text-gray-600">
						<span class="loading loading-spinner loading-xs"></span>
						<span class="ml-2">Preparing CSV file...</span>
					</div>
				{/if}
			</div>
			{@render children?.()}
			{#if showActions}
				<div class="modal-action mt-4">
					<button class="btn" onclick={handleSecondary} disabled={isLoading}>
						{secondaryButtonText}
					</button>
					{#if !hidePrimaryButton}
						<button
							class={`btn ${primaryButtonColor !== '' ? primaryButtonColor : 'btn-primary'}`}
							onclick={handlePrimary}
							disabled={isLoading}
						>
							{#if isLoading}
								<span class="loading loading-spinner loading-sm"></span>
								<span class="ml-2">Loading...</span>
							{:else}
								{primaryButtonText}
							{/if}
						</button>
					{/if}
				</div>
			{/if}
		</div>
		<form class="modal-backdrop">
			<button class="hover:cursor-auto" onclick={() => (isOpen = false)}>close</button>
		</form>
	</div>
{/if}

<style>
	/* Scrollable layout for large modals */
	.modal-scrollable {
		display: block;
		overflow-y: auto;
		align-items: flex-start;
	}

	.modal-scrollable .modal-smart {
		margin: 2.5rem auto;
		position: static;
		transform: none;
	}

	.modal-smart {
		max-height: none;
		width: 100%;
		max-width: 32rem;
	}
</style>
