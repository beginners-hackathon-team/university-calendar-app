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