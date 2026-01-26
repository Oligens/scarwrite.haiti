// Minimal TypeScript shim for `react` and JSX runtime used while installing proper types.
// Prefer to install real types with: npm install --save-dev @types/react @types/react-dom

declare module 'react' {
	export type ReactNode = unknown;
	export type FC<P = unknown> = (props: P & { children?: ReactNode }) => unknown;
	export type ImgHTMLAttributes<T = unknown> = unknown;
	export type FormEvent = unknown;

	export function useState<T = unknown>(initial?: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];
	export function useEffect(cb: () => void | (() => void), deps?: unknown[]): void;
	export function useRef<T = unknown>(initial?: T): { current: T };
	export function useCallback<T = unknown>(fn: (...args: unknown[]) => unknown, deps?: unknown[]): unknown;
	export const Fragment: unknown;
	export const StrictMode: unknown;
const React: unknown;
export default React;
}

declare module 'react/jsx-runtime' {
	export function jsx(type: unknown, props: unknown, key?: unknown): unknown;
	export function jsxs(type: unknown, props: unknown, key?: unknown): unknown;
	export function jsxDEV(type: unknown, props: unknown, key?: unknown): unknown;
}

declare module 'lucide-react' {
	const anyExport: unknown;
	export = anyExport;
}
