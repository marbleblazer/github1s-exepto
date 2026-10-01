const trimOrigin = (value) => (value || '').trim().replace(/\/$/, '');

export const getGatewayOrigin = () => trimOrigin(process.env.GATEWAY_ORIGIN);
export const getPlatformOrigin = () => trimOrigin(process.env.PLATFORM_ORIGIN);

export const getConnectSrc = () => {
	const sources = ["'self'"];
	const gateway = getGatewayOrigin();
	if (gateway) {
		sources.push(gateway);
	}
	return sources.join(' ');
};

export const getFrameAncestors = () => {
	const platform = getPlatformOrigin();
	return platform || "'self'";
};

export const getContentSecurityPolicy = () => {
	return [
		"default-src 'self'",
		"base-uri 'self'",
		"form-action 'self'",
		`frame-ancestors ${getFrameAncestors()}`,
		`connect-src ${getConnectSrc()}`,
		"script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self' data:",
		"worker-src 'self' blob:",
		"child-src 'self' blob:",
		"frame-src 'self' blob:",
	].join('; ');
};

export const getHeadersFileContents = () => {
	const csp = getContentSecurityPolicy();
	return [
		'/*',
		'  Content-Security-Policy: ' + csp,
		'  X-Content-Type-Options: nosniff',
		'  Referrer-Policy: no-referrer',
		'  Strict-Transport-Security: max-age=31536000; includeSubDomains',
		'  Permissions-Policy: camera=(), microphone=(), geolocation=()',
		'',
	].join('\n');
};
