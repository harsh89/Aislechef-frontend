# Frontend — Development Workflow

For every feature, follow this loop until complete:
1. Implement the component / screen / store
2. Write tests (`*.test.tsx` or `*.test.ts` co-located with source, using `@testing-library/react-native`)
3. Run: `npm run test`
4. Fix any failures. Repeat until green.
5. Only then move to the next feature.

## Commands

- Run all tests:        `npm run test`
- Watch mode:           `npm run test:watch`
- Start dev server:     `npm run start`
- Run on iOS:           `npm run ios`
- Run on Android:       `npm run android`
