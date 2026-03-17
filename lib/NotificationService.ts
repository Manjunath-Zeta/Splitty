import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async registerForPushNotificationsAsync(): Promise<string | undefined> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        
        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        
        console.log('Expo Push Token:', token);
        return token;
      } catch (e) {
        console.error('Error getting expo push token', e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  }

  public async showLocalNotification(title: string, body: string, data: any = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
  }

  // Keep these stubs for local testing if needed, but primary notifications will come from Supabase now.
  public async notifyNewExpense(userName: string, expenseName: string, amount: string, share: string) {
    await this.showLocalNotification(
      'New Expense Added',
      `${userName} added "${expenseName}" for ${amount}.`
    );
  }

  public async notifySettlement(userName: string, amount: string) {
    await this.showLocalNotification(
      'Settlement',
      `${userName} paid you ${amount}.`
    );
  }

  public async notifyBudgetAlert(categoryName: string, percentage: number, remainingDays: number) {
    await this.showLocalNotification(
      'Budget Alert',
      `You have spent ${percentage}% of your ${categoryName} budget. ${remainingDays} days remaining.`
    );
  }
}

export const notificationService = NotificationService.getInstance();
