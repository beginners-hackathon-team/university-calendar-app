import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
    const location = useLocation();

    const navItems = [
        { to: "/", label: "カレンダー" },
        { to: "/courses", label: "時間割" },
    ];

    const headerStyle: React.CSSProperties = {
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
    };

    const innerStyle: React.CSSProperties = {
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    };

    const logoStyle: React.CSSProperties = {
        color: "#111827",
        fontSize: "18px",
        fontWeight: "bold",
        textDecoration: "none",
    };

    const getLinkStyle = (active: boolean): React.CSSProperties => ({
        padding: "6px 14px",
        marginLeft: "8px",
        color: active ? "#2563eb" : "#6b7280",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: active ? "bold" : "normal",
        borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
    });

    return (
        <>
            <header style={headerStyle}>
                <div style={innerStyle}>
                    <Link to="/" style={logoStyle}>
                        アカンサスカレンダー（金沢大学特化型カレンダー）
                    </Link>
                    <nav>
                        {navItems.map(item => (
                            <Link
                                key={item.to}
                                to={item.to}
                                style={getLinkStyle(location.pathname === item.to)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>
            <main>
                <Outlet />
            </main>
        </>
    );
}
