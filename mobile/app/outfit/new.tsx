import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { dummyOutfitPreset } from '@/lib/demoUi';
import { dateInSeoul } from '@/lib/dates';
import {
  ACCESSORY_OPTIONS,
  ACTIVITY_OPTIONS,
  BOTTOM_OPTIONS,
  INDOOR_OUTDOOR_OPTIONS,
  OUTER_OPTIONS,
  SHOES_OPTIONS,
  SITUATION_TAGS,
  THICKNESS_OPTIONS,
  TOP_OPTIONS,
} from '@/lib/options';
import type { ThemeColors } from '@/lib/theme-colors';
import {
  buildSimilaritySnapshotV1,
  feelsLikeBucket,
  snapshotToJson,
} from '@/lib/domain/similaritySnapshot';
import { joinCategories } from '@/lib/outfitFormUtils';
import { optionLabel } from '@/lib/optionLabels';
import { getPrimaryCoords, getPrimaryRegionSlug } from '@/lib/profileCompat';
import type { Json } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { fetchOpenMeteoSnapshot } from '@/lib/weather';
import { useTodayRecommendStore } from '@/stores/todayRecommendStore';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type OutfitTab = 'top' | 'bottom' | 'outer' | 'shoes' | 'more';

const TAB_LABELS: Record<OutfitTab, string> = {
  top: '상의',
  bottom: '하의',
  outer: '아우터',
  shoes: '신발',
  more: '상황·메모',
};

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, backgroundColor: c.background },
    tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: c.chipBg,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabOn: { backgroundColor: c.chipOnBg, borderColor: c.primary },
    tabTxt: { fontSize: 13, color: c.chipText, fontWeight: '600' },
    tabTxtOn: { color: c.chipTextOn },
    presetBtn: {
      marginBottom: 14,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.infoBg,
      alignItems: 'center',
    },
    presetBtnTxt: { color: c.infoText, fontWeight: '700', fontSize: 14 },
    summary: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    summaryTitle: { fontSize: 12, color: c.mutedForeground, marginBottom: 6 },
    summaryBody: { fontSize: 14, color: c.foreground, lineHeight: 20 },
    preview: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: c.muted,
    },
    imgRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    imgBtn: {
      flex: 1,
      padding: 12,
      backgroundColor: c.muted,
      borderRadius: 10,
      alignItems: 'center',
    },
    imgBtnText: { color: c.foreground, fontWeight: '600', fontSize: 13 },
    h: { fontWeight: '700', marginBottom: 8, color: c.foreground },
    sub: { fontSize: 12, color: c.mutedForeground, marginBottom: 8 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: c.chipBg,
    },
    chipOn: { backgroundColor: c.chipOnBg },
    chipTxt: { color: c.chipText, fontSize: 13 },
    chipTxtOn: { color: c.chipTextOn, fontWeight: '600' },
    memo: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      minHeight: 72,
      padding: 12,
      textAlignVertical: 'top',
      backgroundColor: c.inputBg,
      color: c.foreground,
    },
    save: {
      marginTop: 20,
      backgroundColor: c.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveTxt: { color: c.primaryForeground, fontWeight: '700', fontSize: 16 },
  });
}

