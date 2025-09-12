/**
 * Playwright 端到端测试文件
 * 
 * 这个文件包含了使用 Playwright 编写的端到端测试用例，主要功能包括：
 * - 测试页面在真实浏览器环境中的行为
 * - 验证用户界面的交互和显示
 * - 确保应用的整体功能正常工作
 */

import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});
