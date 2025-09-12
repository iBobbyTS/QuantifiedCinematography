/**
 * Svelte 组件单元测试文件
 * 
 * 这个文件包含了使用 Vitest 和 vitest-browser-svelte 编写的组件单元测试，主要功能包括：
 * - 测试 Svelte 组件在浏览器环境中的渲染
 * - 验证组件的 DOM 结构和内容
 * - 确保组件的功能按预期工作
 */

import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		const screen = render(Page);

		const heading = screen.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