export default function NewOutfitScreen() {
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<OutfitTab>('top');
  const [top, setTop] = useState<string[]>([]);
  const [bottom, setBottom] = useState<string[]>([]);
  const [outer, setOuter] = useState<string[]>([]);
  const [shoes, setShoes] = useState<string[]>([]);
  const [activity, setActivity] = useState<string | null>(null);
  const [io, setIo] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [accTags, setAccTags] = useState<string[]>([]);
  const [thickness, setThickness] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromHome = useTodayRecommendStore.getState().situationTags;
    if (fromHome.length === 0) return;
    setTags((prev) => (prev.length > 0 ? prev : [...fromHome]));
  }, []);

  const summaryLine = useMemo(() => {
    const parts = [
      top.length ? `${isEn ? 'Top' : '상의'} ${top.map((x) => optionLabel(locale, x)).join(', ')}` : null,
      bottom.length
        ? `${isEn ? 'Bottom' : '하의'} ${bottom.map((x) => optionLabel(locale, x)).join(', ')}`
        : null,
      outer.length
        ? `${isEn ? 'Outer' : '아우터'} ${outer.map((x) => optionLabel(locale, x)).join(', ')}`
        : null,
      shoes.length
        ? `${isEn ? 'Shoes' : '신발'} ${shoes.map((x) => optionLabel(locale, x)).join(', ')}`
        : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : isEn ? 'No selection yet' : '아직 선택 없음';
  }, [top, bottom, outer, shoes, isEn, locale]);

  const applyPreset = useCallback(() => {
    setTop([...dummyOutfitPreset.top]);
    setBottom([...dummyOutfitPreset.bottom]);
    setOuter([...dummyOutfitPreset.outer]);
    setShoes([...dummyOutfitPreset.shoes]);
    setThickness(dummyOutfitPreset.thickness);
    setTags([...dummyOutfitPreset.tags]);
    setAccTags([...dummyOutfitPreset.accTags]);
    setActivity(dummyOutfitPreset.activity);
    setIo(dummyOutfitPreset.io);
    setTab('more');
  }, []);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isEn ? 'Permission' : '권한', isEn ? 'Please allow photo library access.' : '사진 라이브러리 접근을 허용해 주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setAsset(res.assets[0]);
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isEn ? 'Permission' : '권한', isEn ? 'Please allow camera access.' : '카메라를 사용하려면 권한을 허용해 주세요.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setAsset(res.assets[0]);
  }, []);

  const toggleTag = (t: string) => {
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };

  const toggleAcc = (t: string) => {
    setAccTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };

  function toggleMulti(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function save() {
    if (top.length === 0 && bottom.length === 0) {
      Alert.alert(
        isEn ? 'Required' : '필수',
        isEn ? 'Select at least one top or bottom item.' : '상의 또는 하의를 하나 이상 선택해 주세요.'
      );
      return;
    }
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    setBusy(true);
    try {
      const today = dateInSeoul();
      const primarySlug = getPrimaryRegionSlug(profile);
      const { data: wl } = await sb
        .from('weather_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('snapshot_date', today)
        .eq('region_slug', primarySlug)
        .maybeSingle();

      const { lat, lng, label } = getPrimaryCoords(profile);
      let similarity_snapshot: Json | null = null;
      let feels_like_bucket: number | null = null;
      try {
        const weatherSnap = await fetchOpenMeteoSnapshot(lat, lng, label);
        const snap = buildSimilaritySnapshotV1({
          weather: weatherSnap,
          regionLabel: label,
          situationTags: tags,
          activityLevel: activity,
          indoorOutdoor: io,
          weatherLogId: wl?.id ?? null,
        });
        similarity_snapshot = snapshotToJson(snap);
        feels_like_bucket = feelsLikeBucket(weatherSnap.temperature_feels_like);
      } catch {
        /* 날씨 실패 시에도 착장만 저장 */
      }

      const { data: outfit, error: oErr } = await sb
        .from('outfit_logs')
        .insert({
          user_id: user.id,
          weather_log_id: wl?.id ?? null,
          worn_on: today,
          top_category: joinCategories(top),
          bottom_category: joinCategories(bottom),
          outer_category: joinCategories(outer),
          shoes_category: joinCategories(shoes),
          accessory_tags: accTags.length > 0 ? accTags : null,
          thickness_level: thickness,
          memo: memo.trim() || null,
          similarity_snapshot,
          feels_like_bucket,
        })
        .select('id')
        .single();

      if (oErr) throw oErr;
      if (!outfit) throw new Error('insert failed');

      const { error: cErr } = await sb.from('context_logs').insert({
        outfit_log_id: outfit.id,
        user_id: user.id,
        transport_type: null,
        activity_level: activity,
        indoor_outdoor_ratio: io,
        situation_tags: tags,
      });
      if (cErr) throw cErr;

      if (asset?.uri) {
        const path = `${user.id}/${outfit.id}/photo.jpg`;
        const resFetch = await fetch(asset.uri);
        const buf = await resFetch.arrayBuffer();
        const { error: uErr } = await sb.storage.from('outfit-photos').upload(path, buf, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        if (!uErr) {
          await sb.from('outfit_logs').update({ photo_path: path }).eq('id', outfit.id);
        }
      }

      Alert.alert(isEn ? 'Saved' : '저장됨', isEn ? 'Outfit logged.' : '착장을 기록했습니다.', [
        { text: 'OK', onPress: () => router.replace(`/outfit/${outfit.id}`) },
      ]);
    } catch (e) {
      Alert.alert(isEn ? 'Error' : '오류', e instanceof Error ? e.message : isEn ? 'Save failed' : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Pressable style={styles.presetBtn} onPress={applyPreset}>
        <Text style={styles.presetBtnTxt}>{isEn ? 'Quick fill (sample)' : '빠른 채우기 (예시 선택)'}</Text>
      </Pressable>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>{isEn ? 'Selection summary' : '선택 요약'}</Text>
        <Text style={styles.summaryBody}>{summaryLine}</Text>
      </View>

      <View style={styles.tabRow}>
        {(Object.keys(TAB_LABELS) as OutfitTab[]).map((k) => (
          <Pressable key={k} style={[styles.tab, tab === k && styles.tabOn]} onPress={() => setTab(k)}>
            <Text style={[styles.tabTxt, tab === k && styles.tabTxtOn]}>
              {isEn ? optionLabel('en', TAB_LABELS[k]) : TAB_LABELS[k]}
            </Text>
          </Pressable>
        ))}
      </View>

      {asset?.uri ? (
        <Image
          source={{ uri: asset.uri }}
          style={styles.preview}
          resizeMode="cover"
          accessibilityLabel={isEn ? 'Selected outfit photo' : '선택한 착장 사진'}
        />
      ) : null}
      <View style={styles.imgRow}>
        <Pressable style={styles.imgBtn} onPress={pickImage}>
          <Text style={styles.imgBtnText}>{asset ? (isEn ? 'Replace from gallery' : '갤러리에서 바꾸기') : isEn ? 'Gallery' : '갤러리'}</Text>
        </Pressable>
        <Pressable style={styles.imgBtn} onPress={takePhoto}>
          <Text style={styles.imgBtnText}>{asset ? (isEn ? 'Retake with camera' : '카메라로 다시') : isEn ? 'Camera' : '카메라'}</Text>
        </Pressable>
      </View>

      {tab === 'top' ? (
        <>
          <Text style={styles.h}>{isEn ? 'Top' : '상의'}</Text>
          <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
          <ChipMultiRow
            styles={styles}
            options={[...TOP_OPTIONS]}
            values={top}
            onToggle={(o) => toggleMulti(top, setTop, o)}
            locale={locale}
          />
        </>
      ) : null}

      {tab === 'bottom' ? (
        <>
          <Text style={styles.h}>{isEn ? 'Bottom' : '하의'}</Text>
          <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
          <ChipMultiRow
            styles={styles}
            options={[...BOTTOM_OPTIONS]}
            values={bottom}
            onToggle={(o) => toggleMulti(bottom, setBottom, o)}
            locale={locale}
          />
        </>
      ) : null}

      {tab === 'outer' ? (
        <>
          <Text style={styles.h}>{isEn ? 'Outer' : '아우터'}</Text>
          <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
          <ChipMultiRow
            styles={styles}
            options={[...OUTER_OPTIONS]}
            values={outer}
            onToggle={(o) => toggleMulti(outer, setOuter, o)}
            locale={locale}
          />
        </>
      ) : null}

      {tab === 'shoes' ? (
        <>
          <Text style={styles.h}>{isEn ? 'Shoes' : '신발'}</Text>
          <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
          <ChipMultiRow
            styles={styles}
            options={[...SHOES_OPTIONS]}
            values={shoes}
            onToggle={(o) => toggleMulti(shoes, setShoes, o)}
            locale={locale}
          />
        </>
      ) : null}

      {tab === 'more' ? (
        <>
          <Text style={styles.h}>{isEn ? 'Overall thickness' : '전체 두께감'}</Text>
          <ChipRow styles={styles} options={[...THICKNESS_OPTIONS]} value={thickness} onChange={setThickness} locale={locale} />

          <Text style={[styles.h, { marginTop: 12 }]}>{isEn ? 'Accessories' : '액세서리·소품'}</Text>
          <View style={styles.wrap}>
            {ACCESSORY_OPTIONS.map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, accTags.includes(t) && styles.chipOn]}
                onPress={() => toggleAcc(t)}
              >
                <Text style={[styles.chipTxt, accTags.includes(t) && styles.chipTxtOn]}>{optionLabel(locale, t)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.h, { marginTop: 12 }]}>{isEn ? 'Context tags' : '상황 태그'}</Text>
          <View style={styles.wrap}>
            {SITUATION_TAGS.map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, tags.includes(t) && styles.chipOn]}
                onPress={() => toggleTag(t)}
              >
                <Text style={[styles.chipTxt, tags.includes(t) && styles.chipTxtOn]}>{optionLabel(locale, t)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.h, { marginTop: 12 }]}>{isEn ? 'Activity level' : '활동량'}</Text>
          <ChipRow styles={styles} options={[...ACTIVITY_OPTIONS]} value={activity} onChange={setActivity} locale={locale} />
          <Text style={[styles.h, { marginTop: 12 }]}>{isEn ? 'Indoor/Outdoor' : '실내/야외'}</Text>
          <ChipRow styles={styles} options={[...INDOOR_OUTDOOR_OPTIONS]} value={io} onChange={setIo} locale={locale} />

          <Text style={[styles.h, { marginTop: 12 }]}>{isEn ? 'Memo (optional)' : '메모 (선택)'}</Text>
          <TextInput
            style={styles.memo}
            multiline
            value={memo}
            onChangeText={setMemo}
            placeholder="짧게 적어도 됩니다"
            placeholderTextColor={colors.mutedForeground}
          />
        </>
      ) : null}

      <Pressable style={[styles.save, busy && { opacity: 0.7 }]} onPress={save} disabled={busy}>
        <Text style={styles.saveTxt}>{busy ? (isEn ? 'Saving…' : '저장 중…') : isEn ? 'Save' : '저장'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ChipMultiRow({
  styles,
  options,
  values,
  onToggle,
  locale,
}: {
  styles: ReturnType<typeof createStyles>;
  options: string[];
  values: string[];
  onToggle: (o: string) => void;
  locale: 'ko' | 'en';
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Pressable key={o} style={[styles.chip, values.includes(o) && styles.chipOn]} onPress={() => onToggle(o)}>
          <Text style={[styles.chipTxt, values.includes(o) && styles.chipTxtOn]}>{optionLabel(locale, o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ChipRow({
  styles,
  options,
  value,
  onChange,
  locale,
}: {
  styles: ReturnType<typeof createStyles>;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  locale: 'ko' | 'en';
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Pressable
          key={o}
          style={[styles.chip, value === o && styles.chipOn]}
          onPress={() => onChange(value === o ? null : o)}
        >
          <Text style={[styles.chipTxt, value === o && styles.chipTxtOn]}>{optionLabel(locale, o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
