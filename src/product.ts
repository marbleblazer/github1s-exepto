import { Platform } from './config';

export const createProductConfiguration = (platform: Platform) => ({
	nameShort: platform + '1s',
	nameLong: platform + '1s',
	applicationName: platform + '1s',
	reportIssueUrl: '',
	extensionsGallery: undefined,
	linkProtectionTrustedDomains: [PLATFORM_ORIGIN, GATEWAY_ORIGIN].filter(Boolean),
	extensionEnabledApiProposals: {
		'ms-vscode.anycode': ['extensionsAny'],
	},
});
