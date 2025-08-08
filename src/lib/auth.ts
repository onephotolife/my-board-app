// eslint-disable-next-line @typescript-eslint/no-require-imports
const NextAuth = require("next-auth").default;
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);