import type { MetadataRoute } from 'next';
import { publicUrl } from "@/features/marketing/content/site-content";
export default function sitemap(): MetadataRoute.Sitemap { const routes=['/','/about','/services','/solutions','/how-it-works','/pricing','/contact','/faq','/services/uav-rental','/services/aerial-inspection','/services/aerial-recording','/services/data-collection','/solutions/uav-rental','/solutions/aerial-inspection','/solutions/ai-detection','/solutions/search-and-rescue']; return routes.map((route)=>({url:`${publicUrl}${route}`})); }
