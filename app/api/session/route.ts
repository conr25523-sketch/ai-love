import { handle } from "../_backend";
export const GET = (request: Request) => handle("sessionGet", request);
export const POST = (request: Request) => handle("sessionPost", request);
export const PATCH = (request: Request) => handle("sessionPatch", request);
export const DELETE = (request: Request) => handle("sessionDelete", request);
