import type { MetadataRoute } from 'next';
import { publicUrl } from '../src/content/site-content';
export default function robots(): MetadataRoute.Robots { return {rules:{userAgent:'*',allow:'/',disallow:['/login','/register','/health']},sitemap:`${publicUrl}/sitemap.xml`}; }
