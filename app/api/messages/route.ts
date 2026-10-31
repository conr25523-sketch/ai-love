import { handle } from "../_backend";
export const GET = (request: Request) => handle("messagesGet", request);
export const POST = (request: Request) => handle("messagesPost", request);
export const DELETE = (request: Request) => handle("messagesDelete", request);
