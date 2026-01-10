import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://hubplate.app'
    const supabase = await createClient()

    // Fetch all active restaurant slugs
    const { data: locations } = await supabase
        .from('locations')
        .select('slug, updated_at')
        .eq('is_active', true)
        .not('slug', 'is', null) as { data: { slug: string; updated_at: string | null }[] | null };

    const restaurantUrls = (locations || []).map((loc) => ({
        url: `${baseUrl}/m/${loc.slug}`,
        lastModified: loc.updated_at ? new Date(loc.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
    }))

    const staticUrls = [
        {
            url: `${baseUrl}/`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/signup`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
    ]

    return [...staticUrls, ...restaurantUrls]
}
