export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const AVATAR_MAX_BYTES = 5_000_000;

export function avatarFileError(file: File): 'type' | 'size' | null {
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
    if (file.size < 1 || file.size > AVATAR_MAX_BYTES) return 'size';
    return null;
}
