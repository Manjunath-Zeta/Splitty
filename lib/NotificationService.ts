import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
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
        console.warn('Failed to get push token for push notification! Permissions not granted.');
        return undefined;
      }
      
      try {
        // Check if the native module is available before calling getExpoPushTokenAsync
        if (!Notifications.getExpoPushTokenAsync) {
          console.warn('Notifications.getExpoPushTokenAsync is not available. Is the native module linked correctly?');
          return undefined;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          console.warn('Project ID not found in Constants. Cannot get Expo Push Token.');
          return undefined;
        }
        
        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        
        console.log('Expo Push Token:', token);
        return token;
      } catch (e) {
        console.warn('Error getting expo push token', e);
        return undefined;
      }
    } else {
      console.warn('Must use physical device for Push Notifications');
      return undefined;
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
