<script lang="ts">
	import { page } from '$app/stores';
	import { m } from '$lib/paraglide/messages';

	// Get error from page store
	$: errorData = $page.error;
	$: isDatabaseError = errorData?.code === 'DATABASE_NOT_INITIALIZED';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
	<div class="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
		<div class="mb-6">
			<svg
				class="mx-auto h-16 w-16 text-red-500 dark:text-red-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
		</div>

		{#if isDatabaseError}
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
				Website database not initialized
			</h1>
			<p class="text-gray-600 dark:text-gray-300 mb-6">
				The database tables have not been created yet. Please run the database migration to initialize the database.
			</p>
			<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-left">
				<p class="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-2">To fix this:</p>
				<code class="text-xs text-yellow-900 dark:text-yellow-100 block bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded">
					docker compose -f docker-compose.prod.yml exec app bun run db:push
				</code>
			</div>
		{:else}
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
				{errorData?.status || 'Error'} - {errorData?.message || 'An error occurred'}
			</h1>
			<p class="text-gray-600 dark:text-gray-300 mb-6">
				{errorData?.code || 'INTERNAL_ERROR'}
			</p>
		{/if}

		<div class="mt-8">
			<a
				href="/"
				class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
			>
				Go to Homepage
			</a>
		</div>
	</div>
</div>
