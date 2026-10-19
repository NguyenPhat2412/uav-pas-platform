import { pageMetadata } from "@/features/marketing/content/metadata";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { solutionDetails } from "@/features/marketing/content/solution-details";
import { solutions } from "@/features/marketing/content/site-content";
import { PublicPage, CustomerCta } from "@/features/marketing/components/public-page";
export function generateStaticParams(){return solutions.map(({slug})=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const solution=solutions.find((item)=>item.slug===slug);if(!solution)notFound();return pageMetadata(`Giải pháp: ${solution.title}`,solution.text,`/solutions/${slug}`)}
export default async function SolutionDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const solution=solutions.find((item)=>item.slug===slug);
  if(!solution)notFound();
  const detail=solutionDetails[slug];
  return <PublicPage eyebrow={`Giải pháp / ${solution.status==='AVAILABLE'?'Đã hỗ trợ gửi yêu cầu':'Dự kiến'}`} title={solution.title} intro={solution.text}><div className="page-copy">
    <h2>Tình huống sử dụng</h2><p>{detail.useCase}</p>
    <h2>Quy trình</h2><p>{detail.workflow}</p>
    <h2>Giới hạn</h2><p>{detail.limitation}</p>
    {solution.status==='AVAILABLE'?<CustomerCta/>:<Link className="text-link" href="/services">Xem các loại yêu cầu được hỗ trợ ↗</Link>}
  </div></PublicPage>;
}
