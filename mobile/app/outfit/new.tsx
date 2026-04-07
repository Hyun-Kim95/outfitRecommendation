import { useAuth } from '@/contexts/AuthContext';
import { dateInSeoul } from '@/lib/dates';
import {
  ACTIVITY_OPTIONS,
  BOTTOM_OPTIONS,
  INDOOR_OUTDOOR_OPTIONS,
  OUTER_OPTIONS,
  SHOES_OPTIONS,
  SITUATION_TAGS,
  TOP_OPTIONS,
  TRANSPORT_OPTIONS,
} from '@/lib/options';
import { getSupabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function NewOutfitScreen() {
  const { user } = useAuth();
  const [top, setTop] = useState<string | null>(null);
  const [bottom, setBottom] = useState<string | null>(null);
  const [outer, setOuter] = useState<string | null>(null);
  const [shoes, setShoes] = useState<string | null>(null);
  const [transport, setTransport] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [io, setIo] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한', '사진 라이브러리 접근을 허용해 주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setAsset(res.assets[0]);
  }, []);

  const toggleTag = (t: string) => {
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };

  async function save() {
    if (!top && !bottom) {
      Alert.alert('필수', '상의 또는 하의 중 하나는 선택해 주세요.');
      return;
    }
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    setBusy(true);
    try {
      const today = dateInSeoul();
      const { data: wl } = await sb
        .from('weather_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('snapshot_date', today)
        .maybeSingle();

      const { data: outfit, error: oErr } = await sb
        .from('outfit_logs')
        .insert({
          user_id: user.id,
          weather_log_id: wl?.id ?? null,
          worn_on: today,
          top_category: top,
          bottom_category: bottom,
          outer_category: outer,
          shoes_category: shoes,
          memo: memo.trim() || null,
        })
        .select('id')
        .single();

      if (oErr) throw oErr;
      if (!outfit) throw new Error('insert failed');

      const { error: cErr } = await sb.from('context_logs').insert({
        outfit_log_id: outfit.id,
        user_id: user.id,
        transport_type: transport,
        activity_level: activity,
        indoor_outdoor_ratio: io,
        situation_tags: tags,
      });
      if (cErr) throw cErr;

      if (asset?.uri) {
        const path = `${user.id}/${outfit.id}/photo.jpg`;
        const res = await fetch(asset.uri);
        const buf = await res.arrayBuffer();
        const { error: uErr } = await sb.storage.from('outfit-photos').upload(path, buf, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        if (!uErr) {
          await sb.from('outfit_logs').update({ photo_path: path }).eq('id', outfit.id);
        }
      }

      Alert.alert('저장됨', '착장을 기록했습니다.', [
        { text: 'OK', onPress: () => router.replace(`/outfit/${outfit.id}`) },
      ]);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Pressable style={styles.imgBtn} onPress={pickImage}>
        <Text style={styles.imgBtnText}>{asset ? '사진 변경' : '사진 선택 (선택)'}</Text>
      </Pressable>

      <Text style={styles.h}>상의</Text>
      <ChipRow options={[...TOP_OPTIONS]} value={top} onChange={setTop} />
      <Text style={styles.h}>하의</Text>
      <ChipRow options={[...BOTTOM_OPTIONS]} value={bottom} onChange={setBottom} />
      <Text style={styles.h}>아우터</Text>
      <ChipRow options={[...OUTER_OPTIONS]} value={outer} onChange={setOuter} />
      <Text style={styles.h}>신발</Text>
      <ChipRow options={[...SHOES_OPTIONS]} value={shoes} onChange={setShoes} />

      <Text style={styles.h}>상황 태그</Text>
      <View style={styles.wrap}>
        {SITUATION_TAGS.map((t) => (
          <Pressable key={t} style={[styles.chip, tags.includes(t) && styles.chipOn]} onPress={() => toggleTag(t)}>
            <Text style={[styles.chipTxt, tags.includes(t) && styles.chipTxtOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.h}>이동</Text>
      <ChipRow options={[...TRANSPORT_OPTIONS]} value={transport} onChange={setTransport} />
      <Text style={styles.h}>활동량</Text>
      <ChipRow options={[...ACTIVITY_OPTIONS]} value={activity} onChange={setActivity} />
      <Text style={styles.h}>실내/야외</Text>
      <ChipRow options={[...INDOOR_OUTDOOR_OPTIONS]} value={io} onChange={setIo} />

      <Text style={styles.h}>메모</Text>
      <TextInput style={styles.memo} multiline value={memo} onChangeText={setMemo} placeholder="선택" />

      <Pressable style={[styles.save, busy && { opacity: 0.7 }]} onPress={save} disabled={busy}>
        <Text style={styles.saveTxt}>{busy ? '저장 중…' : '저장'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Pressable
          key={o}
          style={[styles.chip, value === o && styles.chipOn]}
          onPress={() => onChange(value === o ? null : o)}
        >
          <Text style={[styles.chipTxt, value === o && styles.chipTxtOn]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  imgBtn: {
    padding: 14,
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  imgBtnText: { color: '#0369a1', fontWeight: '600' },
  h: { fontWeight: '700', marginTop: 12, marginBottom: 8, color: '#222' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e4e4e7',
  },
  chipOn: { backgroundColor: '#99f6e4' },
  chipTxt: { color: '#444', fontSize: 13 },
  chipTxtOn: { color: '#0f766e', fontWeight: '600' },
  memo: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
  },
  save: {
    marginTop: 24,
    backgroundColor: '#0d9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
