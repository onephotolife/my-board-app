# Project Structure

```
my-board-app/
├── src/                      # Source code
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API endpoints
│   │   │   └── posts/       # CRUD operations for posts
│   │   │       ├── route.ts # GET all, POST new
│   │   │       └── [id]/    
│   │   │           └── route.ts # PUT update, DELETE
│   │   ├── globals.css      # Global styles (Tailwind)
│   │   ├── layout.tsx       # Root layout with providers
│   │   ├── page.tsx         # Home page (Server Component)
│   │   └── providers.tsx    # MUI theme provider
│   ├── components/          # React components
│   │   ├── BoardClient.tsx  # Client-side board logic
│   │   ├── EditDialog.tsx   # Modal for editing posts
│   │   ├── PostForm.tsx     # New post creation form
│   │   ├── PostItem.tsx     # Individual post display
│   │   ├── VirtualizedPostList.tsx # Performance optimized list
│   │   └── __tests__/       # Component tests
│   ├── lib/                 # Utilities
│   │   └── mongodb.ts       # Database connection
│   ├── models/              # Data models
│   │   └── Post.ts          # Mongoose schema
│   └── types/               # TypeScript types
│       └── global.d.ts      # Global type definitions
├── public/                  # Static assets
├── e2e/                     # Playwright E2E tests
├── scripts/                 # Utility scripts
├── docs/                    # Documentation
├── logs/                    # Application logs
├── .github/                 # GitHub Actions workflows
│   ├── workflows/          
│   │   ├── pr-check.yml    # PR validation
│   │   ├── pr-label.yml    # Auto-labeling
│   │   └── pr-size.yml     # PR size check
│   └── PULL_REQUEST_TEMPLATE/
├── package.json             # Dependencies & scripts
├── tsconfig.json           # TypeScript config
├── next.config.ts          # Next.js configuration
├── jest.config.js          # Jest test config
├── playwright.config.ts    # E2E test config
├── eslint.config.mjs       # Linting rules
├── postcss.config.mjs      # PostCSS for Tailwind
└── CLAUDE.md               # Project documentation

## Key Directories
- **src/app/api**: RESTful API implementation
- **src/components**: Reusable UI components
- **src/models**: Database schemas
- **.github/workflows**: CI/CD automation

## Important Files
- **src/app/page.tsx**: Entry point, fetches initial data
- **src/components/BoardClient.tsx**: Main interactive UI
- **src/lib/mongodb.ts**: Database connection singleton
- **next.config.ts**: Performance optimizations, caching