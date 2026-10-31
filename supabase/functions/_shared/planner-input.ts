import { z } from 'npm:zod@3.25.76';

const stack = z.object({ itemId: z.string().min(1).max(40), count: z.number().int().min(1).max(9999) }).strict();
export const plannerInputSchema = z.object({
  health: z.number().min(0).max(100),
  hunger: z.number().min(0).max(100),
  inventory: z.array(stack).max(100),
  storage: z.array(stack).max(100),
  gear: z.array(z.string().max(40)).max(100),
  learnedSkills: z.array(z.string().max(40)).max(30),
  nearbyResources: z.array(z.object({ type: z.string().max(40), distanceM: z.number().min(0).max(10000), count: z.number().int().min(1).max(1000) }).strict()).max(50),
  gathered: z.record(z.number().int().min(0).max(1000000)),
  baseLevel: z.number().int().min(0).max(3),
  inBase: z.boolean(),
  isNight: z.boolean(),
  goal: z.string().trim().min(1, '생존 목표를 입력해 주세요.').max(500),
}).strict();
export type PlannerInput = z.infer<typeof plannerInputSchema>;