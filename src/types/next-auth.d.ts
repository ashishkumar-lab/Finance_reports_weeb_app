import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      status: "pending" | "approved" | "rejected";
      dbUserId?: number;
    };
  }

  interface JWT {
    isAdmin?: boolean;
    status?: "pending" | "approved" | "rejected";
    dbUserId?: number;
  }
}
