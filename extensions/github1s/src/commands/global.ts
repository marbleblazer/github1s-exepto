/**
 * @file GitHub1s global commands
 */

import * as vscode from 'vscode';
import router from '@/router';

export const commandOpenOnOfficialPage = async () => {
	const location = router.getHistory().location;
	const routerParser = router.getParser();
	const fullPath = `${location.pathname}${location.search}${location.hash}`;
	const externalLink = await routerParser.buildExternalLink(fullPath);
	return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(externalLink));
};

const commandRefreshRepository = async () => {
	vscode.commands.executeCommand('workbench.action.reloadWindow');
};

export const registerGlobalCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.openOnGitLab', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnOfficialPage', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.refreshRepository', commandRefreshRepository),
	);
};
