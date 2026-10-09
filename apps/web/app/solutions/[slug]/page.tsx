import { pageMetadata } from '../../../src/content/metadata';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { solutionDetails } from '../../../src/content/solution-details';
import { solutions } from '../../../src/content/site-content';
import { PublicPage, CustomerCta } from '../../../src/components/public-page';
export function generateStaticParams(){return solutions.map(({slug})=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const solution=solutions.find((item)=>item.slug===slug);if(!solution)notFound();return pageMetadata(`Solution: ${solution.title}`,solution.text,`/solutions/${slug}`)}
export default async function SolutionDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const solution=solutions.find((item)=>item.slug===slug);
  if(!solution)notFound();
  const detail=solutionDetails[slug];
  return <PublicPage eyebrow={`Solution / ${solution.status==='AVAILABLE'?'Request workflow available':'PLANNED'}`} title={solution.title} intro={solution.text}><div className="page-copy">
    <h2>Use case</h2><p>{detail.useCase}</p>
    <h2>Workflow</h2><p>{detail.workflow}</p>
    <h2>Limitations</h2><p>{detail.limitation}</p>
    {solution.status==='AVAILABLE'?<CustomerCta/>:<Link className="text-link" href="/services">Explore supported request categories ↗</Link>}
  </div></PublicPage>;
}
