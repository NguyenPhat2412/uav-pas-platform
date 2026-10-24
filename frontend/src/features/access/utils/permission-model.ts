export type Override = boolean | null;
export type Change = { code: string; value: Override };
export type Translate = (key: string, params?: Record<string, string | number>) => string;

// Without a translator the source keeps its original label, so the model stays usable outside React.
export function permissionState(code: string, template: string[] | undefined, override: Override | undefined, active = true, t?: Translate) {
    const label = (key: string, fallback: string) => t ? t(`admin.access.source.${key}`) : fallback;
    if (!active) return {allowed: false, source: label('inactive', 'Tài khoản không hoạt động')};
    if (override != null) return {allowed: override, source: override ? label('allowOverride', 'Override ALLOW') : label('denyOverride', 'Override DENY')};
    if (!template) return {allowed: null, source: label('noTemplate', 'Chưa có dữ liệu template')};
    return {allowed: template.includes(code), source: label('template', 'Template')};
}

// ponytail: each endpoint commits separately; retain exact successes and failures until a bulk API exists.
export async function saveChanges(changes: Change[], write: (change: Change) => Promise<unknown>, t?: Translate) {
    const succeeded: string[] = [];
    const failed: { code: string; message: string }[] = [];
    for (const change of changes) {
        try {
            await write(change);
            succeeded.push(change.code);
        } catch (error) {
            failed.push({code: change.code, message: error instanceof Error ? error.message : (t ? t('admin.access.saveFailed') : 'Không thể lưu')});
        }
    }
    return {succeeded, failed};
}
