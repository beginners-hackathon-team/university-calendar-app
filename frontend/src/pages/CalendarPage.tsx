import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid'; // 追加
import jaLocale from '@fullcalendar/core/locales/ja';
import '../App.css';

export default function CalendarPage() {
     return (
    <div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]} 
        initialView="timeGridWeek"
        locales={[jaLocale]}
        locale='ja'
        headerToolbar={{                         
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
      />
    </div>
  );
}

