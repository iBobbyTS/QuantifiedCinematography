/**
 * SvelteKit 配置文件
 * 
 * 这个文件配置了 SvelteKit 框架的各种设置，包括：
 * - 预处理器配置（Vite 预处理器）
 * - 适配器配置（自动检测部署环境）
 * - 构建和开发相关设置
 */

import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Use adapter-node for production Docker builds
		// This ensures consistent build output to the 'build' directory
		adapter: adapter({
			out: 'build'
		})
	}
};

export default config;
