# Task Completion Checklist

When completing any coding task in this project, follow these steps:

## 1. Code Quality Checks
- [ ] Run linter: `npm run lint`
- [ ] Fix any ESLint errors or warnings
- [ ] Ensure TypeScript types are properly defined (no `any` types)

## 2. Testing
- [ ] Write/update tests for new functionality
- [ ] Run unit tests: `npm run test`
- [ ] Ensure test coverage meets 70% threshold
- [ ] For UI changes, consider E2E tests: `npm run test:e2e`

## 3. Manual Testing
- [ ] Start dev server: `npm run dev`
- [ ] Test functionality in browser
- [ ] Check responsive design (mobile, tablet, desktop)
- [ ] Verify MongoDB operations work correctly

## 4. Build Verification
- [ ] Run production build: `npm run build`
- [ ] Ensure no build errors
- [ ] Test production build: `npm run start`

## 5. Code Review Preparation
- [ ] Remove console.log statements (except error logging)
- [ ] Check for proper error handling
- [ ] Verify consistent code style
- [ ] Update relevant documentation if needed

## 6. Data Model Considerations
- [ ] Check if changes align with MongoDB schema
- [ ] Note any schema/UI inconsistencies (title/author fields)
- [ ] Verify character limits match between UI and schema

## Common Issues to Check
- MongoDB connection errors (ensure MongoDB is running)
- Missing environment variables
- Unhandled promise rejections in API routes
- Memory leaks in React components (cleanup effects)