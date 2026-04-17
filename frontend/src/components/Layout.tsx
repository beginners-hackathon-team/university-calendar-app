import { Link, Outlet } from "react-router-dom"; // react-router-domはSPA用, <Outlet />の位置に子ルートが差し込まれる

// ヘッダー付きレイアウト
export default function Layout() {
    return (
        <>
            <header>
                <nav>
                    <Link to="/">カレンダー</Link>
                    <Link to="/courses">時間割</Link>
                    {/* TODO: ログアウトボタン */}
                </nav>
            </header>
            <main> 
                <Outlet />
            </main>
        </>
    );
}