/*
 * 单元测试文件
 * 使用 Vitest 框架编写的测试用例
 * 测试基本的数学运算功能
 * 作为项目测试配置的示例
 */
import { describe, it, expect } from 'vitest';

describe('sum test', () => {
	it('adds 1 + 2 to equal 3', () => {
		expect(1 + 2).toBe(3);
	});
});
