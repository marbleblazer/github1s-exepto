/**
 * @file register the adapters
 */

import adapterManager from './manager';
import { GitLab1sAdapter } from './gitlab1s';
import { Adapter, DataSource, PlatformName, RouterParser } from './types';
import { setVSCodeContext } from '@/helpers/vscode';

const emptyAdapter = {
	scheme: 'empty',
	platformName: PlatformName.GitLab,
	resolveDataSource: () => new DataSource(),
	resolveRouterParser: () => new RouterParser(),
};

export const registerAdapters = async (): Promise<void> => {
	await Promise.all([
		adapterManager.registerAdapter(emptyAdapter),
		adapterManager.registerAdapter(new GitLab1sAdapter()),
	]);
	await setVSCodeContext('github1s:views:codeReviewList:visible', await supportsCodeReviewFeatures());
	await setVSCodeContext('github1s:features:gutterBlame:enabled', await supportsGutterBlameFeatures());
};

export const getAdapter = (scheme?: string): Adapter => {
	return adapterManager.getAdapter(scheme);
};

export const getAllAdapters = (): Adapter[] => {
	return adapterManager.getAllAdapters();
};

export const supportsDataSourceMethods = async (
	methods: (keyof DataSource)[],
	scheme: string = getAdapter().scheme,
): Promise<boolean> => {
	const adapter = getAllAdapters().find((adapter) => adapter.scheme === scheme);
	if (!adapter) {
		return false;
	}
	const dataSource = await adapter.resolveDataSource();
	return methods.every((method) => dataSource[method] !== DataSource.prototype[method]);
};

export const supportsCommitFeatures = (scheme?: string): Promise<boolean> => {
	return supportsDataSourceMethods(['provideCommits', 'provideCommit', 'provideCommitChangedFiles'], scheme);
};

export const supportsCodeReviewFeatures = (scheme?: string): Promise<boolean> => {
	return supportsDataSourceMethods(
		['provideCodeReviews', 'provideCodeReview', 'provideCodeReviewChangedFiles'],
		scheme,
	);
};

export const supportsGutterBlameFeatures = (scheme?: string): Promise<boolean> => {
	return supportsDataSourceMethods(['provideFileBlameRanges'], scheme);
};
