"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTitle, Tag } from "../components/ui";
import { buildTripJsonPrompt } from "../lib/tripJsonPrompt";

interface TripFileInfo {
  id: string;
  hasFile: boolean;
  registered: boolean;
  managed: boolean;
  meta?: { name: string; emoji: string; dateLabel: string; status: string };
}

interface CreateForm {
  id: string;
  name: string;
  destination: string;
  emoji: string;
  dateLabel: string;
  teaser: string;
  status: "coming-soon" | "ready";
}

const EMPTY_CREATE: CreateForm = {
  id: "",
  name: "",
  destination: "",
  emoji: "🧳",
  dateLabel: "",
  teaser: "",
  status: "coming-soon",
};

type Msg = { kind: "ok" | "err"; text: string } | null;

export function AdminClient() {
  const [writesEnabled, setWritesEnabled] = useState(true);
  const [trips, setTrips] = useState<TripFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [json, setJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trips");
      const data = await res.json();
      setWritesEnabled(!!data.writesEnabled);
      setTrips(data.trips ?? []);
    } catch {
      setMsg({ kind: "err", text: "一覧の取得に失敗しました" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedInfo = trips.find((t) => t.id === selected) ?? null;

  const openTrip = async (id: string) => {
    setSelected(id);
    setCreating(false);
    setJson("");
    setParseError(null);
    setMsg(null);
    const res = await fetch(`/api/admin/trips/${id}`);
    if (!res.ok) {
      setJson("");
      setMsg({ kind: "err", text: `${id}.json を読めません（ファイル無し？）` });
      return;
    }
    const data = await res.json();
    setJson(data.json ?? "");
  };

  const onEditJson = (v: string) => {
    setJson(v);
    if (!v.trim()) {
      setParseError(null);
      return;
    }
    try {
      JSON.parse(v);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "不正な JSON");
    }
  };

  const save = async () => {
    if (!selected || parseError) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/trips/${selected}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗");
      setMsg({ kind: "ok", text: `${selected}.json を保存しました` });
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "保存に失敗" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm(`${selected} を削除します（JSON とコード登録の両方）。よろしいですか？`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/trips/${selected}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "削除に失敗");
      setMsg({ kind: "ok", text: `${selected} を削除しました` });
      setSelected(null);
      setJson("");
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "削除に失敗" });
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "作成に失敗");
      setMsg({ kind: "ok", text: `${form.id} を作成しました（${form.status}）` });
      setForm(EMPTY_CREATE);
      setCreating(false);
      await refresh();
      await openTrip(data.meta.id);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "作成に失敗" });
    } finally {
      setBusy(false);
    }
  };

  const downloadPrompt = () => {
    const id = form.id.trim() || "trip";
    const md = buildTripJsonPrompt({
      id,
      name: form.name,
      destination: form.destination,
      dateLabel: form.dateLabel,
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}-json-prompt.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls =
    "w-full rounded-[8px] border border-[var(--border)] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[var(--accent)]";

  return (
    <div className="px-4 pb-10 pt-5">
      <PageTitle
        emoji="🛠"
        title="旅データ管理"
        desc="app/data/trips/*.json を作成・編集・削除（開発者向け）"
      />

      {!writesEnabled && (
        <div className="mt-3 rounded-[10px] border border-[var(--tag-orange)] bg-[var(--tag-orange-bg)] px-3 py-2.5 text-[12px] font-bold leading-[1.6] text-[var(--tag-orange)]">
          🔒 本番環境のため <b>閲覧のみ</b>。作成・編集・削除はローカル（<code>npm run dev</code>）か
          Docker 自前ホストで行ってください。
        </div>
      )}

      {msg && (
        <div
          className={`mt-3 rounded-[10px] px-3 py-2.5 text-[12px] font-bold leading-[1.6] ${
            msg.kind === "ok"
              ? "bg-[var(--tag-green-bg)] text-[var(--tag-green)]"
              : "bg-[var(--tag-orange-bg)] text-[var(--tag-orange)]"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* 旅一覧 */}
      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-[var(--text-sub)]">
          旅一覧（{trips.length}）
        </h3>
        <button
          onClick={() => {
            setCreating(true);
            setSelected(null);
            setJson("");
            setMsg(null);
          }}
          disabled={!writesEnabled}
          className="rounded-[8px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] px-3 py-1.5 text-[12px] font-bold text-white active:opacity-90 disabled:opacity-40"
        >
          ＋ 新規作成
        </button>
      </div>

      <div className="mt-2 overflow-hidden rounded-[12px] border border-[var(--border)] bg-white shadow-[var(--shadow)]">
        {loading && (
          <p className="px-3 py-4 text-center text-[12px] text-[var(--text-sub)]">
            読み込み中…
          </p>
        )}
        {!loading && trips.length === 0 && (
          <p className="px-3 py-4 text-center text-[12px] text-[var(--text-sub)]">
            旅がありません
          </p>
        )}
        {trips.map((t) => {
          const active = t.id === selected;
          return (
            <button
              key={t.id}
              onClick={() => openTrip(t.id)}
              className={`flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-left last:border-0 active:bg-[var(--bg)] ${
                active ? "bg-[var(--accent-light)]" : ""
              }`}
            >
              <span className="text-[18px]">{t.meta?.emoji ?? "🧳"}</span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-bold">
                  {t.meta?.name ?? t.id}
                </span>
                <span className="block font-mono text-[10px] text-[var(--text-sub)]">
                  {t.id}.json
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                {t.meta?.status === "ready" ? (
                  <Tag color="green">ready</Tag>
                ) : t.meta ? (
                  <Tag color="orange">準備中</Tag>
                ) : null}
                {!t.hasFile && <Tag color="orange">file無</Tag>}
                {!t.registered && <Tag color="purple">未登録</Tag>}
                {t.managed && <Tag color="blue">admin</Tag>}
              </span>
            </button>
          );
        })}
      </div>

      {/* 新規作成フォーム */}
      {creating && (
        <div className="mt-4 rounded-[12px] border border-[var(--accent)] bg-white p-4 shadow-[var(--shadow)]">
          <h3 className="text-[14px] font-bold text-[var(--accent-dark)]">
            新規作成（国内＝姫路型）
          </h3>
          <p className="mt-1 text-[11px] leading-[1.6] text-[var(--text-sub)]">
            最小構成の雛形 JSON を生成し、<code>trips.ts</code> /{" "}
            <code>resolveTrip.ts</code> に自動登録します。海外便/フレーズのある旅（ソウル型）は
            専用 resolver が必要なため対象外です。
          </p>

          <button
            onClick={downloadPrompt}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-light)] px-4 py-2.5 text-[13px] font-bold text-[var(--accent-dark)] active:opacity-90"
          >
            📄 JSON作成プロンプトをダウンロード
          </button>
          <p className="mt-1 text-[11px] leading-[1.6] text-[var(--text-sub)]">
            上の id・名称・日付を入れてからDLすると前提に反映されます。落とした .md を
            ChatGPT / Claude 等に貼り、出てきた JSON をこのページのエディタに貼り付けて保存します。
          </p>

          <div className="mt-3 space-y-2.5">
            <label className="block">
              <span className="text-[11px] font-bold text-[var(--text-sub)]">
                id（英小文字・数字・ハイフン）
              </span>
              <input
                className={`${inputCls} font-mono`}
                placeholder="kyoto-2027"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="text-[11px] font-bold text-[var(--text-sub)]">名称</span>
                <input
                  className={inputCls}
                  placeholder="京都 2027"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-[var(--text-sub)]">行き先</span>
                <input
                  className={inputCls}
                  placeholder="京都"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-[var(--text-sub)]">絵文字</span>
                <input
                  className={inputCls}
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-[var(--text-sub)]">日付ラベル</span>
                <input
                  className={inputCls}
                  placeholder="2027.04.10–11"
                  value={form.dateLabel}
                  onChange={(e) => setForm({ ...form, dateLabel: e.target.value })}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold text-[var(--text-sub)]">
                ティザー（準備中表示の一言・任意）
              </span>
              <input
                className={inputCls}
                value={form.teaser}
                onChange={(e) => setForm({ ...form, teaser: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-[var(--text-sub)]">status</span>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CreateForm["status"] })
                }
              >
                <option value="coming-soon">coming-soon（準備中・推奨）</option>
                <option value="ready">ready（即公開）</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={create}
              disabled={busy || !form.id.trim()}
              className="flex-1 rounded-[10px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] px-4 py-2.5 text-[14px] font-bold text-white active:opacity-90 disabled:opacity-40"
            >
              作成する
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-[10px] border border-[var(--border)] px-4 py-2.5 text-[14px] font-bold text-[var(--text-sub)] active:bg-[var(--bg)]"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* JSON エディタ */}
      {selected && !creating && (
        <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[13px] font-bold text-[var(--accent-dark)]">
              {selected}.json
            </h3>
            {selectedInfo && !selectedInfo.managed && selectedInfo.registered && (
              <Tag color="purple">組み込み（削除はコード手動）</Tag>
            )}
          </div>
          <textarea
            value={json}
            onChange={(e) => onEditJson(e.target.value)}
            spellCheck={false}
            disabled={!writesEnabled}
            className="mt-2 h-[50vh] w-full resize-y rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-2.5 font-mono text-[12px] leading-[1.5] outline-none focus:border-[var(--accent)] disabled:opacity-70"
          />
          {parseError && (
            <p className="mt-1.5 text-[11px] font-bold text-[var(--tag-orange)]">
              ⚠️ JSON エラー: {parseError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={!writesEnabled || busy || !!parseError}
              className="flex-1 rounded-[10px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] px-4 py-2.5 text-[14px] font-bold text-white active:opacity-90 disabled:opacity-40"
            >
              保存
            </button>
            <button
              onClick={remove}
              disabled={!writesEnabled || busy}
              className="rounded-[10px] border border-[var(--tag-orange)] px-4 py-2.5 text-[14px] font-bold text-[var(--tag-orange)] active:bg-[var(--tag-orange-bg)] disabled:opacity-40"
            >
              削除
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-[1.6] text-[var(--text-sub)]">
            ※ 反映には dev サーバの再コンパイル（本番は再デプロイ）が必要です。
          </p>
        </div>
      )}
    </div>
  );
}
