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

}