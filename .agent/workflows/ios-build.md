---
description: How to build and run the Splitty iOS app
---

1. Start the dev build and Metro bundler:

npx expo run:ios --device --scheme Splitty

=====================================

2. Build and install the Release version on your phone:

npx expo run:ios --device --scheme Splitty --configuration Release

=======================================

3. just to restart metro without rebuilding
npx expo start --dev-client

=======================================

# Terminal 1 — start the bundler
npx expo start

# Terminal 2 — build & install on device
npx expo run:ios --device

========================================
gor generating new branches
git switch -c feature/my-new-feature

==================================
For pushing
git push --set-upstream origin your-branch-name

==============================