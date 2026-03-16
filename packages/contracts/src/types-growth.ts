import { z } from 'zod';

export const TrendReportSchema = z.object({
  id: z.string().uuid(),
  source: z.string().min(1),
  title: z.string().min(1),
  score: z.number().optional(),
  reportDate: z.string().date().optional(),
});

export type TrendReport = z.infer<typeof TrendReportSchema>;
