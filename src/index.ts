/**
 * @file page entry
 */

import { renderNotification } from './notification';
import { createProductConfiguration } from './product';
import { createVSCodeWebConfig, createWorkbenchOptions, Platform } from './config';
import { resolveViewerSession, ViewerSession } from './viewer-session';

let viewerSession: ViewerSession | null = null;

const vscodeCommands = [
	{ id: 'github1s.commands.vscode.getBrowserUrl', handler: () => window.location.href },
	{ id: 'github1s.commands.vscode.replaceBrowserUrl', handler: (url: string) => history.replaceState(null, '', url) },
	{ id: 'github1s.commands.vscode.pushBrowserUrl', handler: (url: string) => history.pushState(null, '', url) },
	{ id: 'github1s.commands.vscode.getViewerSession', handler: () => viewerSession },
];

const resolveVscodeUrl = (path: string) => new URL(path, globalThis._VSCODE_FILE_ROOT).href;

const bootWorkbench = (session: ViewerSession | null) => {
	const platform = Platform.GitLab;
	const repository = session?.repo || '';

	globalThis._VSCODE_WEB = {
		builtinExtensions: GITHUB1S_EXTENSIONS || [],
		onWorkbenchReady() {
			const loadSpinner = document.querySelector('#load-spinner');
			loadSpinner && loadSpinner.remove();
			renderNotification(platform);
		},
		...createVSCodeWebConfig(platform, repository),
	};

	if (!DEV_VSCODE) {
		const linkElement = document.createElement('link');
		linkElement.setAttribute('rel', 'stylesheet');
		linkElement.setAttribute('href', resolveVscodeUrl('vs/workbench/workbench.web.main.internal.css'));
		document.head.appendChild(linkElement);

		const languageId = document.cookie.match(/(^| )vscode.nls.locale=([^;]+)/)?.[2] || '';
		const nlsUrl = AVAILABLE_LANGUAGES.includes(languageId)
			? resolveVscodeUrl(`../nls/${languageId}/nls.messages.js`)
			: resolveVscodeUrl('nls.messages.js');
		const scriptElement = document.createElement('script');
		scriptElement.setAttribute('src', nlsUrl);
		document.body.appendChild(scriptElement);
	}

	dynamicImport(resolveVscodeUrl('vs/workbench/workbench.web.main.internal.js')).then(({ create, env, URI }) => {
		const resolveWorkspace = (workspace: any) => {
			if (workspace?.folderUri) {
				return { folderUri: URI.from(workspace.folderUri) };
			}
			if (workspace?.workspaceUri) {
				return { workspaceUri: URI.from(workspace.workspaceUri) };
			}
			return { workspaceUri: URI.from({ scheme: 'tmp', path: '/default.code-workspace' }) };
		};

		const vscodeWebConfig = {
			commands: vscodeCommands,
			webviewEndpoint: resolveVscodeUrl('vs/workbench/contrib/webview/browser/pre'),
			productConfiguration: createProductConfiguration(platform),
			initialColorTheme: { themeType: 'dark' as any },
			...createWorkbenchOptions(platform, repository),
		};

		const workspaceProvider = {
			trusted: true,
			workspace: resolveWorkspace(globalThis._VSCODE_WEB.workspace),
			open: () => Promise.resolve(false),
		};

		create(document.body, { workspaceProvider, ...vscodeWebConfig });
		env.getUriScheme().then((scheme: any) => globalThis._VSCODE_WEB.onWorkbenchReady?.(scheme));
	});
};

resolveViewerSession().then((session) => {
	viewerSession = session;
	bootWorkbench(session);
});
