/**
 * @file parse gitlab path — repository always comes from the viewer session
 */

import { parsePath } from 'history';
import * as vscode from 'vscode';
import { PageType, RouterState } from '../types';
import { GitLab1sDataSource } from './data-source';
import { memorize } from '@/helpers/func';

type ViewerSession = { repo?: string; ref?: string } | null | undefined;

export const getCurrentRepo = memorize(() => {
	return vscode.commands
		.executeCommand('github1s.commands.vscode.getViewerSession')
		.then((session: ViewerSession) => session?.repo || '');
});

const getSessionRef = async (): Promise<string> => {
	const session = (await vscode.commands.executeCommand('github1s.commands.vscode.getViewerSession')) as ViewerSession;
	return session?.ref || '';
};

const getDefaultBranch = async (repo: string): Promise<string> => {
	if (!repo) {
		return 'HEAD';
	}
	const fromSession = await getSessionRef();
	if (fromSession) {
		return fromSession;
	}
	const dataSource = GitLab1sDataSource.getInstance();
	return dataSource.getDefaultBranch(repo);
};

const viewSegments = (path: string) => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];
	const dashIndex = pathParts.indexOf('-');
	const typeSegment = dashIndex < 0 ? '' : pathParts[dashIndex + 1] || '';
	const restParts = dashIndex < 0 ? [] : pathParts.slice(dashIndex + 2);
	return { typeSegment, restParts };
};

const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const repo = await getCurrentRepo();
	const { restParts } = viewSegments(path);
	const dataSource = GitLab1sDataSource.getInstance();
	const { ref, path: filePath } = await dataSource.extractRefPath(repo, restParts.join('/'));
	return { pageType: PageType.Tree, repo, ref, filePath };
};

const parseBlobUrl = async (path: string): Promise<RouterState> => {
	const routerState = (await parseTreeUrl(path)) as any;
	const { hash: routerHash } = parsePath(path);
	if (!routerHash) {
		return { ...routerState, pageType: PageType.Blob };
	}
	const matches = routerHash.match(/^#L(\d+)(?:-L(\d+))?/);
	const [_, startLineNumber = '0', endLineNumber] = matches ? matches : [];
	return {
		...routerState,
		pageType: PageType.Blob,
		startLine: parseInt(startLineNumber, 10),
		endLine: parseInt(endLineNumber || startLineNumber, 10),
	};
};

const parseCommitsUrl = async (path: string): Promise<RouterState> => {
	const repo = await getCurrentRepo();
	const { restParts } = viewSegments(path);
	const ref = restParts.join('/') || (await getDefaultBranch(repo));
	return { repo, pageType: PageType.CommitList, ref };
};

const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const repo = await getCurrentRepo();
	const { restParts } = viewSegments(path);
	const commitSha = restParts.join('/') || (await getDefaultBranch(repo));
	return { repo, pageType: PageType.Commit, ref: commitSha, commitSha };
};

const parseMergeRequestsUrl = async (): Promise<RouterState> => {
	const repo = await getCurrentRepo();
	return {
		repo,
		ref: await getDefaultBranch(repo),
		pageType: PageType.CodeReviewList,
	};
};

const parseMergeRequestUrl = async (path: string): Promise<RouterState> => {
	const repo = await getCurrentRepo();
	const { restParts } = viewSegments(path);
	const codeReviewId = restParts[0];
	const codeReview = await GitLab1sDataSource.getInstance().provideCodeReview(repo, codeReviewId);
	return {
		repo,
		pageType: PageType.CodeReview,
		ref: codeReview.targetSha,
		codeReviewId,
	};
};

const PAGE_TYPE_MAP = {
	tree: PageType.Tree,
	blob: PageType.Blob,
	merge_requests: PageType.CodeReview,
	commit: PageType.Commit,
	commits: PageType.CommitList,
};

export const parseGitLabPath = async (path: string): Promise<RouterState> => {
	const repo = await getCurrentRepo();
	if (!repo) {
		return { repo: '', ref: 'HEAD', pageType: PageType.Tree, filePath: '/' };
	}

	const { typeSegment } = viewSegments(path);
	const pageType = typeSegment ? PAGE_TYPE_MAP[typeSegment] || PageType.Unknown : PageType.Tree;

	switch (pageType) {
		case PageType.Tree:
		case PageType.Unknown:
			return parseTreeUrl(path);
		case PageType.Blob:
			return parseBlobUrl(path);
		case PageType.CodeReview:
			if (viewSegments(path).restParts.length) {
				return parseMergeRequestUrl(path);
			}
			return parseMergeRequestsUrl();
		case PageType.CodeReviewList:
			return parseMergeRequestsUrl();
		case PageType.Commit:
			return parseCommitUrl(path);
		case PageType.CommitList:
			return parseCommitsUrl(path);
		default:
			return {
				repo,
				ref: await getDefaultBranch(repo),
				pageType: PageType.Tree,
				filePath: '/',
			};
	}
};
