# Campus Gate Access Control System

## Overview

This is a comprehensive campus vehicle access control system built with a full-stack TypeScript architecture. The application manages student vehicle entry/exit through automated gate systems using license plate recognition and student ID barcode scanning. It provides real-time monitoring, access logging, alert management, and student database administration for campus security.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React with TypeScript for type-safe UI development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Support for light/dark mode themes
- Component variants managed through class-variance-authority

**Real-Time Communication**
- WebSocket connection for live updates (access logs, alerts, verification status)
- Custom `useWebSocket` hook for connection management and automatic reconnection
- Real-time dashboard updates triggered by WebSocket messages

**Key Features**
- Dashboard with live statistics (total access, granted/denied counts, active gates)
- Camera station interface for license plate and barcode scanning
- Student management with search, filtering, and CRUD operations
- Access log viewing with real-time updates
- Alert system for unauthorized access and system events

**Design Patterns**
- Custom hooks for reusable logic (webcam access, WebSocket, toast notifications)
- Query invalidation strategy for cache synchronization
- Separation of concerns with dedicated component files

### Backend Architecture

**Server Framework**
- Express.js for HTTP API and middleware handling
- Native HTTP server upgraded with WebSocket support
- Session-based request logging with JSON response capture

**API Design**
- RESTful endpoints for CRUD operations
- Dedicated routes for dashboard stats, student search, vehicle verification
- WebSocket broadcasting for real-time client updates
- Middleware for request/response logging and JSON parsing

**Development Setup**
- Vite integration in middleware mode for HMR during development
- Production build separates client bundle and server bundle
- Custom error handling and logging utilities

### Data Storage

**Database**
- PostgreSQL as the primary database (via Neon serverless)
- Drizzle ORM for type-safe database operations
- Schema-first approach with TypeScript types generated from Drizzle schemas

**Schema Design**
- **Students table**: Core student information (ID, name, department, year, contact, photo)
- **Vehicles table**: Vehicle registration linked to students (plate number, type, model, color)
- **Access logs table**: Entry/exit records with timestamps and status (granted/denied)
- **Alerts table**: Security alerts with severity levels and metadata

**Data Relationships**
- One-to-many: Student → Vehicles
- Foreign key references ensure data integrity
- Soft deletion support via `isActive` flags

**Query Patterns**
- Complex joins for access logs with student and vehicle details
- Search with multiple filters (department, year, query string)
- Real-time stats aggregation for dashboard
- Verification queries combining student and vehicle validation

### External Dependencies

**Database & ORM**
- `@neondatabase/serverless`: Serverless PostgreSQL driver for Neon
- `drizzle-orm`: Type-safe ORM with schema-to-TypeScript generation
- `drizzle-kit`: CLI tool for database migrations and schema management
- `drizzle-zod`: Zod schema generation for runtime validation

**UI Component Libraries**
- `@radix-ui/*`: Headless UI primitives (40+ component packages for dialogs, dropdowns, forms, etc.)
- `@tanstack/react-query`: Server state management with caching
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Type-safe component variant management
- `clsx` & `tailwind-merge`: Conditional className utilities

**Form & Validation**
- `react-hook-form`: Performant form state management
- `@hookform/resolvers`: Integration with validation libraries
- `zod`: TypeScript-first schema validation

**Real-Time Communication**
- `ws`: WebSocket server implementation
- Custom WebSocket client hook for browser-side connections

**Development Tools**
- `@replit/vite-plugin-*`: Replit-specific development enhancements
- `tsx`: TypeScript execution for development server
- `esbuild`: Fast bundling for production server build

**Media Processing**
- Browser-native `getUserMedia` API for webcam access
- Canvas API for frame capture (prepared for OCR integration)
- Planned integration points for barcode/QR scanning and license plate recognition

**Session Management**
- `connect-pg-simple`: PostgreSQL session store for Express sessions
- `express-session`: Session middleware (implicit dependency)

**Utility Libraries**
- `date-fns`: Modern date manipulation
- `embla-carousel-react`: Carousel component
- `cmdk`: Command palette component
- `nanoid`: Compact unique ID generation