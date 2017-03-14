'use strict';

var acorn = require('acorn');

acorn.plugins.transform_module = function (instance) {
	// Kinda like JS engine pre-parsing:
	// tokenizes inner block statements,
	// including function bodies
	// but doesn't create the AST
	instance.parseBlock = function () {
		var node = this.startNode();
		var length = this.context.length;
		do {
			this.next();
		} while (this.context.length >= length);
		this.next(); // this.expect(tt.braceR);
		node.body = [];
		return this.finishNode(node, "BlockStatement");
	};

	instance.extend('parseImport', function (inner) {
		return function () {
			var node = inner.apply(this, arguments);
			node.transformed = '<TODO:import>';
			return node;
		};
	});

	instance.extend('parseExport', function (inner) {
		return function () {
			var node = inner.apply(this, arguments);
			node.transformed = '<TODO:export>';
			return node;
		};
	});
};

function parse(input) {
	return acorn.parse(input, {
		sourceType: 'module',
		plugins: {
			transform_module: true
		}
	});
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
	output += input.slice(lastPos);
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
