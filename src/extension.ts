import { DebugConsoleMode } from "vscode";

const vscode = require('vscode');

interface Map {
	[PropName: string]: any;
}

function activate(context: any) {
		// 这里的代码将只会在插件激活时执行一次

    let parse = vscode.commands.registerCommand('extension.parse', function() {
			let content = vscode.window.activeTextEditor.document.getText();

			// 替换template中的部分
			content = content.replace(/<template(.|\n)*template>/gim, (match: any) => {
				return match.replace(/(\w+='|\w+="|>|'|")([^'"<>]*[\u4e00-\u9fa5]+[^'"<>]*)(['"<])/gim, (_: any, prev: any, match: any, after: any) => {
						match = match.trim();
						let result = '';
						if (match.match(/{{[^{}]+}}/)) {
								//把{{}}中的部分换成变量对应的index
								let matchIndex = 0;
								let matchArr: any[] = [];
								match = match.replace(/{{([^{}]+)}}/gim, (_:any, match:any) => {
										matchArr.push(match);
										return `{${matchIndex++}}`;
								});
								// currentKey = getCurrentKey(match, file);
								if (!matchArr.length) {
										result = `${prev}{intl.get('${match}')}${after}`;
								} else {
										result = `${prev}{intl.get('${match}', [${matchArr.toString()}])}${after}`;
								}
						} else {
								if (prev.match(/^\w+='$/)) {
										//对于属性中普通文本的替换
										result = `:${prev}intl.get("${match}")${after}`;
								} else if (prev.match(/^\w+="$/)) {
										//对于属性中普通文本的替换
										result = `:${prev}intl.get('${match}')${after}`;
								} else if (prev === '"' || prev === '\'') {
										//对于属性中参数形式中的替换
										result = `intl.get(${prev}${match}${after})`;
								} else {
										//对于tag标签中的普通文本替换
										result = `${prev}{intl.get('${match}')}${after}`;
								}
						}
						return result;
				});
			});

			// 替换script中的部分
			content = content.replace(/<script(.|\n)*script>/gim, (match: any) => {
					//替换注释部分
					let comments: Map = {};
					let commentsIndex: number = 0;
					match = match.replace(/(\/\*(.|\n|\r)*\*\/)|(\/\/.*)/gim, (match: any, p1: any, p2: any, p3: any, offset: any, str: any) => {
							//排除掉url协议部分
							if (offset > 0 && str[offset - 1] === ':') {
								return match;
							}
							let commentsKey = `/*comment_${commentsIndex++}*/`;
							comments[commentsKey] = match;
							return commentsKey;
					});
					match = match.replace(/(['"`])([^'"`\n]*[\u4e00-\u9fa5]+[^'"`\n]*)(['"`])/gim, (_: any, prev: any, match: any, after: any) => {
							match = match.trim();
							let result = '';
							if (prev !== '`') {
									//对于普通字符串的替换
									result = `intl.get('${match}')`;
							} else {
									//对于 `` 拼接字符串的替换
									let matchIndex = 0;
									let matchArr: any[] = [];
									match = match.replace(/(\${)([^{}]+)(})/gim, (_: any, prev: any, match: any) => {
											matchArr.push(match);
											return `{${matchIndex++}}`;
									});
									if (!matchArr.length) {
											result = `intl.get('${match}')`;
									} else {
											result = `intl.get('${match}', [${matchArr.toString()}])`;
									}
							}
							return result;
					});
					//换回注释
					return match.replace(/\/\*comment_\d+\*\//gim, (match: any) => {
							return comments[match];
					});
			});
			replace(content);
		});

		let format = vscode.commands.registerCommand('extension.format', function() {
			let content = vscode.window.activeTextEditor.document.getText();
			let regex = /['"`][^'"`]*?[\u4e00-\u9fa5]+[^'"`]*?['"`]/g;
			let texts = content.match(regex);
			if (texts) {
				let newTexts = texts.map((text: any) => {
						return `i18n.t(${text})`;
				});
				let newContent;
				for (let i = 0; i < texts.length; i++) {
						newContent = content.replace(regex, newTexts[i]);
				}
				replace(newContent);
			} else {
			}
		});

    let wrap = vscode.commands.registerCommand('extension.wrap', function() {
			const editor = vscode.window.activeTextEditor;
			const selections = editor.selections;
			editor.edit((editBuider: any) => {
				selections.forEach((selection: any) => {
					let text: string = editor.document.getText(selection);
					// 去掉前后的引号
					let start: number = 0;
					let end: number = text.length;
					while ("`'\"".includes(text[start])) {
						start++;
					}
					while ("`'\"".includes(text[end - 1])) {
						end--;
					}
					text = text.substring(start, end);

					let replace: string;
					if (text.startsWith('{intl.get(') && text.endsWith(')}')) {
						replace = text.substring(8, text.length - 2);
					} else if (text.startsWith('intl.get(') && text.endsWith(')')) {
						replace = text.substring(7, text.length - 1);
					} else {
						replace = `i18n.t('${text}')`;
					}
					editBuider.replace(selection, replace);
				});
			});
    });

    context.subscriptions.push(parse, wrap);
}

function replace(newContent: any) {
	// get the Range of the whole text of a document
	let textEditor = vscode.window.activeTextEditor;
	let firstLine = textEditor.document.lineAt(0);
	let lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
	let textRange = new vscode.Range(0,
			firstLine.range.start.character,
			textEditor.document.lineCount - 1,
			lastLine.range.end.character);

	// Replace documents with vscode API
	let uri = vscode.window.activeTextEditor.document.uri;
	let textEdits = [];
	textEdits.push(new vscode.TextEdit(textRange, newContent));
	let workspaceEdit = new vscode.WorkspaceEdit();
	workspaceEdit.set(uri, textEdits);
	vscode.workspace.applyEdit(workspaceEdit);
}

exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;
