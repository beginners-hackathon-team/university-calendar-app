import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useEffect, useState } from "react";
import type { EventInput } from "@fullcalendar/core";
import type { CalendarResponse } from "../types/api";
import { periodToTime } from "../constants";

export default function CalendarPage() {
    const [events, setEvents] = useState<EventInput[]>([]) // FullCalendarの型

    useEffect(() => {
        fetch('/api/calendar?start=2026-04-01&end=2026-04-30')
        .then(res => res.json())
        .then((data: CalendarResponse) => {
            const courseEvents = data.courses.map(c => ({
            title: c.name,
            start: `${c.date}T${periodToTime[c.period]!.start}`,
            end:   `${c.date}T${periodToTime[c.period]!.end}`,
            color: '#3788d8',  // 青（時間割）
            }))

            const personalEvents = data.personal_events.map(p => ({
            title: p.title,
            start: `${p.date}T${p.start_time}`,
            end:   `${p.date}T${p.end_time}`,
            color: '#2ecc71',  // 緑（個人イベント）
            }))
            setEvents([...courseEvents, ...personalEvents])
        })
    }, [])

    return (
        <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"    // デフォルト週表示
        headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        locale={"ja"}
        events={events}
        />
    )
}