import { DefaultSession } from "next-auth";

// Extend the default session to include the user ID
declare module "next-auth" {
  interface DefaultSession {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id?: string | null; // Adding the 'id' property
    };
  }
}
