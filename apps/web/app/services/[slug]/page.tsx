import { pageMetadata } from '../../../src/content/metadata';
import { notFound } from 'next/navigation';
import { serviceDetails } from '../../../src/content/service-details';
import { services } from '../../../src/content/site-content';
import { PublicPage, CustomerCta } from '../../../src/components/public-page';
export function generateStaticParams(){return services.map(({slug})=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const service=services.find((item)=>item.slug===slug);if(!service)notFound();return pageMetadata(`Service: ${service.title}`,service.text,`/services/${slug}`)}
export default async function ServiceDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const service=services.find((item)=>item.slug===slug);
  if(!service)notFound();
  const detail=serviceDetails[slug];
  return <PublicPage eyebrow="Supported request category" title={service.title} intro={service.text}><div className="page-copy">
    <p>Request workflow available. This is a supported mission category, not a live availability listing. Check the active service catalogue in the Customer Portal.</p>
    <h2>Who it is for</h2><p>{detail.audience}</p>
    <h2>Example brief</h2><p>{detail.example}</p>
    <h2>What to expect</h2><p>{detail.output}</p>
    <h2>How to request</h2><p>Sign in to the Customer Portal, select an active service, create a draft mission and submit it for operations review.</p>
    <CustomerCta/>
  </div></PublicPage>;
}
