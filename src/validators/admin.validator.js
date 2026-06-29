import { z } from "zod";

export const changeUserRoleSchema = z.object({
  role: z.enum(["user", "admin"], {
    error: "role must be either 'user' or 'admin'",
  }),
});
