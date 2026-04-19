import { Link, Outlet } from "react-router-dom";

// ヘッダー付きレイアウト
export default function Layout() {
    return (
        <>
            <header>
                <nav>
                    <Link to="/">カレンダー</Link>
                    <Link to="/courses">時間割</Link>
                </nav>
            </header>
            <main>
                <Outlet />
            </main>
        </>
    )
}