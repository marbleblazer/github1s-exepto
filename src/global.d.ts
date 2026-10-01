// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../vscode-web/src/setup.d.ts" />

declare module '*.svg' {
	const content: string;
	export default content;
}

declare const DEV_VSCODE: boolean;
declare const GITLAB_ORIGIN: string;
declare const GATEWAY_ORIGIN: string;
declare const GATEWAY_API_PREFIX: string;
declare const GATEWAY_SESSION_PATH: string;
declare const PLATFORM_ORIGIN: string;
declare const GITHUB1S_EXTENSIONS: string;
declare const AVAILABLE_LANGUAGES: string[];

/* eslint-disable no-var */
declare var dynamicImport: (url: string) => Promise<any>;
declare var _VSCODE_FILE_ROOT: string;
