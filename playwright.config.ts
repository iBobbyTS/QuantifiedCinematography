/**
 * Playwright 端到端测试配置文件
 * 
 * 这个文件配置了 Playwright 自动化测试工具，包括：
 * - 测试目录设置
 * - 开发服务器配置（用于测试前启动应用）
 * - 浏览器和测试环境设置
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173
	},
	testDir: 'e2e'
});
