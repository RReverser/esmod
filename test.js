'use strict';

const { parse, generate, transform } = require('./');
const assert = require('assert');

var source = `
	import 'smth';
	while (1) {
		/* looks like block, but it's not: {
		} */
		smth
	}
	export const answer = 42;
`;

var tests = {
	'parsing does not include BlockStatement body'() {
		assert.deepEqual(parse(source).body[1].body, {
			type: 'BlockStatement',
			body: [],
			start: 28,
			end: 85
		});
	},

	'generate respects transformations and formatting'() {
		var code = '/*a*/123//b';
		var ast = parse(code);
		assert.equal(generate(code, ast), '/*a*/123//b');
		ast.body[0].transformed = '<transformed>';
		assert.equal(generate(code, ast), '/*a*/<transformed>//b');
	},

	'transform can do round-trip changing only import/export'() {
		assert.equal(transform(source), `
			<TODO:import>
			while (1) {
				/* looks like block, but it's not: {
				} */
				smth
			}
			<TODO:export>
		`.replace(/^\t\t/gm, ''));
	}
};

for (var key in tests) {
	try {
		tests[key]();
		console.info('[PASS] ' + key);
	} catch (err) {
		console.error('[FAIL] ' + key + '\n' + err.stack);
	}
}
