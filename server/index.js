import http from "node:http";

import "./src/lib/bigintJson.js";
import { env } from "./src/config/env.js";
import { app } from "./src/app.js";
import { sessionMiddleware } from "./src/lib/session.js";
import { setupWebSocketGateway, SOCKET_PATH } from "./src/ws/gateway.js";

const server = http.createServer(app);
setupWebSocketGateway(server, sessionMiddleware);

server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
    console.log(`Socket.IO available at http://localhost:${env.PORT}${SOCKET_PATH}`);
});
