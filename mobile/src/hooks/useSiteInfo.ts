import {useQuery} from '@tanstack/react-query';
import {mobileSettingsService} from '@/api/site-info.api';
import {parseSiteInfo, type ParsedSiteInfo} from '@/utils/site-info-parser';

export const SITE_INFO_QUERY_KEY = ['public', 'site-info'] as const;

export function useSiteInfo(): ParsedSiteInfo & { loaded: boolean; refetch: () => void } {
    const query = useQuery({
        queryKey: SITE_INFO_QUERY_KEY,
        queryFn: ({signal}) => mobileSettingsService.publicSiteInfo(signal),
        staleTime: 5_000,
        refetchOnMount: 'always',
    });
    const parsed = parseSiteInfo(query.data);
    return {
        ...parsed,
        loaded: query.isFetched,
        refetch: () => void query.refetch(),
    };
}
