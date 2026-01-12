<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Navbar from '../lib/components/Navbar.svelte';
	import Card from '../lib/components/Card.svelte';
	import { UserPermissions, USER_PERMISSIONS } from '../lib/permission/bitmask.js';
	import { IS_DEVELOPING, COMPLETED_MODULES } from '../lib/constants.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// 根据 intro 标题是否可见，动态设置 Navbar 标题
	let isIntroTitleVisible = $state(true);
	let navbarCenterTitle = $derived(isIntroTitleVisible ? '' : 'app.title');

	// 产品数量状态
	let productCount = $state(0);
	
	// 相机和摄影机数量从服务器加载
	let cameraCount = $state(data.cameraCount ?? 0);
	let cinemaCount = $state(data.cinemaCount ?? 0);

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
	let isAdministrator = $derived(
		$page.data.user &&
		UserPermissions.hasPermission($page.data.user.permission, USER_PERMISSIONS.ADMINISTRATOR)
	);

	// 检查用户是否具有灯光权限
	let hasLightPermission = $derived(
		$page.data.user &&
		UserPermissions.hasPermission($page.data.user.permission, USER_PERMISSIONS.LIGHT)
	);

	// 检查用户是否具有相机权限
	let hasCameraPermission = $derived(
		$page.data.user &&
		UserPermissions.hasPermission($page.data.user.permission, USER_PERMISSIONS.CAMERA)
	);

	// 检查模块是否应该显示
	function shouldShowModule(moduleName: string): boolean {
		if (IS_DEVELOPING) {
			return true; // 开发模式下显示所有模块
		}
		return COMPLETED_MODULES.includes(moduleName); // 非开发模式下只显示已完成的模块
	}

	// 管理员卡片配置数据
	let adminCards = $derived([
		{
			id: 'admin-user-management',
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
	]);

	// 数据提供方灯光卡片配置数据
	let dataProviderLightingCards = $derived([
		{
			id: 'data-provider-lighting-products',
			title: m['data_provider_lighting.recorded_lighting_products.title']({
				count: productCount.toString()
			}),
			description: m['data_provider_lighting.recorded_lighting_products.description'](),
			buttons: [
				{
					text: m['data_provider_lighting.recorded_lighting_products.button'](),
					color: 'blue'
				},
				{
					text: m['data_provider_lighting.lighting_accessories.button'](),
					color: 'blue'
				},
				{
					text: m['data_provider_lighting.spectrometer.button'](),
					color: 'blue',
					onClick: () => goto('/spectrometer')
				}
			],
			color: 'blue'
		},
		{
			id: 'data-provider-lighting-upload',
			title: m['data_provider_lighting.data_upload.title'](),
			description: m['data_provider_lighting.data_upload.description'](),
			buttons: [
				{
					text: m['data_provider_lighting.data_upload.white_light_test'](),
					color: 'blue'
				},
				{
					text: m['data_provider_lighting.data_upload.color_light_test'](),
					color: 'blue'
				}
			],
			color: 'blue'
		}
	]);

	// 数据提供方相机卡片配置数据
	let dataProviderCameraCards = $derived([
		{
			id: 'data-provider-camera-manage',
			title: m['data_provider_camera.manage_camera.title'](),
			description: '',
			buttons: [
				{
					text: m['data_provider_camera.manage_camera.button'](),
					onClick: () => goto('/camera/manage'),
					color: 'blue'
				}
			],
			color: 'blue'
		},
		{
			id: 'data-provider-camera-upload',
			title: m['data_provider_camera.data_upload.title'](),
			description: '',
			buttons: [
				{
					text: m['data_provider_camera.data_upload.button'](),
					color: 'blue',
					onClick: () => goto('/camera/dynamic-range/upload')
				}
			],
			color: 'blue'
		}
	]);

	// 卡片配置数据
	let cards = $derived([
		{
			id: 'lighting-products',
			title: m['lighting.products.title']({ count: productCount.toString() }),
			description: m['lighting.products.description'](),
			buttons: [
				{
					text: m['lighting.products.button'](),
					color: 'blue'
				}
			],
			color: 'blue'
		},
		{
			id: 'lighting-brightness',
			title: m['lighting.brightness.title'](),
			description: m['lighting.brightness.description'](),
			buttons: [
				{
					text: m['lighting.brightness.buttons.cct_illuminance'](),
					color: 'green'
				},
				{
					text: m['lighting.brightness.buttons.brightness_illuminance'](),
					color: 'green'
				}
			],
			color: 'green'
		},
		{
			id: 'lighting-white-light-quality',
			title: m['lighting.white_light_quality.title'](),
			description: m['lighting.white_light_quality.description'](),
			buttons: [
				{
					text: m['lighting.white_light_quality.buttons.cct_vs_actual'](),
					color: 'orange'
				},
				{
					text: m['lighting.white_light_quality.buttons.cct_vs_duv'](),
					color: 'orange'
				},
				{
					text: m['lighting.white_light_quality.buttons.brightness_vs_duv'](),
					color: 'orange'
				},
				{
					text: m['lighting.white_light_quality.buttons.cct_vs_color_rendering'](),
					color: 'orange'
				},
				{
					text: m['lighting.white_light_quality.buttons.spectrum'](),
					color: 'orange'
				}
			],
			color: 'orange'
		},
		{
			id: 'lighting-color-light',
			title: m['lighting.color_light.title'](),
			description: m['lighting.color_light.description'](),
			buttons: [
				{
					text: m['lighting.color_light.button'](),
					color: 'purple'
				}
			],
			color: 'purple'
		}
	]);

	// 相机/摄影机卡片配置数据
	let cameraCards = $derived([
		{
			id: 'camera-products',
			title: m['camera.products.title']({
				cameraCount: cameraCount.toString(),
				cinemaCount: cinemaCount.toString()
			}),
			description: '',
			buttons: [
				{
					text: m['camera.products.button'](),
					color: 'blue'
				}
			],
			color: 'blue'
		},
		{
			id: 'camera-dynamic-range',
			title: m['camera.dynamic_range.title'](),
			description: m['camera.dynamic_range.description'](),
			buttons: [
				{
					text: m['camera.dynamic_range.button'](),
					color: 'blue'
				}
			],
			color: 'blue'
		}
	]);

	// 导航项配置
	let navigationItems = $derived([
		...(isAdministrator
			? [
					{
						section: m['administrator.title'](),
						sectionId: 'section-administrator',
						cards: adminCards.map((card) => ({ id: card.id, title: card.title }))
					}
				]
			: []),
		...(hasCameraPermission && shouldShowModule('data-provider-camera')
			? [
					{
						section: m['data_provider_camera.title'](),
						sectionId: 'section-data-provider-camera',
						cards: dataProviderCameraCards.map((card) => ({ id: card.id, title: card.title }))
					}
				]
			: []),
		...(hasLightPermission && shouldShowModule('data-provider-lighting')
			? [
					{
						section: m['data_provider_lighting.title'](),
						sectionId: 'section-data-provider-lighting',
						cards: dataProviderLightingCards.map((card) => ({ id: card.id, title: card.title }))
					}
				]
			: []),
		...(shouldShowModule('camera')
			? [
					{
						section: m['camera.title'](),
						sectionId: 'section-camera',
						cards: cameraCards.map((card) => ({ id: card.id, title: card.title }))
					}
				]
			: []),
		...(shouldShowModule('lighting')
			? [
					{
						section: m['lighting.title'](),
						sectionId: 'section-lighting',
						cards: cards.map((card) => ({ id: card.id, title: card.title }))
					}
				]
			: [])
	]);

	// 平滑滚动到锚点
	function scrollToAnchor(anchorId: string) {
		const element = document.getElementById(anchorId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	// 组件挂载时加载产品数量
	onMount(() => {
		loadProductCount();

		// 观察 intro 标题可见性
		const el = document.getElementById('introTitle');
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				isIntroTitleVisible = entries[0]?.isIntersecting ?? true;
			},
			{ root: null, threshold: 0.01 }
		);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>{m['intro.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 pt-16">
	<!-- Navbar -->
	<Navbar centerTitle={navbarCenterTitle} centerTitleSize="3xl" />

	<!-- Main Content with Sidebar -->
	<div class="flex">
		<!-- Left Sidebar Navigation -->
		<aside
			class="hidden lg:block w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pt-8 pl-4 pr-2"
		>
			<nav class="space-y-4">
				{#each navigationItems as item}
					<div class="space-y-2">
						<button
							onclick={() => scrollToAnchor(item.sectionId)}
							class="w-full text-left px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
						>
							{item.section}
						</button>
						<div class="pl-4 space-y-1">
							{#each item.cards as card}
								<button
									onclick={() => scrollToAnchor(card.id)}
									class="w-full text-left px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
								>
									{card.title}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</nav>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<!-- Introduction Card -->
			<div class="w-4/5 mx-auto mb-12 lg:w-4/5 xl:w-4/5">
				<div
					class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8"
				>
					<h1
						id="introTitle"
						class="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center"
					>
						{m['intro.title']()}
					</h1>
					<p class="text-lg text-gray-600 dark:text-gray-400 text-center leading-relaxed">
						{m['intro.description']()}
					</p>
				</div>
			</div>

			<!-- Administrator Section (Only visible to administrators) -->
			{#if isAdministrator}
				<div id="section-administrator" class="mb-12 scroll-mt-24">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
						{m['administrator.title']()}
					</h2>

					<!-- Admin Cards Grid Container -->
					<div
						class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
					>
						{#each adminCards as card}
							<Card
								id={card.id}
								title={card.title}
								description={card.description}
								buttons={card.buttons}
								color={card.color}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Data Provider - Camera Section (Only visible to users with CAMERA permission) -->
			{#if hasCameraPermission && shouldShowModule('data-provider-camera')}
				<div id="section-data-provider-camera" class="mb-12 scroll-mt-24">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
						{m['data_provider_camera.title']()}
					</h2>

					<!-- Data Provider Camera Cards Grid Container -->
					<div
						class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
					>
						{#each dataProviderCameraCards as card}
							<Card
								id={card.id}
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
			{#if hasLightPermission && shouldShowModule('data-provider-lighting')}
				<div id="section-data-provider-lighting" class="mb-12 scroll-mt-24">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
						{m['data_provider_lighting.title']()}
					</h2>

					<!-- Data Provider Lighting Cards Grid Container -->
					<div
						class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
					>
						{#each dataProviderLightingCards as card}
							<Card
								id={card.id}
								title={card.title}
								description={card.description}
								buttons={card.buttons}
								color={card.color}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Camera Section -->
			{#if shouldShowModule('camera')}
				<div id="section-camera" class="mb-12 scroll-mt-24">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
						{m['camera.title']()}
					</h2>

					<!-- Camera Cards Grid Container -->
					<div
						class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
					>
						{#each cameraCards as card}
							<Card
								id={card.id}
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
			{#if shouldShowModule('lighting')}
				<div id="section-lighting" class="mb-12 scroll-mt-24">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
						{m['lighting.title']()}
					</h2>

					<!-- Cards Grid Container -->
					<div
						class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
					>
						{#each cards as card}
							<Card
								id={card.id}
								title={card.title}
								description={card.description}
								buttons={card.buttons}
								color={card.color}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	/* 响应式设计 */
	@media (max-width: 1024px) {
		.w-4\/5 {
			width: 100%;
		}
	}
</style>
