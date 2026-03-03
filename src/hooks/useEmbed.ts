import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EmbedParams, AppLocale } from '@/types';

/**
 * Parses embed-related URL parameters.
 * Embed mode is activated by ?embed=true in the URL.
 *
 * Full embed URL example:
 * ?embed=true&breed=貴賓&weight=5&hotel=maoanzu&store_name=毛安住&pet_name=Lucky&lang=zh-TW
 */
export function useEmbed(): EmbedParams & { isEmbed: boolean } {
  const [params] = useSearchParams();

  return useMemo(() => {
    const embed = params.get('embed') === 'true';
    return {
      isEmbed: embed,
      embed,
      breed: params.get('breed') ?? undefined,
      weight: params.has('weight') ? Number(params.get('weight')) : undefined,
      hotel: params.get('hotel') ?? undefined,
      store_name: params.get('store_name') ?? undefined,
      pet_name: params.get('pet_name') ?? undefined,
      lang: (params.get('lang') as AppLocale) ?? undefined,
      photo_url: params.get('photo_url') ?? undefined,
    };
  }, [params]);
}
