import { createServerSideCaller } from '@davis7dotsh/river-core';
import { myRiverRouter } from './router';

// todo: add some background calls to the demo...
export const myServerCaller = createServerSideCaller(myRiverRouter);
