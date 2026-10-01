#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { executeCommand, PROJECT_ROOT } from './utils.js';
import { loadEnvLocal } from './load-env-local.js';

const main = () => {
	loadEnvLocal();
	const skipExtensions = new Set(['github1s-ai']);
	for (const extension of fs.readdirSync('extensions')) {
		if (skipExtensions.has(extension)) {
			continue;
		}
		const extensionPath = path.join(PROJECT_ROOT, 'extensions', extension);
		if (fs.existsSync(path.join(extensionPath, 'package.json'))) {
			executeCommand('npm', ['run', 'compile'], extensionPath);
		}
	}
	executeCommand('npx', ['webpack', '--mode=production'], PROJECT_ROOT);
};

main();
