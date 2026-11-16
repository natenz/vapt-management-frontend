// Kebijakan batas beban mandays per orang (md); merah bila LEBIH dari batas. Ini aturan, bukan data:
// angka beban sebenarnya dari BE (getResourceLoad). Ubah lewat VITE_MANDAYS_LIMIT, bawaan 20.
const configured = Number(import.meta.env.VITE_MANDAYS_LIMIT);
export const MANDAYS_LIMIT = Number.isFinite(configured) && configured > 0 ? configured : 20;
export const isOverLimit = (md: number) => md > MANDAYS_LIMIT;
