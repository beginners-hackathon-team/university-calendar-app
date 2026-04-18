import { useState } from 'react';

type Course = {
    name: string;
    teacher: string;
    room: string;
};

export default function CoursesPage() {
    const [coursesData, setCoursesData] = useState<{ [key: string]: Course }>({
        
    });
    const [baseDate, setBaseDate] = useState(new Date());

    // --- モーダル管理用のState ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tempData, setTempData] = useState<Course>({ name: "", teacher: "", room: "" });

    // 編集・追加の開始
    const openEditor = (key: string) => {
        setEditingKey(key);
        // すでにデータがあればそれを、なければ空を入れる
        setTempData(coursesData[key] || { name: "", teacher: "", room: "" });
        setIsModalOpen(true);
    };

    // 保存実行
    const saveCourse = () => {
        if (!tempData.name) return alert("講義名を入力してください");
        if (editingKey) {
            setCoursesData({ ...coursesData, [editingKey]: tempData });
            setIsModalOpen(false);
        }
    };

    // 削除実行
    const deleteCourse = (key: string) => {
        if (window.confirm("この講義を削除しますか？")) {
            const newData = { ...coursesData };
            delete newData[key];
            setCoursesData(newData);
        }
    };

    const days = ["月", "火", "水", "木", "金"];
    const periods = [
        { period: 1, start: "08:45", end: "10:15" },
        { period: 2, start: "10:30", end: "12:00" },
        { period: 3, start: "13:00", end: "14:30" },
        { period: 4, start: "14:45", end: "16:15" },
        { period: 5, start: "16:30", end: "18:00" },
        { period: 6, start: "18:15", end: "19:45" },
    ];

    const getWeekDays = (date: Date) => {
        const current = new Date(date);
        const dayOfWeek = current.getDay(); 
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(current.setDate(current.getDate() + diffToMonday));
        return days.map((dayName, index) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + index);
            return { dayName, dateStr: `${d.getMonth() + 1}/${d.getDate()}` };
        });
    };

    const weekDays = getWeekDays(baseDate);
    const moveWeek = (offset: number) => {
        const newDate = new Date(baseDate);
        newDate.setDate(baseDate.getDate() + (offset * 7));
        setBaseDate(newDate);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>金沢大学の時間割</h1>

            {/* ナビゲーション */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                <button onClick={() => moveWeek(-1)} style={navButtonStyle}>先週</button>
                <button onClick={() => setBaseDate(new Date())} style={todayButtonStyle}>今日</button>
                <button onClick={() => moveWeek(1)} style={navButtonStyle}>来週</button>
            </div>

            {/* 時間割テーブル */}
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th style={{ ...headerCellStyle, width: '80px' }}>時限</th>
                        {weekDays.map(item => (
                            <th key={item.dayName} style={headerCellStyle}>
                                {item.dayName}<br/>
                                <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>({item.dateStr})</span>
                            </th>
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
                            {weekDays.map(item => {
                                const key = `${item.dayName}${pData.period}`;
                                const course = coursesData[key];
                                return (
                                    <td key={item.dayName} style={contentCellStyle}>
                                        {course ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {/* 講義詳細表示（ラベル付き） */}
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c3e50', wordBreak: 'break-all' }}>{course.name}</div>
                                                <div style={{ fontSize: '11px', color: '#7f8c8d' }}>👤 {course.teacher}</div>
                                                <div style={{ fontSize: '11px', color: '#e67e22' }}>📍 {course.room}</div>
                                                
                                                {/* ボタンエリア */}
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

            {/* --- 入力用モーダル --- */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0 }}>講義情報の入力</h3>
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

// --- スタイル定義（CSS-in-JS） ---
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

const navButtonStyle = { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '20px' };
const todayButtonStyle = { ...navButtonStyle, backgroundColor: '#fff', color: '#333', border: '1px solid #ccc' };

const editBtnStyle = { padding: '3px 8px', fontSize: '10px', backgroundColor: '#fff', border: '1px solid #007bff', color: '#007bff', borderRadius: '4px', cursor: 'pointer' };
const deleteBtnStyle = { padding: '3px 8px', fontSize: '10px', backgroundColor: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '4px', cursor: 'pointer' };
const addButtonStyle = { padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#aaa', backgroundColor: '#f9f9f9', border: '1px dashed #ccc', borderRadius: '4px' };

const headerCellStyle = { borderBottom: '2px solid #333', borderRight: '1px solid #eee', padding: '12px 5px', textAlign: 'center' as const };
const timeCellStyle = { borderBottom: '1px solid #eee', borderRight: '2px solid #333', padding: '15px 5px', textAlign: 'center' as const };
const contentCellStyle = { borderBottom: '1px solid #eee', borderRight: '1px solid #eee', padding: '10px 5px', textAlign: 'center' as const, minHeight: '100px', verticalAlign: 'top' as const };