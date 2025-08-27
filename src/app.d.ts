import { Lucia } from "lucia";

declare global {
	namespace App {
		interface Locals {
			auth: import("lucia").AuthRequest;
			user: Lucia.User | null;
			session: Lucia.Session | null;
		}
	}
}

export {};
