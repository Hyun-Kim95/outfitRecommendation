import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Expo Go on Android no longer loads remote push / token APIs (SDK 53+).
 * Importing expo-notifications there triggers a console error — skip the module.
 */
export function isExpoGoAndroid(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}
