# My Board App - Project Overview

## Purpose
オープン掲示板アプリケーション (Open Board Application) - A simple bulletin board application where users can create, edit, and delete posts.

## Tech Stack
- **Framework**: Next.js 15.4.5 (App Router)
- **Language**: TypeScript 5 (strict mode enabled)
- **UI Library**: Material-UI (MUI) v7.2.0
- **Database**: MongoDB with Mongoose v8.17.0
- **Styling**: 
  - Tailwind CSS v4 (PostCSS)
  - Emotion (for MUI components)
- **Development**: 
  - ESLint v9 (with Next.js config)
  - Turbopack (development server)
  - Jest v30 (unit testing)
  - Playwright (E2E testing)

## Architecture
- Next.js App Router pattern
- Server Components for initial data fetching
- Client Components for interactive features
- RESTful API routes
- MongoDB for data persistence

## Data Model
Post schema includes:
- title: string (max 100 chars) - required
- content: string (max 500 chars) - required  
- author: string (max 50 chars) - required
- createdAt: Date - auto-generated
- updatedAt: Date - auto-generated

Note: Current UI only uses content field (200 char limit). Title and author fields are in schema but not implemented in UI.

## Environment Variables
- MONGODB_URI: MongoDB connection string (default: mongodb://localhost:27017/board-app)