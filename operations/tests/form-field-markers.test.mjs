import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PORTAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relPath => readFile(path.join(PORTAL_ROOT, relPath), 'utf8');

test('operations portal shares red * RequiredMark, localized OptionalMark, and duplicate-suffix stripping', async () => {
    const [requiredMark, formField, input, passwordInput] = await Promise.all([
        read('src/components/shared/RequiredMark.tsx'),
        read('src/components/ui/FormField.tsx'),
        read('src/components/ui/Input.tsx'),
        read('src/components/ui/PasswordInput.tsx'),
    ]);

    assert.match(requiredMark, /text-danger[^>]*>\*<\/span>/);
    assert.match(requiredMark, /vi:\s*'Tuỳ chọn'/);
    assert.match(requiredMark, /en:\s*'Optional'/);
    assert.match(requiredMark, /ja:\s*'任意'/);
    assert.match(requiredMark, /export function stripFieldLabelMarker/);

    assert.match(formField, /stripFieldLabelMarker\(label\)/);
    assert.match(formField, /optional=\{optional \?\? !required\}/);
    assert.match(input, /stripFieldLabelMarker\(label\)/);
    assert.match(passwordInput, /stripFieldLabelMarker\(label\)/);
});

test('operations data-entry forms declare required * and optional markers', async () => {
    const [opsEquipment, opsStation] = await Promise.all([
        read('src/components/inventory/EquipmentPanel.tsx'),
        read('src/components/station/StationFormDrawer.tsx'),
    ]);

    assert.match(opsEquipment, /<RequiredMark\/>/);
    assert.match(opsEquipment, /<OptionalMark\/>/);
    assert.match(opsStation, /required/);
    assert.match(opsStation, /optional/);
});
