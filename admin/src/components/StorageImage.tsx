import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

type Props = {
  bucket: string;
  path: string | null | undefined;
  alt?: string;
  className?: string;
};

/** Storage private 버킷: 서명 URL로 미리보기 */
export function StorageImage({ bucket, path, alt = '첨부 이미지', className }: Props) {
  const q = useQuery({
    queryKey: ['storage-signed-url', bucket, path],
    enabled: Boolean(path?.trim()),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.storage.from(bucket).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (!path?.trim()) return null;
  if (q.isLoading) {
    return <span className="muted small">이미지 로드 중…</span>;
  }
  if (q.isError || !q.data) {
    return <span className="muted small">이미지를 불러올 수 없습니다.</span>;
  }

  return (
    <img
      src={q.data}
      alt={alt}
      className={className ?? 'storage-image'}
    />
  );
}
