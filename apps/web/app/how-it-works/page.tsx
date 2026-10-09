import { pageMetadata } from '../../src/content/metadata';
export const metadata = pageMetadata("How it works", "Follow the UAV request journey from service discovery through manual review to mission progress.", "/how-it-works", true);
import { steps } from '../../src/content/site-content';
import { PublicPage, CustomerCta } from '../../src/components/public-page';
export default function HowItWorksPage(){return <PublicPage eyebrow="How it works" title="A request becomes a mission through review." intro="The public flow is simple: understand the service, share the brief, and let operations coordinate the next step."><ol className="steps">{steps.map((step)=><li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol><CustomerCta/></PublicPage>}
