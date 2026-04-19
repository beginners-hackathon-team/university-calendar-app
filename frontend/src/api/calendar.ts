// 1. カレンダー1件分のデータの型（タプル）
export type CalendarItem = [
  string,   // id
  string,   // 授業名
  string,   // 教室
  string,   // 先生
  string[], // 開催する日のリスト
  number    // 時限
];
 
//  オブジェクト形式の型
export type FormattedCourse = {
  id: string;
  name: string;
  room: string;
  teacher: string;
  dates: string[];
  period: number;
};
 
export async function fetchCalendar(): Promise<CalendarItem[]> {
  const res = await fetch('/api/calendar');
 
  if (!res.ok) {
    throw new Error('カレンダーデータの取得に失敗しました');
  }
 
  // JSONとして解析して返す
  return res.json();
}
 
/**
 * バックエンドからのタプル形式を、扱いやすいオブジェクト形式の配列に変換する
 */
export function formatCalendarData(items: CalendarItem[]): FormattedCourse[] {
  return items.map(([id, name, room, teacher, dates, period]) => ({
    id,
    name,
    room,
    teacher,
    dates,
    period,
  }));
}
 
 
 