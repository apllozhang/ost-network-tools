import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@shared/router-types";

export const trpc = createTRPCReact<AppRouter>();
