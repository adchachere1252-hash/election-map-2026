import { getElectionWindowStatus } from "./server/electionDates.ts";

const status = getElectionWindowStatus();
console.log('Current UTC:', new Date().toISOString());
console.log('Window active:', status.isActive);
console.log('Current date:', status.currentDate);
console.log('Window end:', status.nextWindowEnd?.toISOString());
