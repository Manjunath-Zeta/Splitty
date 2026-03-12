# Splitty - Project Reference

Splitty is a modern, skeuomorphic expense sharing mobile application built with React Native and Expo. It allows users to track shared expenses, manage debts, and visualize their spending analytics.

## 🚀 Tech Stack

### Frontend
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (v54 SDK)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (v6) - File-based routing for React Native.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) - Lightweight and fast state management.
- **Icons**: [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native)
- **UI Components**:
    - [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
    - [React Native Gifted Charts](https://ajay-ss.github.io/react-native-gifted-charts/) (for Analytics)
    - [React Native Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/) (for animations)
    - [React Native SVG](https://docs.expo.dev/versions/latest/sdk/svg/)

### Backend & Infrastructure
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, GoTrue for Auth, Pelikan for Storage)
- **Environment Management**: `.env` for local secrets.
- **Build System**: [Expo Application Services (EAS)](https://expo.dev/eas)

## 🛠️ Main Tools & Services

| Tool | Purpose |
| :--- | :--- |
| **Expo CLI** | Development and local testing |
| **EAS CLI** | Cloud builds and deployments |
| **Supabase Dashboard** | Database management and Auth configuration |
| **PostgreSQL** | Relational database hosted on Supabase |
| **Apple Developer Portal** | iOS distribution and capabilities (Sign-in with Apple) |
| **Google Cloud Console** | Google OAuth configuration |

## 📁 Project Structure

- `/app`: Contains all the app logic and screens (Expo Router).
- `/components`: Reusable UI components (Buttons, Modals, Cards).
- `/supabase`: SQL migrations, schema definitions, and backend config.
- `/lib`: Helper functions and shared utilities (e.g., Supabase client).
- `/store`: Zustand store for global state.
- `/assets`: Images, fonts, and icons.
- `/constants`: Design tokens (Colors, Typography).

## 📱 Platforms
- **iOS**: Primary target (iPhone)
- **Android**: Supported via Expo
- **Web**: Supported for administrative or quick-view purposes

## 📌 Quick Commands
- `npm start`: Start the Expo dev server
- `npm run ios`: Run the app on iOS simulator
- `npm run android`: Run the app on Android emulator
- `eas build --platform ios`: Trigger an iOS cloud build
