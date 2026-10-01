import path from 'path';
import fs from 'fs-extra';
import cp from 'child_process';
import webpack from 'webpack';
import CleanCSS from 'clean-css';
import UglifyJS from 'uglify-js';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as packUtils from './scripts/webpack.js';
import { loadEnvLocal } from './scripts/load-env-local.js';
import { getContentSecurityPolicy, getHeadersFileContents, getGatewayOrigin } from './scripts/security-headers.js';

loadEnvLocal();

const commitId = cp.execSync('git rev-parse HEAD').toString().trim();
const staticDir = `static-${commitId.padStart(7, '0').slice(0, 7)}`;
const vscodeWebPath = path.join(import.meta.dirname, 'node_modules/@github1s/vscode-web');

const skipMinified = { info: { minimized: true } };
const skipNodeModules = { globOptions: { dot: true, ignore: ['**/node_modules/**'] } };
const fileLoaderOptions = { outputPath: staticDir, name: '[name].[ext]' };

const copyPluginPatterns = [
	{ from: 'extensions', to: `${staticDir}/extensions`, ...skipNodeModules, ...skipMinified },
	{ from: path.join(vscodeWebPath, 'vscode'), to: `${staticDir}/vscode`, ...skipMinified },
	{ from: path.join(vscodeWebPath, 'extensions'), to: `${staticDir}/extensions`, ...skipMinified },
	{ from: path.join(vscodeWebPath, 'dependencies'), to: `${staticDir}/dependencies`, ...skipMinified },
	{ from: path.join(vscodeWebPath, 'nls'), to: `${staticDir}/nls`, ...skipMinified },
];

const devVscodeStatic = [
	...fs.readdirSync(path.join(import.meta.dirname, 'extensions')).map((item) => ({
		publicPath: `/${staticDir}/extensions/${item}`,
		directory: path.join(import.meta.dirname, `extensions/${item}`),
	})),
	{
		publicPath: `/${staticDir}/vscode/`,
		directory: path.join(import.meta.dirname, 'vscode-web/lib/vscode/out'),
	},
	{
		publicPath: `/${staticDir}/extensions/`,
		directory: path.join(import.meta.dirname, 'vscode-web/lib/vscode/extensions'),
	},
	{
		publicPath: `/${staticDir}/dependencies/`,
		directory: path.join(import.meta.dirname, 'vscode-web/lib/vscode/node_modules'),
	},
];

export default (env, argv) => {
	const devMode = argv.mode === 'development';
	const devVscode = !!process.env.DEV_VSCODE;
	const gatewayOrigin = getGatewayOrigin();
	const gitlabDomain = process.env.GITLAB_DOMAIN || '';
	const gatewayApiPrefix = process.env.GATEWAY_API_PREFIX || '/api/gitlab';
	const gatewaySessionPath = process.env.GATEWAY_SESSION_PATH || '/api/session';
	const platformOrigin = process.env.PLATFORM_ORIGIN || '';
	const minifyCSS = (code) => (devMode ? code : new CleanCSS().minify(code).styles);
	const minifyJS = (code) => (devMode ? code : UglifyJS.minify(code).code);
	const availableLanguages = devVscode ? [] : fs.readdirSync(path.join(vscodeWebPath, 'nls'));
	const cspContent = getContentSecurityPolicy();

	const gatewayProxy =
		devMode && gatewayOrigin
			? [
					{
						context: (pathname) => pathname.startsWith('/api/'),
						target: gatewayOrigin,
						changeOrigin: true,
						followRedirects: false,
						on: {
							proxyReq: (proxyReq, req) => {
								proxyReq.removeHeader('authorization');
								const launchHeader = req.headers['x-viewer-launch'];
								if (typeof launchHeader === 'string') {
									proxyReq.setHeader('X-Viewer-Launch', launchHeader);
								}
								if (req.headers.cookie) {
									proxyReq.setHeader('cookie', req.headers.cookie);
								}
							},
						},
					},
				]
			: [];

	return {
		mode: env.mode || 'production',
		entry: path.resolve(import.meta.dirname, 'src/index.ts'),
		output: { clean: true, publicPath: '/', filename: `${staticDir}/bootstrap.js` },
		resolve: { extensions: ['.js', '.ts'] },
		module: {
			rules: [
				{ test: /\.tsx?$/, use: 'ts-loader' },
				{ test: /\.css?$/, use: ['style-loader', 'css-loader'] },
				{ test: /\.svg$/, use: [{ loader: 'file-loader', options: fileLoaderOptions }] },
			],
		},
		plugins: [
			new CopyPlugin({
				patterns: [
					{
						from: 'public/_headers',
						to: '_headers',
						toType: 'file',
						transform: () => getHeadersFileContents(),
					},
					{ from: 'public/favicon*', to: '[name][ext]' },
					{ from: 'public/manifest.json', to: '[name][ext]' },
					{ from: 'public/robots.txt', to: '[name][ext]' },
					...(devVscode ? [] : copyPluginPatterns),
				].filter(Boolean),
			}),
			new HtmlWebpackPlugin({
				minify: !devMode,
				scriptLoading: 'module',
				template: 'public/index.html',
				templateParameters: {
					spinnerStyle: minifyCSS(fs.readFileSync('./public/spinner.css').toString()),
					pageTitleScript: minifyJS(fs.readFileSync('./public/page-title.js').toString()),
					globalScript: minifyJS(packUtils.createGlobalScript(staticDir, devVscode)),
					cspContent,
				},
			}),
			new webpack.DefinePlugin({
				DEV_VSCODE: JSON.stringify(devVscode),
				GITLAB_ORIGIN: JSON.stringify(gitlabDomain),
				GATEWAY_ORIGIN: JSON.stringify(gatewayOrigin),
				GATEWAY_API_PREFIX: JSON.stringify(gatewayApiPrefix),
				GATEWAY_SESSION_PATH: JSON.stringify(gatewaySessionPath),
				PLATFORM_ORIGIN: JSON.stringify(platformOrigin),
				GITHUB1S_EXTENSIONS: JSON.stringify(packUtils.getBuiltinExtensions(devVscode)),
				AVAILABLE_LANGUAGES: JSON.stringify(availableLanguages),
			}),
		],
		performance: false,
		devServer: {
			port: 8080,
			proxy: gatewayProxy,
			setupMiddlewares: (middlewares, devServer) => {
				if (!gatewayOrigin && devServer?.app) {
					devServer.app.get('/api/session', (req, res) => {
						const repo = process.env.VIEWER_DEV_REPO;
						if (!repo) {
							res.status(401).json({ error: 'unauthorized' });
							return;
						}
						res.json({ repo, ref: process.env.VIEWER_DEV_REF || undefined });
					});
				}
				return middlewares;
			},
			liveReload: false,
			allowedHosts: ['localhost'],
			client: { overlay: false },
			devMiddleware: { writeToDisk: true },
			static: devVscode ? devVscodeStatic : [],
			historyApiFallback: { disableDotRule: true },
		},
	};
};
