// API通信の共通化（fetchラッパー）

const BASE_URL = "/api";

async function request<T>(
    method: string,
    path: string,
    body?: unknown
): Promise<T> {
    // ヘッダー準備
    const headers: Record<string, string> = { // キーも値もstringオブジェクト
        "Content-Type": "application/json",
    };

    // ブラウザの永続保存領域からトークン取得(ログイン後にセットされる予定)
    const token = localStorage.getItem("access_token");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`; // JWT認証の決まり文句
    }

    // リクエストを送信
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined, // 三項演算子(値を返す)、bodyがあれば文字列化、なければundefined
    });

    // エラーレスポンス
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ??  `HTTP ${res.status}`); // 呼び出し側で try/catch か .catch()で受けるように
    }

    // DELETE のように body を返さないとき、res.json()は呼べない。その対策
    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}

// ex). api.get<User>("/users/1") を使うと request<User>("GET", "/users/1") が呼ばれる
export const api = {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    delete: <T = void>(path: string) => request<T>("DELETE", path),
};