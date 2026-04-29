import { z } from 'zod';

/** İleride toolbar filtreleri FormInput ile bağlanacak şema (province’daki getSchema benzeri). */
export const cryptoFilterSchema = z.object({
  exchange: z.enum(['all', 'okx', 'btcturk']),
});

export type CryptoFilterValues = z.infer<typeof cryptoFilterSchema>;
