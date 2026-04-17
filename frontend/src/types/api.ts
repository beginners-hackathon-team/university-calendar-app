export type CalendarCourse = {
  course_id: number;
  name: string;
  room: string;
  teacher: string;
  date: string;  // ISO 8601 "2026-04-15"
  period: number;
};

export type CalendarPersonalEvent = {
  id: number;
  title: string;
  date: string;
  start_time: string;  // "14:30"
  end_time: string;
};

export type CalendarUniversityEvent = {
  id: number;
  name: string;
  date: string;
  type: 'holiday' | 'exam' | 'transfer' | 'interval' | 'other';
};

export type CalendarResponse = {
  courses: CalendarCourse[];
  personal_events: CalendarPersonalEvent[];
  university_events: CalendarUniversityEvent[];
};
