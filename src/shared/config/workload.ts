// ponytail: HARDCODE sementara. Total mandays per orang seharusnya dijumlah dari trx_mandays
// (allocated_mandays) lintas proyek. BE belum punya endpoint itu, dan /projects/:id/mandays
// hanya per proyek. Ganti dengan fetch begitu BE nambah endpoint beban kerja.
export const MANDAYS_LIMIT = 20;

const BY_USERNAME: Record<string, number> = {
  "pentester.budi": 22,
  "pentester.citra": 8,
  "pentester.dimas": 15,
  "writer.eka": 12,
};

export const mandaysOf = (username: string) => BY_USERNAME[username] ?? 0;
export const isOverloaded = (username: string) => mandaysOf(username) >= MANDAYS_LIMIT;
