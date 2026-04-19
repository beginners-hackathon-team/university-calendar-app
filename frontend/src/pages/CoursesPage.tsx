import { useState, useEffect } from 'react';
import { periodToTime } from '../periodToTime';
import { createCourses, fetchCourses, deleteCourse as apiDeleteCourse, updateCourse } from '../api/courses';
 
const CURRENT_YEAR = 2026;
 
type Course = {
  id: string;
  name: string;
  teacher: string;
  room: string;
  year: number;
  quarter: number;
  day_of_week: string;
  period: number;
};
 
type CourseInput = {
    name: string;
    teacher: string;
    room: string;
};
 
export default function CoursesPage() {
    const [coursesData, setCoursesData] = useState<{ [key: string]: Course }>({});
    
    // --- 表示条件管理用のState ---
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [selectedQuarter, setSelectedQuarter] = useState(1);
 
    // --- モーダル管理用のState ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tempData, setTempData] = useState<CourseInput>({ name: "", teacher: "", room: "" });
 
    // データ取得 (年度やクォーターが変わるたびに実行)
    useEffect(() => {
        fetchCourses(selectedYear, selectedQuarter).then((data: Course[]) => {
            const map: { [key: string]: Course } = {};
            for (const row of data) {
                const key = `${row.day_of_week}${row.period}`;
                map[key] = row;
            }
            setCoursesData(map);
        });
    }, [selectedYear, selectedQuarter]);
 
    // 編集・追加の開始
    const openEditor = (key: string) => {
        setEditingKey(key);
        const existing = coursesData[key];
        setTempData(existing
            ? { name: existing.name, teacher: existing.teacher, room: existing.room }
            : { name: "", teacher: "", room: "" }
        );
        setIsModalOpen(true);
    };
 
    // 保存実行
    const saveCourse = async () => {
        if (!tempData.name) return alert("講義名を入力してください");
        if (!editingKey) return;

        const day_of_week = editingKey.slice(0, 1);
        const period = Number(editingKey.slice(1));
        const existing = coursesData[editingKey];

        try {
            if (existing) {
                // 編集
                await updateCourse(existing.id, {
                    id: existing.id,
                    name: tempData.name,
                    room: tempData.room,
                    teacher: tempData.teacher,
                });
                const updatedCourse: Course = {
                    id: existing.id,
                    name: tempData.name,
                    room: tempData.room,
                    teacher: tempData.teacher,
                    year: selectedYear,
                    quarter: selectedQuarter,
                    day_of_week,
                    period,
                };
                setCoursesData({ ...coursesData, [editingKey]: updatedCourse });
            } else {
                // 新規追加
                await createCourses({
                    name: tempData.name,
                    room: tempData.room,
                    teacher: tempData.teacher,
                    year: selectedYear,
                    quarter: selectedQuarter,
                    day_of_week,
                    period,
                });
                // 登録後に一覧を再取得して id を含めて反映
                const data: Course[] = await fetchCourses(selectedYear, selectedQuarter);
                const map: { [key: string]: Course } = {};
                for (const row of data) {
                    map[`${row.day_of_week}${row.period}`] = row;
                }
                setCoursesData(map);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("保存に失敗しました");
        }
    };
 
    // 削除実行
    const deleteCourse = async (key: string) => {
        const target = coursesData[key];
        if (!target) return;
        if (!window.confirm("この講義を削除しますか？")) return;

        try {
            await apiDeleteCourse(target.id);
            const newData = { ...coursesData };
            delete newData[key];
            setCoursesData(newData);
        } catch (err) {
            console.error(err);
            alert("削除に失敗しました");
        }
    };
 
    const days = ["月", "火", "水", "木", "金"];
    const periods = periodToTime; // periodToTime.ts から import している想定
 
    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '10px' }}>時間割</h1>
            
            {/* 年度・クォーター選択セレクター */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
                <div style={selectorGroupStyle}>
                    <label style={labelStyle}>年度</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        style={selectStyle}
                    >
                        <option value={2026}>2026年度</option>
                    </select>
                </div>
                <div style={selectorGroupStyle}>
                    <label style={labelStyle}>学期</label>
                    <select
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                        style={selectStyle}
                    >
                        <option value={1}>第1クォーター (Q1)</option>
                        <option value={2}>第2クォーター (Q2)</option>
                        <option value={3}>第3クォーター (Q3)</option>
                        <option value={4}>第4クォーター (Q4)</option>
                    </select>
                </div>
            </div>
 
            {/* 時間割テーブル */}
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th style={{ ...headerCellStyle, width: '80px' }}>時限</th>
                        {days.map(dayName => (
                            <th key={dayName} style={headerCellStyle}>{dayName}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {periods.map(pData => (
                        <tr key={pData.period}>
                            <td style={timeCellStyle}>
                                <strong>{pData.period}</strong><br/>
                                <small style={{ color: '#888', display: 'block', fontSize: '10px', marginTop: '4px' }}>
                                    {pData.start}<br/>~<br/>{pData.end}
                                </small>
                            </td>
                            {days.map(dayName => {
                                const key = `${dayName}${pData.period}`;
                                const course = coursesData[key];
                                return (
                                    <td key={dayName} style={contentCellStyle}>
                                        {course ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c3e50', wordBreak: 'break-all' }}>{course.name}</div>
                                                <div style={{ fontSize: '11px', color: '#7f8c8d' }}>👤 {course.teacher}</div>
                                                <div style={{ fontSize: '11px', color: '#e67e22' }}>📍 {course.room}</div>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
                                                    <button onClick={() => openEditor(key)} style={editBtnStyle}>変更</button>
                                                    <button onClick={() => deleteCourse(key)} style={deleteBtnStyle}>削除</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => openEditor(key)} style={addButtonStyle}>＋ 追加</button>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
 
            {/* 入力用モーダル */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0 }}>講義情報の入力 ({selectedYear}年 Q{selectedQuarter})</h3>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>講義名</label>
                            <input
                                value={tempData.name}
                                onChange={(e) => setTempData({...tempData, name: e.target.value})}
                                style={inputStyle}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>教員名</label>
                            <input
                                value={tempData.teacher}
                                onChange={(e) => setTempData({...tempData, teacher: e.target.value})}
                                style={inputStyle}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>講義室</label>
                            <input
                                value={tempData.room}
                                onChange={(e) => setTempData({...tempData, room: e.target.value})}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                            <button onClick={saveCourse} style={saveButtonStyle}>保存する</button>
                            <button onClick={() => setIsModalOpen(false)} style={cancelButtonStyle}>閉じる</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
 
//あ
 
// --- スタイル定義 ---
const selectorGroupStyle = { display: 'flex', flexDirection: 'column' as const, gap: '4px' };
const selectStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontSize: '20px' };
 
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '320px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
};
const inputGroupStyle = { marginBottom: '15px', textAlign: 'left' as const };
const labelStyle = { fontSize: '13px', fontWeight: 'bold', color: '#555' };
const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' as const };
 
const saveButtonStyle = { flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const cancelButtonStyle = { flex: 1, padding: '12px', backgroundColor: '#eee', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer' };
 
const editBtnStyle = { padding: '3px 8px', fontSize: '10px', backgroundColor: '#fff', border: '1px solid #007bff', color: '#007bff', borderRadius: '4px', cursor: 'pointer' };
const deleteBtnStyle = { padding: '3px 8px', fontSize: '10px', backgroundColor: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '4px', cursor: 'pointer' };
const addButtonStyle = { padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#aaa', backgroundColor: '#f9f9f9', border: '1px dashed #ccc', borderRadius: '4px' };
 
const headerCellStyle = { borderBottom: '2px solid #333', borderRight: '1px solid #eee', padding: '12px 5px', textAlign: 'center' as const };
const timeCellStyle = { borderBottom: '1px solid #eee', borderRight: '2px solid #333', padding: '15px 5px', textAlign: 'center' as const };
const contentCellStyle = { borderBottom: '1px solid #eee', borderRight: '1px solid #eee', padding: '10px 5px', textAlign: 'center' as const, minHeight: '100px', verticalAlign: 'top' as const };
 