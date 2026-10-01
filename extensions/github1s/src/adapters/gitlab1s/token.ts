/**
 * @file gitlab token manager — browser tokens are not used
 */

export class GitLabTokenManager {
	protected static instance: GitLabTokenManager | null = null;

	public static getInstance(): GitLabTokenManager {
		if (GitLabTokenManager.instance) {
			return GitLabTokenManager.instance;
		}
		return (GitLabTokenManager.instance = new GitLabTokenManager());
	}

	public getToken(): string {
		return '';
	}

	public async setToken(_token: string) {
		return;
	}

	public async validateToken(_token?: string) {
		return null;
	}
}
