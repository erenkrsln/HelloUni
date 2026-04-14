import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth/auth";

const http = httpRouter();

// Registriert alle Better Auth Routen auf dem Convex HTTP-Endpunkt
authComponent.registerRoutes(http, createAuth);

export default http;
