<<<<<<< HEAD
import { Routes, Route } from "react-router-dom";
import CalendarPage from "./pages/CalendarPage";
import CoursesPage from "./pages/CoursesPage";

export default function App() {
    
    return (
        <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/courses" element={<CoursesPage />} />

            <Route path="*" element={<h2>Not Found Page</h2>} />
        </Routes>
    );

=======
import { useState } from "react";

export default function App() {
    const [count, setCount] = useState(0);

    return(
      <div >
        <h2>カウンター</h2>
        <div>
            {count}
        </div>
        <div>
            <button onClick={() => setCount(count + 1)}>
                 +1
            </button>
        </div>
      </div>
    );
>>>>>>> dbeaa3f (click complete)
}