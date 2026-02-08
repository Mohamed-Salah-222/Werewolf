// THE ENTRY POINT - starts everything
// 1. Imports app from app.ts
// 2. Creates HTTP server
// 3. Creates Socket.io instance
// 4. Connects to MongoDB (optional)
// 5. Creates Manager instance
// 6. Passes io and manager to socketHandlers
// 7. Starts listening on port
// This is what you run: ts-node src/server.ts