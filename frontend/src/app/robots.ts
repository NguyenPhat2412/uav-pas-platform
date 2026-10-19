import type { MetadataRoute } from 'next';
import { publicUrl } from "@/features/marketing/content/site-content";
export default function robots(): MetadataRoute.Robots { return {rules:{userAgent:'*',allow:'/',disallow:['/login','/register','/health','/customer','/operations','/admin']},sitemap:`${publicUrl}/sitemap.xml`}; }
