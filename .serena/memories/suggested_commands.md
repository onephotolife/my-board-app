# Suggested Commands for My Board App

## Development
- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server

## Testing
- `npm run test` - Run unit tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (threshold: 70%)
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run Playwright tests with UI
- `npm run test:e2e:headed` - Run Playwright tests in headed mode

## Code Quality
- `npm run lint` - Run ESLint (Next.js configuration)
- Note: No formatter (Prettier) is configured

## Git Commands
- `git status` - Check current changes
- `git diff` - View uncommitted changes
- `git add .` - Stage all changes
- `git commit -m "message"` - Commit changes
- `git push` - Push to remote
- `git pull` - Pull latest changes
- `git checkout -b branch-name` - Create new branch
- `git merge branch-name` - Merge branch

## MongoDB
- Ensure MongoDB is running locally on default port 27017
- Database name: board-app
- Collection: posts

## Darwin (macOS) Utilities
- `open .` - Open current directory in Finder
- `pbcopy < file` - Copy file contents to clipboard
- `pbpaste > file` - Paste clipboard to file
- `say "text"` - Text to speech
- `mdfind "query"` - Spotlight search from terminal
- `caffeinate` - Prevent system sleep