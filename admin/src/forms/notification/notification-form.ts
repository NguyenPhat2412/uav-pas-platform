import type {NotificationType, SendNotificationInput} from '@/types/notification/notification.types';

export type {NotificationType, SendNotificationInput};

export interface NotificationRecipientOption {
    id: number;
    name: string;
}

export interface SendNotificationDraft {
    recipient: NotificationRecipientOption | null;
    title: string;
    content: string;
    type: NotificationType;
}

export type NotificationFieldErrors = Partial<
    Record<'userId' | 'title' | 'content' | 'message' | 'type', string>
>;

export function emptySendNotificationDraft(): SendNotificationDraft {
    return {
        recipient: null,
        title: '',
        content: '',
        type: 'SYSTEM',
    };
}

export function canSubmitSendNotification(draft: SendNotificationDraft): boolean {
    return Boolean(draft.recipient && draft.title.trim() && draft.content.trim());
}

export function toSendNotificationPayload(draft: SendNotificationDraft): SendNotificationInput {
    return {
        userId: draft.recipient?.id ?? 0,
        title: draft.title.trim(),
        content: draft.content.trim(),
        type: draft.type,
    };
}

export function notificationFieldErrors(error: unknown): NotificationFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as NotificationFieldErrors) : null;
}

