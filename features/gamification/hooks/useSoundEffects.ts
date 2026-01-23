"use client";

import {
  playClick,
  playMessage,
  playError,
  playSuccess,
} from "@/shared/utils/sounds";

export function useSoundEffects() {
  return {
    playClick,
    playMessage,
    playError,
    playSuccess,
  };
}
