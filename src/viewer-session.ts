/**
 * Opaque launch code from the platform. Never log this value.
 */
const LAUNCH_QUERY_PARAM = 'launch';
const LAUNCH_MESSAGE_TYPE = 'viewer-launch';
const PARENT_LAUNCH_TIMEOUT_MS = 2500;

export type ViewerSession = {
	repo: string;
	ref?: string;
};

const isSafeRepo = (repo: string): boolean => {
	if (!repo || repo.includes('..') || repo.startsWith('/')) {
		return false;
	}
	return repo.split('/').filter(Boolean).length >= 1;
};

const stripLaunchFromUrl = () => {
	const url = new URL(window.location.href);
	if (!url.searchParams.has(LAUNCH_QUERY_PARAM)) {
		return;
	}
	url.searchParams.delete(LAUNCH_QUERY_PARAM);
	const search = url.searchParams.toString();
	history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`);
};

const readLaunchFromQuery = (): string => {
	const launch = new URLSearchParams(window.location.search).get(LAUNCH_QUERY_PARAM) || '';
	stripLaunchFromUrl();
	return launch;
};

const waitForParentLaunch = (): Promise<string> => {
	if (window.parent === window || !PLATFORM_ORIGIN) {
		return Promise.resolve('');
	}
	return new Promise((resolve) => {
		const timer = window.setTimeout(() => {
			window.removeEventListener('message', onMessage);
			resolve('');
		}, PARENT_LAUNCH_TIMEOUT_MS);
		const onMessage = (event: MessageEvent) => {
			if (event.origin !== PLATFORM_ORIGIN) {
				return;
			}
			const payload = event.data;
			if (!payload || payload.type !== LAUNCH_MESSAGE_TYPE || typeof payload.launch !== 'string') {
				return;
			}
			window.clearTimeout(timer);
			window.removeEventListener('message', onMessage);
			resolve(payload.launch);
		};
		window.addEventListener('message', onMessage);
	});
};

const resolveSessionUrl = (): string => {
	const sessionPath = GATEWAY_SESSION_PATH || '/api/session';
	if (/^https?:\/\//i.test(sessionPath)) {
		return sessionPath;
	}
	const origin = GATEWAY_ORIGIN || window.location.origin;
	return new URL(sessionPath, origin.endsWith('/') ? origin : `${origin}/`).href;
};

export const resolveViewerSession = async (): Promise<ViewerSession | null> => {
	let launch = readLaunchFromQuery();
	if (!launch) {
		launch = await waitForParentLaunch();
	}

	const headers: Record<string, string> = { Accept: 'application/json' };
	if (launch) {
		headers['X-Viewer-Launch'] = launch;
	}

	try {
		const response = await fetch(resolveSessionUrl(), {
			method: 'GET',
			credentials: 'include',
			headers,
		});
		if (!response.ok) {
			return null;
		}
		const data = await response.json();
		const repo = typeof data?.repo === 'string' ? data.repo.trim() : '';
		if (!isSafeRepo(repo)) {
			return null;
		}
		const ref = typeof data?.ref === 'string' && data.ref.trim() ? data.ref.trim() : undefined;
		return { repo, ref };
	} catch {
		return null;
	}
};
