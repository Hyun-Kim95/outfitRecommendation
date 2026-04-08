import { ProfileEditorForm } from '@/components/ProfileEditorForm';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function EditProfileScreen() {
  const [syncNonce, setSyncNonce] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setSyncNonce((n) => n + 1);
    }, [])
  );

  return (
    <ProfileEditorForm
      mode="edit"
      syncNonce={syncNonce}
      onSaved={() => {
        router.back();
      }}
    />
  );
}
