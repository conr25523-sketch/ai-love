import { handle } from "../../_backend";
export const GET = (request: Request) => handle("adminMessages", request);
