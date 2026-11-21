import type { Cosmetics } from '@ootmm/generator';
import type { StateCreator } from 'zustand';
import type { Store } from './';

import * as API from '../api';

export interface CosmeticsSlice {
  cosmetics: Cosmetics;
  playerCosmetics: (Cosmetics | null)[];
  setCosmetic: (key: keyof Cosmetics, value: any) => void;
  setPlayerCosmetic: (player: number, key: keyof Cosmetics, value: any) => void;
  resetPlayerCosmetics: (player: number) => void;
}

export const createCosmeticsSlice: StateCreator<Store, [], [], CosmeticsSlice> = (set, get) => ({
  cosmetics: API.initialCosmetics(),
  playerCosmetics: API.initialPlayerCosmetics(),
  setCosmetic: (key, value) => {
    set({ cosmetics: { ...get().cosmetics, [key]: value } });
  },
  setPlayerCosmetic: (player, key, value) => {
    const playerCosmetics = [...get().playerCosmetics];
    const base = playerCosmetics[player] ?? API.withoutCosmeticFiles(get().cosmetics);
    playerCosmetics[player] = { ...base, [key]: value };
    set({ playerCosmetics });
  },
  resetPlayerCosmetics: (player) => {
    const playerCosmetics = [...get().playerCosmetics];
    playerCosmetics[player] = null;
    set({ playerCosmetics });
  },
});
