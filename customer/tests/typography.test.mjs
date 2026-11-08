import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../src/lib/typography.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022
    }
}).outputText;
const {keepVietnamesePhrases} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('Vietnamese headings keep compounds intact but can wrap between phrases', () => {
    assert.equal(keepVietnamesePhrases('Từ mục tiêu nhiệm vụ đến kế hoạch bay rõ ràng.'), 'Từ mục\u00a0tiêu nhiệm\u00a0vụ đến kế\u00a0hoạch bay rõ\u00a0ràng.');
    assert.equal(keepVietnamesePhrases('Hỗ trợ tìm kiếm cứu nạn'), 'Hỗ\u00a0trợ tìm\u00a0kiếm cứu\u00a0nạn');
    assert.equal(keepVietnamesePhrases('Kết nối yêu cầu. Theo dõi từng nhiệm vụ.'), 'Kết nối yêu\u00a0cầu. Theo\u00a0dõi từng nhiệm\u00a0vụ.');
});

test('typography preserves case, punctuation and text outside complete phrases', () => {
    const input = 'NHIỆM VỤ: UAV-001 / 1.500.000 ₫\nCustomer services, requests & API';
    const actual = keepVietnamesePhrases(input);
    assert.equal(actual, 'NHIỆM\u00a0VỤ: UAV-001 / 1.500.000 ₫\nCustomer services, requests & API');
    assert.equal(keepVietnamesePhrases('anhiệm vụb'), 'anhiệm vụb');
    assert.equal(actual.replaceAll('\u00a0', ' '), input);
    assert.equal(keepVietnamesePhrases(actual), actual);
});
