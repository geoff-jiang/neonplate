// lib/auth/secure-storage.ts
import * as SecureStore from 'expo-secure-store';

const OPENROUTER_KEY = 'openrouter_api_key';

export async function getOpenRouterKey(): Promise<string | null> {
  return SecureStore.getItemAsync(OPENROUTER_KEY);
}

export async function setOpenRouterKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(OPENROUTER_KEY, key);
}

export async function clearOpenRouterKey(): Promise<void> {
  await SecureStore.deleteItemAsync(OPENROUTER_KEY);
}
