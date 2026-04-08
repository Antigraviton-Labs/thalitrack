export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startCronJobs } = await import('./lib/services/cron');
        await startCronJobs();
    }
}
