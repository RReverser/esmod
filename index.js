'use strict';

var acorn = require('acorn');
var Parser = acorn.Parser;
var pp = Parser.prototype;

function CustomParser(input) {
	// state
	this.imports = [];
	this.inputSource = input;

	Parser.call(this, {
		sourceType: 'module'
	}, input);
}

var cp = CustomParser.prototype = Object.create(pp);

cp.constructor = CustomParser;

// Kinda like JS engine pre-parsing:
// tokenizes inner block statements,
// including function bodies
// but doesn't create the AST
cp.parseBlock = function () {
	var node = this.startNode();
	var length = this.context.length;
	do {
		this.next();
	} while (this.context.length >= length);
	this.next(); // this.expect(tt.braceR);
	node.body = [];
	return this.finishNode(node, "BlockStatement");
};

function strToModuleIdentifier(str) {
	return '$m_' + str.replace(/-(\w)/g, (_, letter) => letter.toUpperCase()).replace(/[^$_a-zA-Z0-9]/g, '_');
}

function writePrefix (imports) {
	let transformed = `Object.defineProperty(exports, '__esModule', { value: true });\n`;
	for (let i = 0; i < imports.length; i++) {
		let impt = imports[i];
		transformed += `let ${impt.name} = require('${impt.source}');
if (!${impt.name} || !${impt.name}.__esModule)
  ${impt.name} = { default: ${impt.name} };\n`;
	}

	return transformed;
}

cp.parseImport = function () {
	var node = pp.parseImport.apply(this, arguments);

	let importIdentifierName = strToModuleIdentifier(node.source.value);
	let haveImport = false;
	for (let i = 0; i < this.imports.length; i++) {
		if (this.imports[i].source === node.source.value) {
			haveImport = true;
			break;
		}
	}
	if (!haveImport)
		this.imports.push({
			name: importIdentifierName,
			source: node.source.value
		});

	let transformed = '';
	for (let i = 0; i < node.specifiers.length; i++) {
		let specifier = node.specifiers[i];
		if (specifier.type === 'ImportDefaultSpecifier') {
			transformed += `let ${specifier.local.name} = ${importIdentifierName}.default;\n`;
		}
		else if (specifier.type === 'ImportNamespaceSpecifier') {
			transformed += `let ${specifier.local.name} = ${importIdentifierName};\n`
		}
		else {
			transformed += `let ${specifier.local.name} = ${importIdentifierName}.${specifier.imported.name};\n`;
		}
	}

	node.transformed = transformed;
	return node;
};

cp.parseExport = function () {
	var node = pp.parseExport.apply(this, arguments);

	let transformed;
	if (node.source) {
		// TODO re-exports
		if (node.type === 'ExportAllDeclaration') {
			// export * from 'asdf';
		}
		else if (node.type === 'ExportNamedDeclaration') {
			// export * as M from 'asdf';
		}
		else {
			// export p, {q as r} from 'asdf';
		}
	}
	else if (node.type === 'ExportDefaultDeclaration') {
		return `exports.default = ${this.inputSource.substring(node.declaration.start, node.declaration.end + (this.inputSource[node.declaration.end] === ';'))}`;
	}
	else {
		if (node.declaration) {
			// export var p = 5;
			// export function q () {}
			// export class Y {}
			let declarationName = node.declaration.id ? node.declaration.id.name : node.declaration.declarations[0].id.name;
			return `${this.inputSource.substring(node.declaration.start, node.declaration.end + (this.inputSource[node.declaration.end] === ';'))}
exports.${declarationName} = ${declarationName + (this.inputSource[node.declaration.end] === ';' ? '' : ';')}`;
		}
		else {
			// export r, {p as q}
			for (let i = 0; i < node.specifiers.length; i++) {
				let specifier = node.specifiers[i];
				return `exports.${specifier.exported.name} = ${specifier.local.name};`;
			}
		}
	}

	node.transformed = transformed;
	return node;
};

function parse(input) {
	var parser = new CustomParser(input);
	var ast = parser.parse();
	// no idea where else to store this for this API...
	ast.imports = parser.imports;
	return ast;
}

function generate(input, ast) {
	var output = '';
	// Keep note of where we stopped
	var lastPos = 0;
	// Going only over top-level nodes
	for (var i = 0; i < ast.body.length; i++) {
		var node = ast.body[i];
		var raw = node.transformed;
		// Skipping any nodes that weren't transformed
		if (raw !== undefined) {
			// Insert anything since the last node
			// (comments and other code)
			output += input.slice(lastPos, node.start);
			// Insert the transformed node and mark new pos
			output += raw;
			lastPos = node.end;
		}
	}
	// Insert rest of the code after the last transformed node
	output = writePrefix(ast.imports) + output + input.slice(lastPos);
	return output;
};

function transform(input) {
	return generate(input, parse(input));
}

module.exports = {
	parse: parse,
	generate: generate,
	transform: transform
};
