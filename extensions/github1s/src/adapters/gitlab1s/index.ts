/**
 * @file GitLab1s adapter
 */

import { GitLab1sRouterParser } from './router-parser';
import { GitLab1sDataSource } from './data-source';
import { Adapter, CodeReviewType, PlatformName } from '../types';
import { setVSCodeContext } from '@/helpers/vscode';

export class GitLab1sAdapter implements Adapter {
	public scheme: string = 'gitlab1s';
	public platformName = PlatformName.GitLab;
	public codeReviewType = CodeReviewType.MergeRequest;

	resolveDataSource() {
		return Promise.resolve(GitLab1sDataSource.getInstance());
	}

	resolveRouterParser() {
		return Promise.resolve(GitLab1sRouterParser.getInstance());
	}

	activateAsDefault() {
		setVSCodeContext('github1s:views:settings:visible', false);
	}

	deactivateAsDefault() {
		setVSCodeContext('github1s:views:settings:visible', false);
	}
}
