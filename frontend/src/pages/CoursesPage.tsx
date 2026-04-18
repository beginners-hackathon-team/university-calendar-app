export default function CoursesPage() {
  const days = [" ", "月", "火", "水", "木", "金"];
  const periods = [1, 2, 3, 4, 5, 6];

  return (
    <table>
      <thead>
        <tr>
            {days.map((d) => <th key={d}>{d}</th>)}
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => (
            <tr key={p}>
            <th>{p}限</th>
            {days.map((d) => <td key={d}>d</td>)}
            {/* ★ ここで days.map して <td key=...></td> を7個 */}
            </tr>
        ))}
        </tbody>

    </table>
  );
}
