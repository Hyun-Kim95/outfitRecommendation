import { ticketStatusKo } from '@/lib/displayLabels';
import { getSupabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [adminReply, setAdminReply] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin-inquiry', id],
    enabled: !!id,
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('support_tickets')
        .select('id, user_id, subject, body, status, admin_reply, created_at, updated_at, profiles(nickname)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!q.data) return;
    setAdminReply(q.data.admin_reply ?? '');
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const sb = getSupabase();
      const { error } = await sb
        .from('support_tickets')
        .update({
          admin_reply: adminReply.trim() || null,
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: async () => {
      setMsg('저장했습니다. 상태는 답변 여부에 따라 자동으로 바뀝니다.');
      await qc.invalidateQueries({ queryKey: ['admin-inquiries'] });
      await qc.invalidateQueries({ queryKey: ['admin-inquiry', id] });
    },
    onError: (e: Error) => setMsg(e.message || '저장 실패'),
  });

  if (!id) return <p className="error">잘못된 경로입니다.</p>;
  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError || !q.data) return <p className="error">문의를 찾을 수 없습니다.</p>;

  const t = q.data as typeof q.data & {
    profiles?: { nickname: string | null } | null;
  };
  const nick = t.profiles?.nickname?.trim() || '이름 없음';

  return (
    <div>
      <p className="muted small">
        <Link to="/inquiries" className="linkish">
          ← 문의 목록
        </Link>
      </p>
      <h1>문의 상세</h1>
      <div className="table-wrap" style={{ marginBottom: '1rem' }}>
        <table className="data-table">
          <tbody>
            <tr>
              <th>제목</th>
              <td>
                <strong>{t.subject}</strong>
              </td>
            </tr>
            <tr>
              <th>상태</th>
              <td>
                <span className="badge">{ticketStatusKo(t.status)}</span>
              </td>
            </tr>
            <tr>
              <th>회원</th>
              <td>
                <Link to={`/users/${t.user_id}`} className="linkish">
                  {nick}
                </Link>
              </td>
            </tr>
            <tr>
              <th>접수</th>
              <td>{new Date(t.created_at).toLocaleString('ko-KR')}</td>
            </tr>
            <tr>
              <th>수정</th>
              <td>{new Date(t.updated_at).toLocaleString('ko-KR')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2 style={{ marginTop: '1rem', fontSize: '1.05rem' }}>본문</h2>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: 'var(--card)',
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
      >
        {t.body}
      </pre>
      <p className="muted small" style={{ marginTop: '1rem' }}>
        답변을 저장하면 상태가 자동으로 「답변 완료」가 되고, 답변을 비우면 「답변 대기」로 돌아갑니다.
      </p>
      <form
        className="form"
        style={{ maxWidth: 520, marginTop: '1rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          save.mutate();
        }}
      >
        <label>
          관리자 답변
          <textarea
            value={adminReply}
            onChange={(e) => setAdminReply(e.target.value)}
            placeholder="사용자에게 보여 줄 답변(앱의 내 문의에서 확인 가능)"
          />
        </label>
        {msg ? <p className={msg.startsWith('저장') ? 'muted' : 'error'}>{msg}</p> : null}
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? '저장 중…' : '저장'}
        </button>
      </form>
    </div>
  );
}
