export async function fetchCourses() {
    const res = await fetch('/api/courses');
    if (!res.ok) throw new Error('取得失敗');
    return res.json();
    
}

export async function createCourses(data:{
    name: string;
    room: string;
    teacher: string;
    year: number;
    quarter: number;
    day_of_week: string;
    period: number;
}) {
    const res = await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('登録失敗');
    return res.json();
}

export async function updateCourse(
    courseId: string,
    data:{
        id: string;
        name: string;
        room: string;
        teacher: string;
        year: number;
        quarter: number;
        day_of_week: string;
        period: number;
}) {
    const url = `/api/course/${courseId}`;

    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('更新失敗');
    return res.json();
}

export async function deleteCourse(courseId: string) {
    const res = await fetch(`/api/course/${courseId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('削除失敗');
}