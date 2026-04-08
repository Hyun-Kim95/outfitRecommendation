import { getSupabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function NoticeFormPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isNew = location.pathname === '/notices/new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin-notice', id],
    enabled: !isNew && !!id,
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('app_notices')
        .select('id, title, body, is_active, starts_at, ends_at, sort_order, is_pinned')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (isNew || !q.data) return;
    setTitle(q.data.title);
    setBody(q.data.body);
    setIsActive(q.data.is_active);
    setStartsAt(toLocalInput(q.data.starts_at));
    setEndsAt(toLocalInput(q.data.ends_at));
    setSortOrder(q.data.sort_order);
    setIsPinned(!!q.data.is_pinned);
  }, [isNew, q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const sb = getSupabase();
      const startsIso = fromLocalInput(startsAt) ?? new Date().toISOString();
      const endsIso = fromLocalInput(endsAt);
      if (isNew) {
        const { error } = await sb.from('app_notices').insert({
          title: title.trim(),
          body: body.trim(),
          is_active: isActive,
          starts_at: startsIso,
          ends_at: endsIso,
          sort_order: sortOrder,
          is_pinned: isPinned,
        });
        if (error) throw error;
      } else {
        const { error } = await sb
          .from('app_notices')
          .update({
            title: title.trim(),
            body: body.trim(),
            is_active: isActive,
            starts_at: startsIso,
            ends_at: endsIso,
            sort_order: sortOrder,
            is_pinned: isPinned,
          })
          .eq('id', id!);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-notices'] });
      setMsg('저장했습니다.');
      if (isNew) navigate('/notices');
      else await qc.invalidateQueries({ queryKey: ['admin-notice', id] });
    },
    onError: (e: Error) => setMsg(e.message || '저장 실패'),
  });

  if (!isNew && !id) return <p className="error">잘못된 경로입니다.</p>;
  if (!isNew && q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (!isNew && (q.isError || !q.data)) return <p className="error">공지를 찾을 수 없습니다.</p>;

  return (
    <div>
      <p className="muted small">
        <Link to="/notices" className="linkish">
          ← 공지 목록
        </Link>
      </p>
      <h1>{isNew ? '새 공지' : '공지 편집'}</h1>
      <form
        className="form"
        style={{ maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          if (!title.trim() || !body.trim()) {
            setMsg('제목과 본문을 입력하세요.');
            return;
          }
          save.mutate();
        }}
      >
        <label>
          제목
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          본문
          <textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          노출 활성
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
          목록 상단 고정 (다른 공지보다 항상 위에 표시)
        </label>
        <label>
          시작 일시 (로컬)
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label>
          종료 일시 (비우면 무기한)
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <label>
          정렬 순서 (낮을수록 먼저)
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </label>
        {msg ? <p className={msg === '저장했습니다.' ? 'muted' : 'error'}>{msg}</p> : null}
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? '저장 중…' : '저장'}
        </button>
      </form>
    </div>
  );
}
