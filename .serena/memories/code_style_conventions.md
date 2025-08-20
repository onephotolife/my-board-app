# Code Style and Conventions

## TypeScript Configuration
- Target: ES2017
- Strict mode: enabled
- Module resolution: bundler
- Path alias: @/* maps to ./src/*
- JSX: preserve

## Code Style Patterns

### React Components
- Functional components with TypeScript interfaces
- Use React.memo() for performance optimization
- Props interfaces suffixed with "Props" (e.g., PostItemProps)
- Hooks at the top of components
- Event handlers prefixed with "on" (onEdit, onDelete)

### File Naming
- Components: PascalCase (PostItem.tsx, EditDialog.tsx)
- API routes: lowercase (route.ts)
- Utilities: camelCase (mongodb.ts)
- Test files: *.test.ts or in __tests__ folders

### Imports
- Use @/ alias for src imports
- Group imports: React/Next, external libs, internal modules
- Named exports for components, default export for pages

### Material-UI Styling
- Use sx prop for component styling
- Responsive values using breakpoint objects: { xs, sm, md }
- Theme-aware color values (e.g., 'action.hover')

### State Management
- Local state with useState
- Server state fetched in Server Components
- Client-side updates with optimistic UI

### Error Handling
- Try-catch blocks in API routes
- Return appropriate HTTP status codes
- Console.error for debugging

### Testing
- Jest for unit tests
- Testing Library for component tests
- Coverage threshold: 70% for all metrics
- Mock external dependencies

## ESLint Rules
- Next.js core-web-vitals configuration
- TypeScript ESLint rules enabled

## No Code Formatting Tool
- Project does not use Prettier or other formatter
- Rely on ESLint for code quality