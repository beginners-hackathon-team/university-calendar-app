// オブジェクト形式の型（バックエンドの /api/calendar/{year-month} と対応）
export type FormattedCourse = {
  id: string;
  name: string;
  room: string;
  teacher: string;
  dates: string[];  // 例: ["2026-04-15", "2026-04-22"]
  period: number;
};

export async function fetchCalendar(year: number, month: number): Promise<FormattedCourse[]> {
  const res = await fetch(`/api/calendar/${year}-${month}`);

  if (!res.ok) {
    throw new Error('カレンダーデータの取得に失敗しました');
  }

  return res.json();
}
 
 
 