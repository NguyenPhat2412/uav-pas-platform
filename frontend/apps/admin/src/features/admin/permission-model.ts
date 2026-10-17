export type Override = boolean | null;
export type Change = { code: string; value: Override };
export function permissionState(code: string, template: string[] | undefined, override: Override | undefined, active = true) {
  if (!active) return { allowed: false, source: 'Tài khoản không hoạt động' };
  if (override != null) return { allowed: override, source: override ? 'Override ALLOW' : 'Override DENY' };
  if (!template) return { allowed: null, source: 'Chưa có dữ liệu template' };
  return { allowed: template.includes(code), source: 'Template' };
}
// ponytail: each endpoint commits separately; retain exact successes and failures until a bulk API exists.
export async function saveChanges(changes: Change[], write: (change: Change) => Promise<unknown>) {
  const succeeded: string[] = []; const failed: { code: string; message: string }[] = [];
  for (const change of changes) {
    try { await write(change); succeeded.push(change.code); }
    catch (error) { failed.push({ code: change.code, message: error instanceof Error ? error.message : 'Không thể lưu' }); }
  }
  return { succeeded, failed };
}
