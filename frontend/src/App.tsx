import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import CalendarPage from "./pages/CalendarPage";
import RegisterPage from "./pages/RegisterPage";
import CoursesPage from "./pages/CoursesPage";


export default function App() {
    return (
        <Routes>
            {/* ヘッダーなしルート */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ヘッダーありルート */}
            <Route element={<Layout />}>
                <Route path="/" element={<CalendarPage />} />
                <Route path="/courses" element={<CoursesPage />} />

            </Route>

            <Route path="*" element={<h1>Not Found Page</h1>} />
        </Routes>
    );

}