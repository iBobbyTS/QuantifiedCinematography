<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Navbar from '../lib/components/Navbar.svelte';
	
	// 产品数量状态
	let productCount = 0;
	
	// 加载产品数量
	async function loadProductCount() {
		try {
			// 这里应该调用实际的API，现在先用模拟数据
			// const response = await fetch('/api/products/count');
			// const data = await response.json();
			// productCount = data.count;
			
			// 模拟数据
			productCount = 42;
		} catch (error) {
			console.error('Failed to load product count:', error);
			productCount = 0;
		}
	}
	
	// 组件挂载时加载产品数量
	onMount(() => {
		loadProductCount();
	});
</script>

<svelte:head>
	<title>Quantified Cinematography</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
	<!-- Navbar -->
	<Navbar centerTitle="app.title" />
	
	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Introduction Card -->
		<div class="w-4/5 mx-auto mb-12 lg:w-4/5 xl:w-4/5">
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
					{$_('testing.intro.title')}
				</h1>
				<p class="text-lg text-gray-600 dark:text-gray-400 text-center leading-relaxed">
					{$_('testing.intro.description')}
				</p>
			</div>
		</div>
		
		<!-- Lighting Section -->
		<div class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
				{$_('testing.lighting.title')}
			</h2>
			
			<!-- Cards Grid Container -->
			<div class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
				<!-- Products Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.products.title').replace('{{count}}', productCount.toString())}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.products.description')}
					</p>
					<button class="w-full border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-gray-900">
						{$_('testing.lighting.products.button')}
					</button>
				</div>
				
				<!-- Brightness Testing Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.brightness.title')}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.brightness.description')}
					</p>
					
					<!-- Brightness Test Buttons -->
					<div class="space-y-3">
						<button class="w-full border-2 border-green-800 text-green-800 hover:bg-green-600 hover:border-green-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400 dark:hover:text-gray-900">
							{$_('testing.lighting.brightness.buttons.cct_illuminance')}
						</button>
						<button class="w-full border-2 border-green-800 text-green-800 hover:bg-green-600 hover:border-green-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400 dark:hover:text-gray-900">
							{$_('testing.lighting.brightness.buttons.brightness_illuminance')}
						</button>
					</div>
				</div>
				
				<!-- White Light Quality Testing Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.white_light_quality.title')}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.white_light_quality.description')}
					</p>
					
					<!-- Quality Test Buttons -->
					<div class="space-y-3">
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.cct_vs_actual')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.cct_vs_duv')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.brightness_vs_duv')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.cct_vs_color_rendering')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.spectrum')}
						</button>
					</div>
				</div>
				
				<!-- Color Light Testing Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.color_light.title')}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.color_light.description')}
					</p>
					<button class="w-full border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400 dark:hover:text-gray-900">
						{$_('testing.lighting.color_light.button')}
					</button>
				</div>
			</div>
		</div>
	</main>
</div>

<style>
	/* 响应式设计 */
	@media (max-width: 1024px) {
		.w-4\/5 {
			width: 100%;
		}
	}
</style>
