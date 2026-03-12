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
- **Theming**: Manages `appearance` (light/dark) and `designPreference` (skeuomorphic/flat).
- **Data Isolation**: Functions like `fetchData` **MUST** always filter by `user_id` using the session's user ID.

### 2. Navigation & Auth Guard (`app/_layout.tsx`)
The root layout manages the authentication state and redirection logic.
- **Redirection Logic**: Carefully handles the transition between `(auth)` and `(tabs)`. 
- **Critical**: Avoid direct state mutations that trigger redirection loops. Always verify the current path using `segments` before navigating.

### 3. Design System
The app uses a premium skeuomorphic design.
- **Theme Tokens**: Located in `constants/Colors.ts`.
- **Skeuo Utilities**: `skeuo.outset`, `skeuo.inset`, and `skeuo.surfaceGradient` are applied to `View` components to create depth.

---

## 💎 Best Practices & Cleanup

### ✅ Granular Store Selectors
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
