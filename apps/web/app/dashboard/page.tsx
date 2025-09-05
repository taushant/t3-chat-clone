'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">T3 Chat Clone</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user.name}
              </span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
            <p className="text-gray-600">
              Welcome to your chat dashboard. Here you can manage your conversations and settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Chats</CardTitle>
                <CardDescription>
                  Your recent conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  No recent chats yet. Start a new conversation!
                </p>
                <Button 
                  className="mt-4 w-full" 
                  variant="outline"
                  onClick={() => router.push('/chat')}
                >
                  Start New Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Models</CardTitle>
                <CardDescription>
                  Available AI providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>OpenAI GPT-4</span>
                    <span className="text-green-600">Available</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Anthropic Claude</span>
                    <span className="text-green-600">Available</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>OpenRouter</span>
                    <span className="text-green-600">Available</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => router.push('/chat')}
                >
                  Create New Chat
                </Button>
                <Button className="w-full" variant="outline">
                  Upload Files
                </Button>
                <Button className="w-full" variant="outline">
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Learn how to use T3 Chat Clone
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">1. Start a Conversation</h4>
                    <p className="text-sm text-gray-600">
                      Click "Start New Chat" to begin a conversation with AI or other users.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">2. Upload Files</h4>
                    <p className="text-sm text-gray-600">
                      Share documents, images, and files to get AI-powered insights.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">3. Real-time Chat</h4>
                    <p className="text-sm text-gray-600">
                      Experience instant messaging with typing indicators and delivery confirmations.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">4. AI Integration</h4>
                    <p className="text-sm text-gray-600">
                      Chat with multiple AI providers and get streaming responses.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
