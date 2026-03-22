Based on my review of the Splitty codebase, here are the key improvements I identified:
Code Review Summary
1. Performance Issues
Issue	Location
Verbose logging in production	_layout.tsx:32,40,65,73,83,101-111, useSplittyStore.ts:451,455,692
Missing TypeScript strict checks	package.json
No useCallback/useMemo on expensive selectors	add-expense.tsx
2. Store Issues (useSplittyStore.ts)
Issue	Line	Fix
Hardcoded friend exclusion	823	"Alwyn", "Manasa" — should be user-configurable
Expense split mapping logic duplicating	651-671	expense_participants mapping duplicates split_with mapping
Memory leak risk	92	fetchDataTimeout at module level could persist stale closures
No error boundary in async operations	fetchData()	Silent failures on partial data loads
3. Security Concerns
- No RLS validation in client (agent.md mentions user_id filtering, but no verification)
- Hardcoded names at line 823 bypass data integrity
- No input sanitization for description in add-expense.tsx
4. UX/UI Improvements
1. Missing loading states — FAB has no disabled state during save
2. No empty states for Groups/Friends — friends.tsx should show EmptyState
3. Debounce handleTypeChange — rapid toggling causes flicker
4. Missing haptic feedback on category selection
5. Recommended Quick Wins
1. Remove console.log statements in production
2. Add React.memo() to ExpenseCard/ListItem components  
3. Use useDeferredValue for search filtering
4. Implement skeleton loaders for dashboard
5. Add error boundaries around tab screens
6. Code Smell
- Duplicate ID mapping logic — mapToLocalId/mapToRealId appear in multiple places
- Magic strings — 'self' used as sentinel value throughout
- any type abuse — Multiple as any casts bypass TypeScript safety