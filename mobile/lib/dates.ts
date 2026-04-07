/** 한국 날짜 문자열 YYYY-MM-DD */
export function dateInSeoul(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
}
