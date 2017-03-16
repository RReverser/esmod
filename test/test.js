'use strict';

const { parse, generate, transform } = require('../index.js');
const assert = require('assert');

var source = `
	import x, {y as z} from 'smth';
	while (1) {
		/* looks like block, but it's not: {
		} */
		smth
	}
	export const answer = 42;

	export default p;

	export function q () {

	};

	export { answer as theAnswer };
`.replace(/^\t/gm, '');

var tests = {
	'parsing does not include BlockStatement body'() {
		assert.deepEqual(parse(source).body[1].body, {
			type: 'BlockStatement',
			body: [],
			start: 43,
			end: 96
		});
	},

	'generate respects transformations and formatting'() {
		var code = '/*a*/123//b';
		var ast = parse(code);
		assert.equal(generate(code, ast), 'Object.defineProperty(exports, \'__esModule\', { value: true });\n/*a*/123//b');
		ast.body[0].transformed = '<transformed>';
		assert.equal(generate(code, ast), 'Object.defineProperty(exports, \'__esModule\', { value: true });\n/*a*/<transformed>//b');
	},

	'transform can do round-trip changing only import/export'() {
		assert.equal(transform(source).substr(160, 10), `
			Object.defineProperty(exports, \'__esModule\', { value: true });
			let $m_smth = require('smth');
			if (!$m_smth || !$m_smth.__esModule)
				$m_smth = { default: $m_smth };

			let x = $m_smth.default;
			let z = $m_smth.y;

			while (1) {
				/* looks like block, but it's not: {
				} */
				smth
			}
			const answer = 42;
			exports.answer = answer;

			exports.default = p;

			function q () {

			};
			exports.q = q;

			exports.theAnswer = answer;
`.replace(/^\t\t\t/gm, '').substr(160, 10));
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
