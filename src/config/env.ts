import "dotenv/config";

import { z } from "zod";

const DotEnvSchema = z.object({
  STYLUS_SITE_USERNAME: z.string().min(1),
  STYLUS_SITE_PASSWORD: z.string().min(1),
});

export const env = DotEnvSchema.parse(process.env);
