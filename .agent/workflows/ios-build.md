---
description: How to build and run the Splitty iOS app
---

# 📱 Splitty iOS Build Workflow
This workflow describes how to build and run the Splitty iOS app with support for Push Notifications and Apple Sign-In.

## 🛠️ Prerequisites
- **Xcode** installed on macOS.
- **Apple Developer Account** (required for Push and Apple Sign-In).
- **EAS CLI** installed (`npm install -g eas-cli`).

## 🚀 Running Locally

### 1. Start the Metro Bundler
Keep this running in a separate terminal:
```bash
npx expo start --dev-client
```

### 2. Build and Run on Device/Simulator
For a local development build on a physical device (requires codesigning):
```bash
npx expo run:ios --device --scheme Splitty
```

For the iOS Simulator:
```bash
npx expo run:ios
```

## 📦 Production & Distribution

### 1. Sync Native Files (if needed)
If you've modified `app.json` plugins or native configuration:
```bash
npx expo prebuild --platform ios
```

### 2. EAS Build (Cloud)
To trigger an iOS build via Expo Application Services:
```bash
eas build --platform ios
```
*Note: Ensure you have configured your Apple credentials in EAS.*

### 3. Archive for App Store (Release)
```bash
npx expo run:ios --device --scheme Splitty --configuration Release
```

## 🌿 Git Operations
For new features:
```bash
git switch -c feature/my-new-feature
```

To push changes:
```bash
git push --set-upstream origin your-branch-name
```