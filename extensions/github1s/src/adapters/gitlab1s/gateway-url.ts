/**
 * Resolve gateway URLs from the extension web worker.
 */

export const resolveGatewayUrl = (apiPath: string, pageUrl: string): string => {
	if (/^https?:\/\//i.test(apiPath)) {
		return apiPath;
	}
	const origin = GATEWAY_ORIGIN || new URL(pageUrl).origin;
	const prefix = GATEWAY_API_PREFIX || '/api/gitlab';
	const joined = `${prefix.replace(/\/$/, '')}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
	if (/^https?:\/\//i.test(prefix)) {
		return new URL(apiPath, prefix.endsWith('/') ? prefix : `${prefix}/`).href;
	}
	return new URL(joined, origin.endsWith('/') ? origin : `${origin}/`).href;
};
