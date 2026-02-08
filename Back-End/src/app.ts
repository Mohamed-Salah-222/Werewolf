// Express app setup
// Sets up middleware: express.json(), cors(), logging middleware
// Mounts routes: app.use('/api/games', gameRoutes)
// Sets up error handler: app.use(errorHandler)
// Exports app (does NOT start server, that's server.ts's job)
// Used by: server.ts