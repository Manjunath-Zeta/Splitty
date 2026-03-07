// expo-notifications has been temporarily removed.
// This service is stubbed out as a no-op until push notifications are re-added.

class NotificationService {
    private static instance: NotificationService;

    private constructor() { }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    public async registerForPushNotificationsAsync(): Promise<string | undefined> {
        return undefined;
    }

    public async showLocalNotification(_title: string, _body: string, _data: any = {}) {
        // no-op
    }

    public async notifyNewExpense(_userName: string, _expenseName: string, _amount: string, _share: string) {
        // no-op
    }

    public async notifySettlement(_userName: string, _amount: string) {
        // no-op
    }

    public async notifyBudgetAlert(_categoryName: string, _percentage: number, _remainingDays: number) {
        // no-op
    }
}

export const notificationService = NotificationService.getInstance();
