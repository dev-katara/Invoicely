import { pg, closePg } from '../db/runtime.mjs';
await pg();
await closePg();
console.log('Database migrations applied.');
