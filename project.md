# Splitty - Project Reference

Splitty is a modern, skeuomorphic expense sharing mobile application built with React Native and Expo. It allows users to track shared expenses, manage debts, and visualize their spending analytics.

## 🚀 Tech Stack

### Frontend
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (v54 SDK)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (v6) - File-based routing for React Native.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) - Lightweight and fast state management with optimistic updates.
- **Icons**: [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native)
- **UI Components**:
    - [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
    - [React Native Gifted Charts](https://ajay-ss.github.io/react-native-gifted-charts/) (for Analytics)
    - [React Native Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/) (for animations)
    - [React Native SVG](https://docs.expo.dev/versions/latest/sdk/svg/)
- **Features**:
    - **Push Notifications**: [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) for real-time budget alerts and expense updates.
    - **Bill Attachments**: Integrated camera and library access to attach receipts to expenses, stored via Supabase Storage.
    - **Skeuomorphic Design**: Custom premium UI with tactile elements and depth.

### Backend & Infrastructure
- **Database & Auth**: [Supabase](https://supabase.com/) (Postgres, GoTrue for Auth, Realtime for sync).
- **Storage**: [Supabase Storage](https://supabase.com/storage) for bill attachments.
- **Environment Management**: `.env` for local secrets.
- **Build System**: [Expo Application Services (EAS)](https://expo.dev/eas)

## 🛠️ Main Tools & Services

| Tool | Purpose |
| :--- | :--- |
| **Expo CLI** | Development and local testing |
| **EAS CLI** | Cloud builds and deployments |
| **Supabase Dashboard** | Database management and Auth configuration |
| **PostgreSQL** | Relational database hosted on Supabase |
| **Apple Developer Portal** | iOS distribution and capabilities (Sign-in with Apple, Push) |
| **Google Cloud Console** | Google OAuth configuration |

## 📁 Project Structure

- `/app`: Contains all the app logic and screens (Expo Router).
    - **Dashboard**: Overview of balances (`index.tsx`).
    - **Analytics**: Spend breakdown and charts (`analytics.tsx`).
    - **Add Expense**: Detailed split and bill attachment logic (`add-expense.tsx`).
    - **Activity Log**: Real-time history of splits and settlements (`activity-log.tsx`).
    - **Debt Tree**: Hierarchical view of who owes whom (`debt-tree.tsx`).
    - **Budgeting**: Category-based budget tracking and rollover (`set-budget.tsx`).
- `/components`: Reusable UI components (Buttons, Modals, Cards, Skeuomorphic wrappers).
- `/supabase`: SQL migrations, schema definitions, and backend config.
- `/lib`: Helper functions and shared utilities (e.g., Supabase client, Notification Service).
- `/store`: Zustand store (`useSplittyStore.ts`) for global state and sync.
- `/assets`: Images, fonts, and icons.
- `/constants`: Design tokens (Colors, Typography, Categories).

## 📱 Platforms
- **iOS**: Primary target (iPhone) - Supports Apple Sign-In and Push Notifications.
- **Android**: Supported via Expo.
- **Web**: Supported for administrative or quick-view purposes.

## 📌 Quick Commands
- `npm start`: Start the Expo dev server
- `npm run ios`: Run the app on iOS simulator
- `npm run android`: Run the app on Android emulator
- `eas build --platform ios`: Trigger an iOS cloud build
