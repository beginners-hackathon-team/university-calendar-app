import { Link, Outlet, useLocation } from "react-router-dom";
 
// ヘッダー付きレイアウト
export default function Layout() {
 
    const location = useLocation()
 
    const navButtonStyle = {
    display: "inline-block",
    padding: "10px 18px",
    backgroundColor: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "999px",
    fontWeight: "bold",
};
 
 
    return (
        <>
            <header>
                <nav>
                    {location.pathname === "/courses" && <Link to="/">カレンダーへ</Link>}
                    
                    {location.pathname === "/" && <Link to="/courses">時間割へ</Link>}
                </nav>
            </header>
            <main>
                <Outlet />
            </main>
        </>
    )
}