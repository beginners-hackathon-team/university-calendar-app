import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core/index.js';
import { useState, useEffect } from 'react';
import { fetchCalendar } from '../api/calendar';
import { periodToTime } from '../periodToTime';
 
 
// ★ 大学行事のJSONをインポート
import universityEventsData from '../Universityevent.json';
 
type EventType = {
  title: string;
  start: Date | string;
  color?: string;
  id?: string;
  className?: string;
  allDay?: boolean;
  editable?: boolean;
  display?: string;
  textColor?: string;
  end?: string;
}
 
export default function CalendarPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  // FullCalendar が現在表示している月（初期値は今日の月）
  const [viewYearMonth, setViewYearMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
 
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  };
 
  // ★ 大学行事のタイプ別色分け定義
  const getUnivEventStyle = (type: string) => {
    switch (type) {
      case 'exam':
        return { color: '#fee2e2', textColor: '#b91c1c' }; // 試験：赤系
      case 'transfer':
        return { color: '#fef3c7', textColor: '#b45309' }; // 振替：オレンジ系
      case 'interval':
        return { color: '#f0fdf4', textColor: '#15803d' }; // インターバル：緑系
      default:
        return { color: '#e0f2fe', textColor: '#0369a1' }; // その他：青系
    }
  };
 
  useEffect(() => {
    const fetchAllExternalEvents = async () => {
      // 1. 祝日データの取得
      const holidayRes = await fetch('https://holidays-jp.github.io/api/v1/date.json');
      const holidayData = await holidayRes.json();
     
      const holidayEvents: EventType[] = Object.keys(holidayData).map(date => ({
        title: holidayData[date],
        start: date,
        allDay: true,
        editable: false,
        display: 'block',
        color: '#ffcccc',
        textColor: 'red',
        className: 'is-holiday',
        id: `holiday-${date}`
      }));
 
      // 2. 大学行事データの整形
      const currentYear = new Date().getFullYear();
      const univEvents: EventType[] = universityEventsData.map((item, index) => {
        const month = parseInt(item.date.split('-')[0]);
        const year = month <= 3 ? currentYear + 1 : currentYear;
       
        const displayTitle = item.type === 'transfer' && item.other
          ? `${item.name}(${item.other}曜授業)`
          : item.name;
 
        const style = getUnivEventStyle(item.type);
 
        return {
          title: displayTitle,
          start: `${year}-${item.date}`,
          allDay: true,
          editable: false,
          display: 'block',
          color: style.color,
          textColor: style.textColor,
          className: 'is-univ-event',
          id: `univ-${index}`
        };
      });
 
      setEvents(prev => {
        const onlyUserEvents = prev.filter(e =>
          !e.id?.startsWith('holiday-') && !e.id?.startsWith('univ-')
        );
        return [...onlyUserEvents, ...holidayEvents, ...univEvents];
      });
    };
 
    fetchAllExternalEvents();
  }, []);
 
  useEffect(() => {
    fetchCalendar(viewYearMonth.year, viewYearMonth.month)
      .then((courses) => {
        const courseEvents = courses.flatMap((course) => {
          const time = periodToTime.find((p) => p.period === course.period);
          if (!time) return [];

          return course.dates.map((date) => ({
            id: `course-${course.id}-${date}`,
            title: course.name,
            start: `${date}T${time.start}:00`,
            end: `${date}T${time.end}:00`,
            className: 'is-course',
            color: '#bfdbfe',
            textColor: '#1e3a8a',
            editable: false,
          }));
        });

        setEvents((prev) => {
          const withoutCourses = prev.filter(
            (event) => !event.id?.startsWith('course-')
          );
          return [...withoutCourses, ...courseEvents];
        });
      })
      .catch((err) => {
        console.error('calendar取得失敗', err);
      });
  }, [viewYearMonth]);
 
 
  // 予定を追加する処理
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const title = prompt('予定のタイトルを入力してください');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
 
    if (title) {
      const newEvent = {
        id: String(Date.now()),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        color: '#4f46e5'
      };
      setEvents(prev => [...prev, newEvent]);
    }
  };
 
  // 予定をクリックして削除する処理
  const handleEventClick = (clickInfo: EventClickArg) => {
    const classList = clickInfo.event.extendedProps.className;
    // 祝日と大学行事は削除不可
    if (classList === 'is-holiday' || classList === 'is-univ-event') {
      return;
    }
 
    if (confirm(`予定「${clickInfo.event.title}」を削除しますか？`)) {
      setEvents(prev => prev.filter(event => event.id !== clickInfo.event.id));
    }
  };
 
  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
     
      <style>{`
        .fc {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
 
        .fc-day-sat .fc-col-header-cell-cushion,
        .fc-day-sat .fc-daygrid-day-number { color: blue !important; }
       
        .fc-day-sun .fc-col-header-cell-cushion,
        .fc-day-sun .fc-daygrid-day-number,
        .is-holiday-column .fc-col-header-cell-cushion,
        .is-holiday-column .fc-daygrid-day-number { color: red !important; }
 
        .is-holiday, .is-univ-event { border: none !important; font-weight: bold; font-size: 0.85em; }
        .fc-day-today { background-color: #fefce8 !important; }
        .fc-event { cursor: pointer; }
      `}</style>
 
      <h1 style={{ textAlign: 'center', marginBottom: '20px', color: '#111827', fontSize: '28px', fontWeight: 'bold' }}>
        カレンダー
      </h1>
 
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locales={[jaLocale]}
        locale='ja'
        selectable={true}
        selectMirror={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        datesSet={(arg) => {
          // 表示中の月の中心日付から年月を特定
          const mid = new Date((arg.view.activeStart.getTime() + arg.view.activeEnd.getTime()) / 2);
          const next = { year: mid.getFullYear(), month: mid.getMonth() + 1 };
          setViewYearMonth(prev =>
            prev.year === next.year && prev.month === next.month ? prev : next
          );
        }}
       
        // 元のコードにあった詳細設定を維持
        scrollTime="07:00:00"
        slotDuration="00:30:00"
        snapDuration="00:05:00"
        slotLabelInterval="01:00:00"
       
        // 祝日(is-holiday)の時だけ日付を赤くする（大学行事は含めない）
        dayHeaderClassNames={(arg) => {
          const dateStr = getLocalDateString(arg.date);
          const isHoliday = events.some(e => e.start === dateStr && e.className === 'is-holiday');
          return isHoliday ? ['is-holiday-column'] : [];
        }}
        dayCellClassNames={(arg) => {
          const dateStr = getLocalDateString(arg.date);
          const isHoliday = events.some(e => e.start === dateStr && e.className === 'is-holiday');
          return isHoliday ? ['is-holiday-column'] : [];
        }}
 
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
       
        events={(() => {
          const holidayDates = new Set(
            events
              .filter(e => e.className === 'is-holiday')
              .map(e => (typeof e.start === 'string' ? e.start.split('T')[0] : ''))
          );
          return events.filter(e => {
            if (e.className !== 'is-course') return true;
            const dateOnly = typeof e.start === 'string' ? e.start.split('T')[0] : '';
            return !holidayDates.has(dateOnly);
          });
        })()}
      />
    </div>
  );
}
 