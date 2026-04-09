import { useLocale } from '@/context/LocaleContext';
import { localeDateTimeString } from '@/lib/dateLocale';
import { ticketStatusLabel } from '@/lib/displayLabels';
import { getSupabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export function InquiryDetailPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      setMsg(isEn ? 'Saved.' : '저장했습니다.');
      await qc.invalidateQueries({ queryKey: ['admin-inquiries'] });
      await qc.invalidateQueries({ queryKey: ['admin-inquiry', id] });
    },
    onError: (e: Error) => setMsg(e.message || (isEn ? 'Save failed' : '저장 실패')),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const sb = getSupabase();
      const { error } = await sb.from('support_tickets').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-inquiries'] });
      await qc.invalidateQueries({ queryKey: ['admin-inquiry', id] });
      navigate('/inquiries');
    },
    onError: (e: Error) => setMsg(e.message || (isEn ? 'Delete failed' : '삭제 실패')),
  });

  if (!id) return <p className="error">{isEn ? 'Invalid route.' : '잘못된 경로입니다.'}</p>;
  if (q.isLoading) return <p className="muted">{isEn ? 'Loading…' : '불러오는 중…'}</p>;
  if (q.isError || !q.data) return <p className="error">{isEn ? 'Inquiry not found.' : '문의를 찾을 수 없습니다.'}</p>;

  const t = q.data as typeof q.data & {
    profiles?: { nickname: string | null } | null;
  };
  const nick = t.profiles?.nickname?.trim() || (isEn ? 'No name' : '이름 없음');

  return (
    <div>
      <p className="muted small">
        <Link to="/inquiries" className="linkish">
          {isEn ? '← Inquiry list' : '← 문의 목록'}
        </Link>
      </p>
      <h1>{isEn ? 'Inquiry detail' : '문의 상세'}</h1>
      <div className="detail-actions" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="secondary danger"
          disabled={remove.isPending}
          onClick={() => {
            if (!window.confirm(isEn ? 'Delete this inquiry? This cannot be undone.' : '이 문의를 삭제할까요? 삭제 후 복구할 수 없습니다.')) return;
            setMsg(null);
            remove.mutate();
          }}
        >
          {remove.isPending ? (isEn ? 'Deleting…' : '삭제 중…') : isEn ? 'Delete inquiry' : '문의 삭제'}
        </button>
      </div>
      <div className="table-wrap" style={{ marginBottom: '1rem' }}>
        <table className="data-table">
          <tbody>
            <tr>
              <th>{isEn ? 'Subject' : '제목'}</th>
              <td>
                <strong>{t.subject}</strong>
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Status' : '상태'}</th>
              <td>
                <span className="badge">{ticketStatusLabel(t.status, locale)}</span>
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'User' : '회원'}</th>
              <td>
                <Link to={`/users/${t.user_id}`} className="linkish">
                  {nick}
                </Link>
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Created' : '접수'}</th>
              <td>{localeDateTimeString(locale, t.created_at)}</td>
            </tr>
            <tr>
              <th>{isEn ? 'Updated' : '수정'}</th>
              <td>{localeDateTimeString(locale, t.updated_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2 style={{ marginTop: '1rem', fontSize: '1.05rem' }}>{isEn ? 'Body' : '본문'}</h2>
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
      <form
        className="form"
        style={{ width: '100%', marginTop: '1rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          save.mutate();
        }}
      >
        <label>
          {isEn ? 'Admin reply' : '관리자 답변'}
          <textarea
            value={adminReply}
            onChange={(e) => setAdminReply(e.target.value)}
            placeholder={
              isEn
                ? 'Reply visible to user (shown in My Inquiry in app)'
                : '사용자에게 보여 줄 답변(앱의 내 문의에서 확인 가능)'
            }
          />
        </label>
        {msg ? (
          <p
            className={
              msg.startsWith('저장') || msg.startsWith('Saved') ? 'muted' : 'error'
            }
          >
            {msg}
          </p>
        ) : null}
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? (isEn ? 'Saving…' : '저장 중…') : isEn ? 'Save' : '저장'}
        </button>
      </form>
    </div>
  );
}
