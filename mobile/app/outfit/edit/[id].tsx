import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
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
import { joinCategories, splitCategoryField } from '@/lib/outfitFormUtils';
import { optionLabel } from '@/lib/optionLabels';
import type { ThemeColors } from '@/lib/theme-colors';
import { getSupabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, backgroundColor: c.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: c.background },
    preview: {
      width: '100%',
      height: 220,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: c.muted,
    },
    imgRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    imgBtn: {
      flex: 1,
      padding: 14,
      backgroundColor: c.infoBg,
      borderRadius: 10,
      alignItems: 'center',
    },
    imgBtnText: { color: c.infoText, fontWeight: '600', fontSize: 14 },
    h: { fontWeight: '700', marginTop: 12, marginBottom: 8, color: c.foreground },
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
      minHeight: 80,
      padding: 12,
      textAlignVertical: 'top',
      backgroundColor: c.inputBg,
      color: c.foreground,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      backgroundColor: c.inputBg,
      color: c.foreground,
      marginBottom: 8,
    },
    save: {
      marginTop: 24,
      backgroundColor: c.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveTxt: { color: c.primaryForeground, fontWeight: '700', fontSize: 16 },
    muted: { color: c.mutedForeground },
  });
}

export default function EditOutfitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [wornOn, setWornOn] = useState('');
  const [weatherLogId, setWeatherLogId] = useState<string | null>(null);
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
  const [existingPhotoUri, setExistingPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !id) {
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: o, error } = await sb.from('outfit_logs').select('*').eq('id', id).maybeSingle();
    if (error || !o || o.user_id !== user.id) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setWornOn(o.worn_on ?? '');
    setWeatherLogId(o.weather_log_id);
    setTop(splitCategoryField(o.top_category));
    setBottom(splitCategoryField(o.bottom_category));
    setOuter(splitCategoryField(o.outer_category));
    setShoes(splitCategoryField(o.shoes_category));
    setThickness(o.thickness_level);
    setMemo(o.memo ?? '');
    const acc = o.accessory_tags;
    setAccTags(Array.isArray(acc) ? acc.filter((x): x is string => typeof x === 'string') : []);

    const { data: ctx } = await sb.from('context_logs').select('*').eq('outfit_log_id', id).maybeSingle();
    if (ctx) {
      setActivity(ctx.activity_level);
      setIo(ctx.indoor_outdoor_ratio);
      const st = ctx.situation_tags;
      setTags(Array.isArray(st) ? st.filter((x): x is string => typeof x === 'string') : []);
    } else {
      setActivity(null);
      setIo(null);
      setTags([]);
    }

    if (o.photo_path) {
      const { data: signed } = await sb.storage.from('outfit-photos').createSignedUrl(o.photo_path, 3600);
      setExistingPhotoUri(signed?.signedUrl ?? null);
    } else setExistingPhotoUri(null);

    setAsset(null);
    setMissing(false);
    setLoading(false);
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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
    if (!id || !user) return;
    if (top.length === 0 && bottom.length === 0) {
      Alert.alert(isEn ? 'Required' : '필수', isEn ? 'Select at least one top or bottom item.' : '상의 또는 하의를 하나 이상 선택해 주세요.');
      return;
    }
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(wornOn.trim());
    if (!dateOk) {
      Alert.alert(isEn ? 'Format' : '형식', isEn ? 'Worn date must be in YYYY-MM-DD format.' : '착용일은 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    setBusy(true);
    try {
      const { error: oErr } = await sb
        .from('outfit_logs')
        .update({
          worn_on: wornOn.trim(),
          weather_log_id: weatherLogId,
          top_category: joinCategories(top),
          bottom_category: joinCategories(bottom),
          outer_category: joinCategories(outer),
          shoes_category: joinCategories(shoes),
          accessory_tags: accTags.length > 0 ? accTags : null,
          thickness_level: thickness,
          memo: memo.trim() || null,
        })
        .eq('id', id)
        .eq('user_id', user.id);
      if (oErr) throw oErr;

      const { data: ctxRow } = await sb.from('context_logs').select('id').eq('outfit_log_id', id).maybeSingle();
      if (ctxRow?.id) {
        const { error: cErr } = await sb
          .from('context_logs')
          .update({
            activity_level: activity,
            indoor_outdoor_ratio: io,
            situation_tags: tags,
          })
          .eq('id', ctxRow.id);
        if (cErr) throw cErr;
      } else {
        const { error: insErr } = await sb.from('context_logs').insert({
          outfit_log_id: id,
          user_id: user.id,
          transport_type: null,
          activity_level: activity,
          indoor_outdoor_ratio: io,
          situation_tags: tags,
        });
        if (insErr) throw insErr;
      }

      if (asset?.uri) {
        const path = `${user.id}/${id}/photo.jpg`;
        const resFetch = await fetch(asset.uri);
        const buf = await resFetch.arrayBuffer();
        const { error: uErr } = await sb.storage.from('outfit-photos').upload(path, buf, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        if (!uErr) {
          await sb.from('outfit_logs').update({ photo_path: path }).eq('id', id);
        }
      }

      Alert.alert(isEn ? 'Saved' : '저장됨', isEn ? 'Outfit updated.' : '착장이 수정되었습니다.', [
        { text: 'OK', onPress: () => router.replace(`/outfit/${id}`) },
      ]);
    } catch (e) {
      Alert.alert(isEn ? 'Error' : '오류', e instanceof Error ? e.message : isEn ? 'Save failed' : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.activityIndicator} />
      </View>
    );
  }

  if (missing || !id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{isEn ? 'Outfit not found.' : '착장을 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  const previewUri = asset?.uri ?? existingPhotoUri;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {previewUri ? (
        <Image
          source={{ uri: previewUri }}
          style={styles.preview}
          resizeMode="cover"
          accessibilityLabel={isEn ? 'Outfit photo' : '착장 사진'}
        />
      ) : null}
      <View style={styles.imgRow}>
        <Pressable style={styles.imgBtn} onPress={pickImage}>
          <Text style={styles.imgBtnText}>
            {asset || existingPhotoUri
              ? isEn
                ? 'Replace from gallery'
                : '갤러리에서 바꾸기'
              : isEn
                ? 'Gallery'
                : '갤러리'}
          </Text>
        </Pressable>
        <Pressable style={styles.imgBtn} onPress={takePhoto}>
          <Text style={styles.imgBtnText}>
            {asset || existingPhotoUri
              ? isEn
                ? 'Retake with camera'
                : '카메라로 다시 찍기'
              : isEn
                ? 'Camera'
                : '카메라'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.h}>{isEn ? 'Worn date' : '착용일'}</Text>
      <Text style={styles.sub}>YYYY-MM-DD</Text>
      <TextInput
        style={styles.dateInput}
        value={wornOn}
        onChangeText={setWornOn}
        placeholder="2026-04-08"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
      />

      <Text style={styles.h}>{isEn ? 'Top' : '상의'}</Text>
      <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
      <ChipMultiRow
        styles={styles}
        options={[...TOP_OPTIONS]}
        values={top}
        onToggle={(o) => toggleMulti(top, setTop, o)}
        locale={locale}
      />
      <Text style={styles.h}>{isEn ? 'Bottom' : '하의'}</Text>
      <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
      <ChipMultiRow
        styles={styles}
        options={[...BOTTOM_OPTIONS]}
        values={bottom}
        onToggle={(o) => toggleMulti(bottom, setBottom, o)}
        locale={locale}
      />
      <Text style={styles.h}>{isEn ? 'Outer' : '아우터'}</Text>
      <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
      <ChipMultiRow
        styles={styles}
        options={[...OUTER_OPTIONS]}
        values={outer}
        onToggle={(o) => toggleMulti(outer, setOuter, o)}
        locale={locale}
      />
      <Text style={styles.h}>{isEn ? 'Shoes' : '신발'}</Text>
      <Text style={styles.sub}>{isEn ? 'Multiple selections allowed.' : '여러 개 선택 가능합니다.'}</Text>
      <ChipMultiRow
        styles={styles}
        options={[...SHOES_OPTIONS]}
        values={shoes}
        onToggle={(o) => toggleMulti(shoes, setShoes, o)}
        locale={locale}
      />

      <Text style={styles.h}>{isEn ? 'Overall thickness' : '전체 두께감'}</Text>
      <ChipRow styles={styles} options={[...THICKNESS_OPTIONS]} value={thickness} onChange={setThickness} locale={locale} />

      <Text style={styles.h}>{isEn ? 'Accessories (multi)' : '액세서리·소품 (복수)'}</Text>
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

      <Text style={styles.h}>{isEn ? 'Context tags (multi)' : '상황 태그 (복수)'}</Text>
      <View style={styles.wrap}>
        {SITUATION_TAGS.map((t) => (
          <Pressable key={t} style={[styles.chip, tags.includes(t) && styles.chipOn]} onPress={() => toggleTag(t)}>
            <Text style={[styles.chipTxt, tags.includes(t) && styles.chipTxtOn]}>{optionLabel(locale, t)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.h}>{isEn ? 'Activity level' : '활동량'}</Text>
      <ChipRow styles={styles} options={[...ACTIVITY_OPTIONS]} value={activity} onChange={setActivity} locale={locale} />
      <Text style={styles.h}>{isEn ? 'Indoor/Outdoor' : '실내/야외'}</Text>
      <ChipRow styles={styles} options={[...INDOOR_OUTDOOR_OPTIONS]} value={io} onChange={setIo} locale={locale} />

      <Text style={styles.h}>메모</Text>
      <TextInput
        style={styles.memo}
        multiline
        value={memo}
        onChangeText={setMemo}
        placeholder="선택"
        placeholderTextColor={colors.mutedForeground}
      />

      <Pressable style={[styles.save, busy && { opacity: 0.7 }]} onPress={save} disabled={busy}>
        <Text style={styles.saveTxt}>{busy ? (isEn ? 'Saving…' : '저장 중…') : isEn ? 'Save changes' : '수정 저장'}</Text>
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
