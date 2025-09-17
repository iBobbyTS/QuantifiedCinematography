<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Navbar from '../lib/components/Navbar.svelte';
	import Card from '../lib/components/Card.svelte';
	import { UserPermissions, USER_PERMISSIONS } from '../lib/permission/bitmask.js';
	
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
			console.error(m['app.networkError'](), error);
			productCount = 0;
		}
	}
	
	// 检查用户是否为管理员
	$: isAdministrator = $page.data.user && UserPermissions.hasPermission($page.data.user.permission, USER_PERMISSIONS.ADMINISTRATOR);
	
	// 检查用户是否具有灯光权限
	$: hasLightPermission = $page.data.user && UserPermissions.hasPermission($page.data.user.permission, USER_PERMISSIONS.LIGHT);
	
	// 管理员卡片配置数据
	$: adminCards = [
		{
			title: m['administrator.user_management.title'](),
			description: m['administrator.user_management.description'](),
			buttons: [
				{
				text: m['administrator.user_management.button'](),
					color: 'red',
					onClick: () => goto('/admin/manage-users')
				}
			],
			color: 'red'
		}
	];
	
	// 数据提供方灯光卡片配置数据
	$: dataProviderLightingCards = [
		{
			title: m['data_provider_lighting.recorded_lighting_products.title']({ count: productCount.toString() }),
			description: m['data_provider_lighting.recorded_lighting_products.description'](),
			buttons: [
				{
				text: m['data_provider_lighting.recorded_lighting_products.button'](),
					color: 'blue',
					onClick: () => console.log('Manage Lighting Products')
				},
				{
				text: m['data_provider_lighting.lighting_accessories.button'](),
					color: 'blue',
					onClick: () => console.log('Manage Lighting Accessories')
				},
				{
				text: m['data_provider_lighting.spectrometer.button'](),
					color: 'blue',
					onClick: () => console.log('Manage Spectrometer')
				}
			],
			color: 'blue'
		},
		{
			title: m['data_provider_lighting.data_upload.title'](),
			description: m['data_provider_lighting.data_upload.description'](),
			buttons: [
				{
				text: m['data_provider_lighting.data_upload.white_light_test'](),
					color: 'blue',
					onClick: () => console.log('White Light Test Data')
				},
				{
				text: m['data_provider_lighting.data_upload.color_light_test'](),
					color: 'blue',
					onClick: () => console.log('Color Light Test Data')
				}
			],
			color: 'blue'
		}
	];
	
	// 卡片配置数据
	$: cards = [
		{
			title: m['lighting.products.title']({ count: productCount.toString() }),
			description: m['lighting.products.description'](),
			buttons: [
				{
				text: m['lighting.products.button'](),
					color: 'blue',
					onClick: () => console.log('Browse all lighting products')
				}
			],
			color: 'blue'
		},
		{
			title: m['lighting.brightness.title'](),
			description: m['lighting.brightness.description'](),
			buttons: [
				{
				text: m['lighting.brightness.buttons.cct_illuminance'](),
					color: 'green',
					onClick: () => console.log('CCT vs Illuminance')
				},
				{
				text: m['lighting.brightness.buttons.brightness_illuminance'](),
					color: 'green',
					onClick: () => console.log('Brightness vs Illuminance')
				}
			],
			color: 'green'
		},
		{
			title: m['lighting.white_light_quality.title'](),
			description: m['lighting.white_light_quality.description'](),
			buttons: [
				{
				text: m['lighting.white_light_quality.buttons.cct_vs_actual'](),
					color: 'orange',
					onClick: () => console.log('CCT vs Actual CCT')
				},
				{
				text: m['lighting.white_light_quality.buttons.cct_vs_duv'](),
					color: 'orange',
					onClick: () => console.log('CCT vs D\'uv')
				},
				{
				text: m['lighting.white_light_quality.buttons.brightness_vs_duv'](),
					color: 'orange',
					onClick: () => console.log('Brightness vs D\'uv')
				},
				{
				text: m['lighting.white_light_quality.buttons.cct_vs_color_rendering'](),
					color: 'orange',
					onClick: () => console.log('CCT vs Color Rendering')
				},
				{
				text: m['lighting.white_light_quality.buttons.spectrum'](),
					color: 'orange',
					onClick: () => console.log('Spectrum')
				}
			],
			color: 'orange'
		},
		{
			title: m['lighting.color_light.title'](),
			description: m['lighting.color_light.description'](),
			buttons: [
				{
				text: m['lighting.color_light.button'](),
					color: 'purple',
					onClick: () => console.log('RGB Pure Color vs Illuminance')
				}
			],
			color: 'purple'
		}
	];
	
	// 组件挂载时加载产品数量
	onMount(() => {
		loadProductCount();
	});
</script>

<svelte:head>
	<title>{m['intro.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 pt-16">
	<!-- Navbar -->
	<Navbar centerTitle="app.title" />
	
	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Introduction Card -->
		<div class="w-4/5 mx-auto mb-12 lg:w-4/5 xl:w-4/5">
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
					{m['intro.title']()}
				</h1>
				<p class="text-lg text-gray-600 dark:text-gray-400 text-center leading-relaxed">
					{m['intro.description']()}
				</p>
			</div>
		</div>
		
		<!-- Administrator Section (Only visible to administrators) -->
		{#if isAdministrator}
			<div class="mb-12">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
					{m['administrator.title']()}
				</h2>
				
				<!-- Admin Cards Grid Container -->
				<div class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
					{#each adminCards as card}
						<Card
							title={card.title}
							description={card.description}
							buttons={card.buttons}
							color={card.color}
						/>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- Data Provider - Lighting Section (Only visible to users with LIGHT permission) -->
		{#if hasLightPermission}
			<div class="mb-12">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
					{m['data_provider_lighting.title']()}
				</h2>
				
				<!-- Data Provider Lighting Cards Grid Container -->
				<div class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
					{#each dataProviderLightingCards as card}
						<Card
							title={card.title}
							description={card.description}
							buttons={card.buttons}
							color={card.color}
						/>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- Lighting Section -->
		<div class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
				{m['lighting.title']()}
			</h2>
			
			<!-- Cards Grid Container -->
			<div class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
				{#each cards as card}
					<Card
						title={card.title}
						description={card.description}
						buttons={card.buttons}
						color={card.color}
					/>
				{/each}
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
