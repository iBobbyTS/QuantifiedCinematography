<script lang="ts">
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import Navbar from '$lib/components/Navbar.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import CameraForm from '$lib/components/CameraForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isLoading = false;
	let toastManager: ToastManager;

	// Store original values for comparison
	let originalBrandId = $state(data.camera.brandId);
	let originalModelName = $state(data.camera.name);
	let originalReleaseYear = $state(data.camera.releaseYear);
	let originalIsCinema = $state(data.camera.cinema || false);

	async function handleSubmit(formData: {
		brandId: number;
		modelName: string;
		releaseYear: number;
		isCinema: boolean;
	}) {
		isLoading = true;

		try {
			const fd = new FormData();
			fd.set('brandId', String(formData.brandId));
			fd.set('name', formData.modelName);
			fd.set('releaseYear', String(formData.releaseYear));
			fd.set('cinema', String(formData.isCinema));

			const response = await fetch('?/updateCamera', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				let success = false;
				let errorMessage = 'Failed to update camera';
				try {
					const envelope = await response.json();
					if (envelope?.type === 'success') {
						success = true;
					} else if (envelope?.type === 'failure') {
						if (envelope.data?.message) errorMessage = envelope.data.message;
					}
				} catch {}

				if (success) {
					toastManager.showToast({
						title: m['camera.edit.success'](),
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 3000,
						showCountdown: true
					});
					// Redirect to manage page after a short delay
					setTimeout(() => {
						goto('/camera/manage');
					}, 1000);
				} else {
					toastManager.showToast({
						title: m['camera.edit.failure'](),
						message: errorMessage,
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
				}
			} else {
				toastManager.showToast({
					title: m['camera.edit.failure'](),
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Error updating camera:', error);
			toastManager.showToast({
				title: m['camera.edit.network_error'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{m['camera.edit.title']()} - {m['app.title']()}</title>
</svelte:head>

<Navbar
	centerTitle="camera.edit.title"
	showBackButton={true}
	backButtonUrl="/camera/manage"
	backButtonText="camera.manage.title"
/>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="max-w-[20em] mx-auto">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
					{m['camera.edit.title']()}
				</h1>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{m['camera.edit.subtitle']()}
				</p>
			</div>

			<!-- Form -->
			<CameraForm
				initialBrandId={data.camera.brandId}
				initialBrandName={data.camera.brandName || ''}
				initialModelName={data.camera.name}
				initialReleaseYear={data.camera.releaseYear}
				initialIsCinema={data.camera.cinema || false}
				cameraId={data.camera.id}
				originalBrandId={originalBrandId}
				originalModelName={originalModelName}
				originalReleaseYear={originalReleaseYear}
				originalIsCinema={originalIsCinema}
				onSubmit={handleSubmit}
				isLoading={isLoading}
				submitButtonText={m['camera.edit.buttons.update']()}
				submitButtonLoadingText={m['camera.edit.buttons.updating']()}
				submitButtonIcon="mdi:content-save"
			/>
		</div>
	</div>
</div>

<ToastManager bind:this={toastManager} />
