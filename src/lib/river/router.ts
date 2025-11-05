import { createRiverRouter } from '@davis7dotsh/river-core';
import { unreliableAgentStream } from './streams';

export const myRiverRouter = createRiverRouter({
	unreliableAgent: unreliableAgentStream
});

export type MyRiverRouter = typeof myRiverRouter;
