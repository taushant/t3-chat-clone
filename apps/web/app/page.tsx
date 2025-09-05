import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            T3 Chat Clone
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A modern chat application with real-time messaging, AI integration, and file sharing capabilities.
            Built with Next.js, NestJS, and WebSockets.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" size="lg" className="px-8">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  💬
                </div>
                Real-time Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Experience instant messaging with WebSocket-powered real-time communication,
                typing indicators, and message delivery confirmations.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  🤖
                </div>
                AI Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Chat with multiple AI providers including OpenAI, Anthropic, and OpenRouter
                with streaming responses and context-aware conversations.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  📁
                </div>
                File Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share files, images, and documents with built-in OCR processing,
                vector embeddings, and intelligent content analysis.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Built with Modern Technology
          </h2>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">Next.js 14</span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">NestJS</span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">TypeScript</span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">PostgreSQL</span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">WebSockets</span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">Tailwind CSS</span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">Prisma</span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">Redis</span>
          </div>
        </div>
      </div>
    </main>
  );
}
