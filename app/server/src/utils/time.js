export const now = () => Math.floor(Date.now() / 1000);

export function getAcademicYearBounds(timestamp = now(), startMonth = 8) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const startYear = month >= startMonth ? year : year - 1;
  const start = Date.UTC(startYear, startMonth - 1, 1) / 1000;
  const end = Date.UTC(startYear + 1, startMonth - 1, 1) / 1000 - 1;
  return {
    start,
    end,
    label: `${startYear}/${startYear + 1}`
  };
}
