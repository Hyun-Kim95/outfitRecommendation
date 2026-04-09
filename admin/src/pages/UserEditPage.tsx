import { useLocale } from '@/context/LocaleContext';
import { getSupabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type Sens = 'low' | 'normal' | 'high' | '';

export function UserEditPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nickname, setNickname] = useState('');
  const [defaultRegion, setDefaultRegion] = useState('');
  const [cold, setCold] = useState<Sens>('');
  const [heat, setHeat] = useState<Sens>('');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [accountDisabled, setAccountDisabled] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin-user-edit', id],
    enabled: !!id,
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('profiles')
        .select(
          'id, nickname, default_region, cold_sensitivity, heat_sensitivity, onboarding_completed, account_disabled'
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!q.data) return;
    setNickname(q.data.nickname ?? '');
    setDefaultRegion(q.data.default_region ?? '');
    setCold((q.data.cold_sensitivity as Sens) ?? '');
    setHeat((q.data.heat_sensitivity as Sens) ?? '');
    setOnboardingCompleted(!!q.data.onboarding_completed);
    setAccountDisabled(!!q.data.account_disabled);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const sb = getSupabase();
      const { error } = await sb
        .from('profiles')
        .update({
          nickname: nickname.trim() || null,
          default_region: defaultRegion.trim() || null,
          cold_sensitivity: cold || null,
          heat_sensitivity: heat || null,
          onboarding_completed: onboardingCompleted,
          account_disabled: accountDisabled,
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] });
      await qc.invalidateQueries({ queryKey: ['admin-user', id] });
      await qc.invalidateQueries({ queryKey: ['admin-user-edit', id] });
      navigate(`/users/${id}`);
    },
    onError: (e: Error) => {
      setFeedback(e.message || (isEn ? 'Failed to save.' : '저장에 실패했습니다.'));
    },
  });

  if (!id) return <p className="error">{isEn ? 'Invalid route.' : '잘못된 경로입니다.'}</p>;
  if (q.isLoading) return <p className="muted">{isEn ? 'Loading…' : '불러오는 중…'}</p>;
  if (q.isError || !q.data) return <p className="error">{isEn ? 'User not found.' : '사용자를 찾을 수 없습니다.'}</p>;

  return (
    <div>
      <p className="muted small">
        <Link to={`/users/${id}`} className="linkish">
          {isEn ? '← User detail' : '← 사용자 상세'}
        </Link>
      </p>
      <h1>{isEn ? 'Edit user' : '사용자 편집'}</h1>
      <p className="muted mono small">{id}</p>
      <form
        className="form"
        style={{ maxWidth: 480 }}
        onSubmit={(e) => {
          e.preventDefault();
          setFeedback(null);
          save.mutate();
        }}
      >
        <label>
          {isEn ? 'Nickname' : '닉네임'}
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="off" />
        </label>
        <label>
          {isEn ? 'Default region' : '기본 지역'}
          <input value={defaultRegion} onChange={(e) => setDefaultRegion(e.target.value)} autoComplete="off" />
        </label>
        <label>
          {isEn ? 'Cold sensitivity' : '추위 민감도'}
          <select value={cold} onChange={(e) => setCold(e.target.value as Sens)}>
            <option value="">{isEn ? '(none)' : '(없음)'}</option>
            <option value="low">{isEn ? 'Low' : '낮음'}</option>
            <option value="normal">{isEn ? 'Normal' : '보통'}</option>
            <option value="high">{isEn ? 'High' : '높음'}</option>
          </select>
        </label>
        <label>
          {isEn ? 'Heat sensitivity' : '더위 민감도'}
          <select value={heat} onChange={(e) => setHeat(e.target.value as Sens)}>
            <option value="">{isEn ? '(none)' : '(없음)'}</option>
            <option value="low">{isEn ? 'Low' : '낮음'}</option>
            <option value="normal">{isEn ? 'Normal' : '보통'}</option>
            <option value="high">{isEn ? 'High' : '높음'}</option>
          </select>
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={onboardingCompleted}
            onChange={(e) => setOnboardingCompleted(e.target.checked)}
          />
          {isEn ? 'Onboarding done' : '온보딩 완료'}
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={accountDisabled}
            onChange={(e) => setAccountDisabled(e.target.checked)}
          />
          {isEn ? 'Disable account (restrict access)' : '계정 비활성 (이용 제한)'}
        </label>
        {feedback ? <p className="error">{feedback}</p> : null}
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? (isEn ? 'Saving…' : '저장 중…') : isEn ? 'Save' : '저장'}
        </button>
      </form>
    </div>
  );
}
