import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { message: `Hello ${input.name}!` };
    }),
  chat: t.procedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      // Integrate with backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.message }),
      });
      return response.json();
    }),
  llmMetrics: t.procedure
    .query(async () => {
      // Get LLM usage metrics from backend
      try {
        const response = await fetch('http://localhost:8000/v1/models');
        const models = await response.json();
        return {
          providers: ['OpenAI', 'Gemini', 'DeepSeek'],
          models: models.data || [],
          totalRequests: 0, // Would come from backend metrics
          totalCost: 0, // Would come from backend metrics
        };
      } catch (error) {
        return {
          providers: ['OpenAI', 'Gemini', 'DeepSeek'],
          models: [],
          totalRequests: 0,
          totalCost: 0,
        };
      }
    }),
  auth: t.router({
    register: t.procedure
      .input(z.object({
        email: z.string().email(),
        username: z.string(),
        password: z.string().min(8),
        fullName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const response = await fetch('http://localhost:8000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Registration failed');
        }

        return response.json();
      }),
    login: t.procedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const formData = new URLSearchParams();
        formData.append('username', input.username);
        formData.append('password', input.password);

        const response = await fetch('http://localhost:8000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Login failed');
        }

        return response.json();
      }),
    me: t.procedure
      .query(async ({ ctx }) => {
        // This would need authentication context
        // For now, return a placeholder
        return null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
