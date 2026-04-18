import { Routes, Route } from "react-router-dom";
import CalendarPage from "./pages/CalendarPage";
import CoursesPage from "./pages/CoursesPage";
import Layout from "./Layout";

export default function App() {
    
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<CalendarPage />} />
                <Route path="/courses" element={<CoursesPage />} />
            </Route>

            <Route path="*" element={<h2>Not Found Page</h2>} />
        </Routes>
    );

}