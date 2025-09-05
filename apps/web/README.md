# T3 Chat Clone - Frontend Web Application

This is the frontend web application for the T3 Chat Clone project, built with Next.js 14, React 18, and TypeScript.

## 🚀 Features

- **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- **Authentication**: NextAuth.js with JWT and OAuth providers
- **Real-time Chat**: WebSocket integration for instant messaging
- **AI Integration**: Support for multiple LLM providers
- **File Sharing**: Drag-and-drop file uploads with processing
- **Responsive Design**: Mobile-first responsive design
- **TypeScript**: Full type safety with shared types

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Authentication**: NextAuth.js
- **State Management**: TanStack Query
- **Real-time**: Socket.io Client
- **Markdown**: react-markdown with syntax highlighting
- **File Upload**: react-dropzone

## 📦 Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

3. Configure your environment variables in `.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 🚀 Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## 🏗️ Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── providers/         # Context providers
│   └── ui/               # UI components
├── lib/                  # Utility libraries
│   ├── api-client.ts     # API client
│   ├── auth.ts          # NextAuth configuration
│   └── websocket.ts     # WebSocket client
└── README.md
```

## 🔧 Configuration

### Environment Variables

- `NEXTAUTH_URL`: The URL of your application
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WS_URL`: WebSocket server URL
- OAuth provider credentials (optional)

### API Client

The API client (`lib/api-client.ts`) handles:

- Automatic token management
- Request/response interceptors
- Error handling
- Type-safe API calls

### WebSocket Client

The WebSocket client (`lib/websocket.ts`) provides:

- Real-time chat functionality
- Connection management
- Event handling
- Automatic reconnection

## 🎨 UI Components

The application uses shadcn/ui components with custom styling:

- Button, Input, Card components
- Responsive design
- Dark/light theme support
- Accessibility features

## 🔐 Authentication

Authentication is handled by NextAuth.js with support for:

- Email/password login
- OAuth providers (Google, GitHub)
- JWT tokens
- Session management
- Protected routes

## 📱 Responsive Design

The application is fully responsive with:

- Mobile-first design
- Flexible layouts
- Touch-friendly interactions
- Optimized for all screen sizes

## 🚀 Deployment

The application can be deployed to:

- Vercel (recommended)
- Netlify
- Any Node.js hosting platform

Build for production:

```bash
pnpm build
pnpm start
```

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Write meaningful commit messages
4. Test your changes thoroughly

## 📄 License

This project is part of the T3 Chat Clone challenge.
