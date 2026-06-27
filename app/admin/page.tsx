import { AdminClient } from "./AdminClient";

// 旅データ JSON（app/data/trips/*.json）の CRUD 管理ページ。
// 認証は proxy.ts が担保。書き込みはローカル/Docker のみ（本番は閲覧専用）。
export default function AdminPage() {
  return <AdminClient />;
}
