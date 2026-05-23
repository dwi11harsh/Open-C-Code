/**
 * Common utility constants and date helpers
 */

let sessionStartDate: string | null = null;

/** get local date in ISO format (YYYY-MM-DD) */
export const getLocalISODate = (): string => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const date = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${date}`;
};

/** Memoized - captures date once at session start for prompt-cache stability */
export const getSessionStartDate = (): string => {
	if (!sessionStartDate) sessionStartDate = getLocalISODate();

	return sessionStartDate;
};

/** Returns "Month YYYY" in the user's local timezone. */
export const getLocalMonthYear = (): string => {
	return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
};
