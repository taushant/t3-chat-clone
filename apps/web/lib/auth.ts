import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { apiClient } from './api-client';
import { User, AuthResponse } from '@t3-chat/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await apiClient.post<AuthResponse>('/auth/login', {
            email: credentials.email,
            password: credentials.password,
          });

          if (response.user && response.accessToken) {
            // Set the token in the API client
            apiClient.setAuthToken(response.accessToken);
            
            return {
              id: response.user.id,
              email: response.user.email,
              name: `${response.user.firstName} ${response.user.lastName}`,
              username: response.user.username,
              role: response.user.role,
              accessToken: response.accessToken,
            };
          }
        } catch (error) {
          console.error('Authentication error:', error);
        }

        return null;
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        if (account.provider === 'credentials') {
          token.accessToken = user.accessToken;
          token.role = user.role;
          token.username = user.username;
        } else {
          // For OAuth providers, we need to create/link the account
          // This would typically involve calling your backend API
          try {
            const response = await apiClient.post<AuthResponse>('/auth/oauth', {
              provider: account.provider,
              providerId: user.id,
              email: user.email,
              name: user.name,
            });
            
            token.accessToken = response.accessToken;
            token.role = response.user.role;
            token.username = response.user.username;
          } catch (error) {
            console.error('OAuth authentication error:', error);
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.accessToken = token.accessToken as string;
      }

      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Extend the default session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      username: string;
    };
    accessToken: string;
  }

  interface User {
    role: string;
    username: string;
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    username: string;
    accessToken: string;
  }
}
