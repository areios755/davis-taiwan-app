import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EmbedParams, AppLocale } from '@/types';

/**
 * Parses embed-related URL parameters.
 * Embed mode is activated by ?embed=true in the URL.
 *
 * Full embed URL example:
 * ?embed=true&breed=貴賓&breed_group_id=xxx&weight=5&hotel=maoanzu&store_name=毛安住&pet_name=Lucky&lang=zh-TW
 *
 * breed_group_id: UUID from shared breed_groups table — 毛安住 can pass this
 * for zero-mapping direct lookup.
 */
export function useEmbed(): EmbedParams & { isEmbed: boolean } {
  const [params] = useSearchParams();

  return useMemo(() => {
    const embed = params.get('embed') === 'true';
    return {
      isEmbed: embed,
      embed,
      breed: params.get('breed') ?? undefined,
      breed_group_id: params.get('breed_group_id') ?? undefined,
      weight: params.has('weight') ? Number(params.get('weight')) : undefined,
      hotel: params.get('hotel') ?? undefined,
      store_name: params.get('store_name') ?? undefined,
      pet_name: params.get('pet_name') ?? undefined,
      lang: (params.get('lang') as AppLocale) ?? undefined,
      photo_url: params.get('photo_url') ?? undefined,
    };
  }, [params]);
}
