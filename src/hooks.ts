/*
 * 客户端钩子文件
 * 处理客户端路由重定向
 * 用于多语言 URL 的去本地化处理
 * 确保路由在不同语言环境下正确工作
 */
import { deLocalizeUrl } from '$lib/paraglide/runtime';

export const reroute = (request) => deLocalizeUrl(request.url).pathname;
