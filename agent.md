# Splitty Agent Knowledge Base

This document provides architectural context, best practices, and lessons learned for AI agents working on the Splitty project. Refer to this before making significant changes to ensure consistency with the existing design and security patterns.

## 🚀 Project Overview
Splitty is a skeuomorphic expense tracking and bill-splitting application built with Expo and Supabase. It features a rich, tactile UI and robust real-time data synchronization.

### Tech Stack
- **Framework**: Expo (React Native) with SDK 52+
- **Navigation**: `expo-router` (File-based routing)
- **State Management**: Zustand (`store/useSplittyStore.ts`)
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: Vanilla `StyleSheet` with a custom `Skeuomorphic` and `BasePalettes` system.
- **Icons**: Lucide-react-native

---

## 🏗️ Architecture Details

### 1. Global State (`useSplittyStore`)
The store is the heart of the application. It handles:
- **Data Persistence**: Syncs with Supabase.
- **Optimistic Updates**: UI updates immediately (e.g., `addExpense`, `editFriend`) before the server confirms, ensuring a "snappy" feel.
- **Real-time Sync**: Uses Supabase Realtime (`subscribeToChanges`) to reflect changes from other users (inserts, deletes, updates) instantly.
- **Theming**: Manages `appearance` (light/dark) and `designPreference` (skeuomorphic/flat).
- **Data Isolation**: Functions like `fetchData` **MUST** always filter by `user_id` using the session's user ID.

### 2. ID Mapping (Real UUIDs vs Local IDs)
The app uses a dual ID system to handle "local friends" vs "linked real users":
- **`self`**: Always represents the current session user.
- **UUIDs**: Real Supabase profile IDs.
- **Local IDs**: Unique IDs for friends who are not yet linked to a real user.
- **Helpers**: Use `mapToRealId` and `mapToLocalId` in the store to translate between these contexts when syncing with the DB.

### 3. Dual Write Pattern
When adding or editing expenses, the store performs a **Dual Write**:
1. It updates the `expenses` table.
2. It simultaneously manages the `expense_participants` table to ensure accurate split records for all involved parties (profiles and friends).

### 4. Navigation & Auth Guard (`app/_layout.tsx`)
The root layout manages the authentication state and redirection logic.
- **Redirection Logic**: Carefully handles the transition between `(auth)` and `(tabs)`. 
- **Critical**: Avoid direct state mutations that trigger redirection loops. Always verify the current path using `segments` before navigating.

### 5. Design System
The app uses a premium skeuomorphic design.
- **Theme Tokens**: Located in `constants/Colors.ts`.
- **Skeuo Utilities**: `skeuo.outset`, `skeuo.inset`, and `skeuo.surfaceGradient` are applied to `View` components to create depth.

---

## ⚡ Features Implementation

### 📸 Bill Attachments
- **Storage**: Bills are uploaded to the `bills` bucket in Supabase Storage under `user_id/timestamp.ext`.
- **Logic**: Use `uploadBill(uri)` in the store which returns a public URL to be stored with the expense.

### 🔔 Push Notifications
- **Registration**: Handled via `initNotifications()` using `expo-notifications`.
- **Sync**: The push token is stored in the user's `profiles.preferences`.
- **Triggers**: Budget alerts and new expense notifications are triggered both locally (for speed) and can be extended via Supabase Edge Functions.

### ✅ Optimistic UI Updates
When performing mutations (adding expenses, editing friends), update the local store state **immediately**. This prevents the UI from feeling sluggish. Always handle the server response in the background and only trigger a full `fetchData` or revert if a critical sync error occurs.

### ✅ Debounced Server Sync
Real-time listeners (`subscribeToChanges`) can trigger many events in rapid succession. Use a debounce (e.g., 1.5s) before calling `fetchData` to avoid redundant network requests and UI flickering during bulk updates.

---

## ⚠️ Common Pitfalls & Mistakes to Avoid
**Avoid**: `const { friends, expenses } = useSplittyStore();` (Triggers re-render on *any* store change).
**Prioritize**:
```typescript
const friends = useSplittyStore(state => state.friends);
const expenses = useSplittyStore(state => state.expenses);
```
This is critical for performance in complex screens like `AddExpenseScreen`.

### ✅ Data Isolation (Security)
Always enforce `user_id` filtering at the store level. Never assume the database RLS is enough; the client should explicitly query only the current user's data to prevent leaks and performance degradation.
```typescript
.from('expenses').select('*').eq('user_id', userId)
```

### ✅ Performance Guards
- **List Limits**: When rendering repetitive UI chips (like categories), use `.slice(0, N)` or virtualization if the list can be large.
- **Memoization**: Use `useMemo` for derived data (balances, filtered lists) to avoid expensive recalculations on every render.

---

## ⚠️ Common Pitfalls & Mistakes to Avoid

1. **Illegal Hook Wrapping**: Never wrap hooks (like `useRouter` or `useLocalSearchParams`) inside `if` statements or loops. This violates React's Rules of Hooks and causes crashes during navigation.
2. **Missing `user_id` Filters**: A major past issue was fetching global data. Always check that new queries are scoped to the user.
3. **Verbose Logging**: Avoid leaving `console.log` in `_layout.tsx` or high-frequency render functions in production code.
4. **Redirection Loops**: Don't call `router.replace()` inside a `useEffect` that depends on data that the redirection itself changes.

---

## 🛠️ Useful Commands

- **Run Dev Server**: `npx expo start`
- **Lint Check**: `npm run lint` (if configured)
- **Git Status**: `git status`

---

## 📈 Process Improvements
- **Verification**: When fixing UI issues, use the `browser_subagent` to capture screenshots of specific states.
- **Step-by-Step**: For complex state refactors, do one selector at a time and verify the "popup" speed or transition responsiveness.
- **Documentation**: Update this `agent.md` whenever a new core pattern (e.g., a new service layer or complex animation) is introduced.

---

## ⚙️ Agent Workflow
When given a task:
1. **Understand the problem**: Fully grasp the intent and impact.
2. **Locate relevant files**: Audit the codebase for all affected areas.
3. **Plan minimal changes**: Design the most efficient and least intrusive solution.
4. **Implement solution**: Write clean, consistent code following project patterns.
5. **Verify build success**: Ensure the app builds and functions as expected.
6. **Summarize changes**: Always explain what was changed and why.

---

## 🚫 Things to Avoid
Keep the codebase stable and clean by avoiding:
- **Unnecessary dependencies**: Don't add libraries for simple tasks.
- **Major architectural changes**: Respect the existing structure unless a refactor is explicitly requested.
- **Code duplication**: Centralize logic in the store or helper utilities.
- **Large unreviewed refactors**: Break changes into manageable, logical blocks.

---

## ❓ When Unsure
If requirements are unclear:
1. **Ask for clarification**: Don't proceed on assumptions for critical behavior.
2. **Propose options**: Give the user choices when there are multiple valid approaches.
3. **Do not guess**: Avoid making "best guesses" for core security or architectural logic.

**End goal**: Maintain a stable, clean, and maintainable codebase.
