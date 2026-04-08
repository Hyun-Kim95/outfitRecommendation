import { ProfileEditorForm } from '@/components/ProfileEditorForm';
import { router } from 'expo-router';

export default function OnboardingProfileScreen() {
  return (
    <ProfileEditorForm
      mode="onboarding"
      onSaved={() => {
        router.replace('/(tabs)/home');
      }}
    />
  );
}
