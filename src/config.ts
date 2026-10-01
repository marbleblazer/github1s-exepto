/**
 * @file config for GitLab viewer
 */

import gitlabLogoUrl from './assets/gitlab.svg';

const createFolderWorkspace = (scheme: string) => ({
	folderUri: { scheme, authority: '', path: '/', query: '', fragment: '' },
});

const createWindowIndicator = (label: string) => ({
	tooltip: label || '',
	label: label || '$(remote)',
	command: '',
});

const createConfigurationDefaults = () => ({
	'workbench.colorTheme': 'Default Dark+',
	'telemetry.telemetryLevel': 'off',
	'workbench.startupEditor': 'readme',
	'workbench.editorAssociations': { '*.md': 'vscode.markdown.preview.editor' },
	'markdown.preview.doubleClickToSwitchToEditor': false,
	'chat.disableAIFeatures': true,
	'anycode.language.features': {
		completions: false,
		definitions: false,
		references: false,
		highlights: true,
		outline: true,
		workspaceSymbols: true,
		folding: false,
		diagnostics: false,
	},
});

export enum Platform {
	GitLab = 'GitLab',
}

export const createVSCodeWebConfig = (_platform: Platform, repository: string): any => {
	return {
		hideTextFileLabelDecorations: !!repository,
		workspace: repository ? createFolderWorkspace('gitlab1s') : undefined,
		workspaceId: repository ? 'gitlab1s:' + repository : '',
		workspaceLabel: repository,
		logo: {
			title: 'Repository',
			icon: gitlabLogoUrl,
			onClick: () => undefined,
		},
	};
};

export const createWorkbenchOptions = (_platform: Platform, repository: string): any => {
	return {
		windowIndicator: createWindowIndicator(repository),
		configurationDefaults: createConfigurationDefaults(),
	};
};
