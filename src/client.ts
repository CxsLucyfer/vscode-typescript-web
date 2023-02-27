import * as vscode from 'vscode';
import * as lsp from 'vscode-languageclient/browser';
import {
	activateTsVersionStatusItem,
	activateFindFileReferences,
	activateReloadProjects,
	activateServerSys,
	activateAutoInsertion,
	getTsdk,
} from '@volar/vscode-language-client';
import type { TypeScriptWebServerOptions } from './types';

let client: lsp.BaseLanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {

	const configs = getConfigs();
	const serverMain = vscode.Uri.joinPath(context.extensionUri, 'dist/server.js');
	const worker = new Worker(serverMain.toString());
	const documentSelector: lsp.DocumentSelector = [
		{ language: 'typescript' },
		{ language: 'typescriptreact' },
		{ language: 'javascript' },
		{ language: 'javascriptreact' },
	];
	const documentFilter = (document: vscode.TextDocument): boolean => [
		'typescript',
		'typescriptreact',
		'javascript',
		'javascriptreact',
		configs.supportVue ? 'vue' : undefined,
	].includes(document.languageId);

	if (configs.supportVue) {
		documentSelector.push({ language: 'vue' });
	}

	const clientOptions: lsp.LanguageClientOptions = {
		documentSelector,
		initializationOptions: {
			respectClientCapabilities: true,
			typescript: {
				tsdk: getTsdk(context).tsdk,
				versions: configs.versions,
				cdn: configs.cdn,
			},
			supportVue: configs.supportVue,
		} satisfies TypeScriptWebServerOptions,
	};
	client = new lsp.LanguageClient(
		'typescript-web',
		'TypeScript IntelliSense for Web',
		clientOptions,
		worker,
	);
	await client.start();

	activateTsVersionStatusItem(
		'typescript-web-ts-version',
		context,
		client,
		documentFilter,
		text => `${text} (volar)`,
		true,
		configs.cdn,
	);
	activateFindFileReferences('typescript-web.find-file-references', client);
	activateReloadProjects('typescript-web.reload-projects', [client]);
	activateServerSys(context, client);
	activateAutoInsertion([client], documentFilter);
}

export function deactivate() {
	return client?.stop();
}

function getConfigs() {
	const configs = vscode.workspace.getConfiguration('typescript-web');
	return {
		cdn: configs.get<string>('packages.cdn'),
		// fix: Failed to execute 'postMessage' on 'Worker': #<Object> could not be cloned.
		versions: JSON.parse(JSON.stringify(configs.get<Record<string, string>>('packages.versions'))),
		supportVue: configs.get<boolean>('supportVue') ?? false,
	};
}
