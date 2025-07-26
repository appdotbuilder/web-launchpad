
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  registerUserInputSchema, 
  loginUserInputSchema,
  createLinkInputSchema,
  updateLinkInputSchema,
  deleteLinkInputSchema,
  getUserLinksInputSchema,
  reorderLinksInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createLink } from './handlers/create_link';
import { getUserLinks } from './handlers/get_user_links';
import { updateLink } from './handlers/update_link';
import { deleteLink } from './handlers/delete_link';
import { reorderLinks } from './handlers/reorder_links';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User authentication routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),
    
  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),
  
  // Link management routes
  createLink: publicProcedure
    .input(createLinkInputSchema)
    .mutation(({ input }) => createLink(input)),
    
  getUserLinks: publicProcedure
    .input(getUserLinksInputSchema)
    .query(({ input }) => getUserLinks(input)),
    
  updateLink: publicProcedure
    .input(updateLinkInputSchema)
    .mutation(({ input }) => updateLink(input)),
    
  deleteLink: publicProcedure
    .input(deleteLinkInputSchema)
    .mutation(({ input }) => deleteLink(input)),
    
  reorderLinks: publicProcedure
    .input(reorderLinksInputSchema)
    .mutation(({ input }) => reorderLinks(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
