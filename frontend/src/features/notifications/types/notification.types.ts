export type NotificationType = 'MISSION_ASSIGNED' | 'MISSION_STATUS_CHANGED' | 'SAR_TARGET_FOUND' | 'QUOTA_WARNING' | 'PAYMENT' | 'SYSTEM';

export const notificationTypes: NotificationType[] = ['MISSION_ASSIGNED', 'MISSION_STATUS_CHANGED', 'SAR_TARGET_FOUND', 'QUOTA_WARNING', 'PAYMENT', 'SYSTEM'];

/** GET /api/v1/notifications row; always the signed-in user's own inbox. */
export interface NotificationRecord {
    id: number;
    userId: number;
    title: string;
    content: string;
    type: NotificationType | null;
    referenceType: string | null;
    referenceId: number | null;
    isRead: boolean;
    createdAt: string;
}

export interface SendNotificationInput {
    userId: number;
    title: string;
    content: string;
    type: NotificationType;
}
