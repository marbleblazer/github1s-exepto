/**
 * @file gitlab api fetcher — session cookies only, no PAT in the browser
 */

import * as vscode from 'vscode';
import { reuseable } from '@/helpers/func';
import { getBrowserUrl } from '@/helpers/context';
import { resolveGatewayUrl } from './gateway-url';

export class GitLabFetcher {
	private static instance: GitLabFetcher | null = null;

	public static getInstance(): GitLabFetcher {
		if (GitLabFetcher.instance) {
			return GitLabFetcher.instance;
		}
		return (GitLabFetcher.instance = new GitLabFetcher());
	}

	private constructor() {}

	public getPreferSourcegraphApi(_repo?: string): Promise<boolean> {
		return Promise.resolve(false);
	}

	public setPreferSourcegraphApi(_value: boolean, _repo?: string): Promise<void> {
		return Promise.resolve();
	}

	private _request = reuseable(
		(
			command: string,
			params: Record<string, string | number | boolean | undefined>,
		): Promise<{ status: number; data: any; headers: Headers }> => {
			// eslint-disable-next-line prefer-const
			let [method, path] = command.split(/\s+/).filter(Boolean);
			Object.keys(params).forEach((el) => {
				path = path.replace(`{${el}}`, `${encodeURIComponent(params[el] || '')}`);
			});
			return getBrowserUrl().then(async (browserUrl: string) => {
				const url = resolveGatewayUrl(path, browserUrl);
				const response = (await fetch(url, {
					method,
					credentials: 'include',
				})) as Response & { data: any };
				try {
					response.data = await response.json();
				} catch {
					response.data = null;
				}
				return response.ok ? response : Promise.reject({ response });
			});
		},
	);

	public request = (command: string, params: Record<string, string | number | boolean | undefined>) => {
		return this._request(command, params).catch(async (error: { response: any }) => {
			const errorStatus = error?.response?.status as number | undefined;
			if (errorStatus === 401 || errorStatus === 403) {
				void vscode.window.showErrorMessage(
					'Viewer session is missing or expired. Open this project from the platform.',
				);
			}
			throw error;
		});
	};
}
