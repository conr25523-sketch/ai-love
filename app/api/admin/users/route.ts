import { handle } from "../../_backend";
export const GET = (request: Request) => handle("adminUsers", request);
export const DELETE = (request: Request) => handle("adminUsersDelete", request);
