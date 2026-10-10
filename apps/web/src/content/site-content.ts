export type Readiness = 'AVAILABLE' | 'IN DEVELOPMENT' | 'PLANNED';

export { customerUrl, publicUrl } from './origins';

export const capabilities = [
  { title: 'Service requests', text: 'Start with a clear service brief and mission intent.', status: 'AVAILABLE' as Readiness },
  { title: 'Mission operations', text: 'Operations teams review requests and coordinate the next step.', status: 'AVAILABLE' as Readiness },
  { title: 'Secure mission media', text: 'Keep mission outputs associated with the right workspace.', status: 'AVAILABLE' as Readiness },
  { title: 'AI-assisted detection', text: 'Planned assistance for reviewing mission imagery with human oversight.', status: 'PLANNED' as Readiness },
  { title: 'Search and rescue support', text: 'A planned workflow for approved response operations and supervised use.', status: 'PLANNED' as Readiness },
  { title: 'Payments and packages', text: 'Commercial workflows are planned and are not published yet.', status: 'PLANNED' as Readiness },
];

export const services = [
  { slug: 'uav-rental', title: 'UAV rental', text: 'Request aircraft and operator support for a defined mission.', status: 'AVAILABLE' as Readiness },
  { slug: 'aerial-inspection', title: 'Aerial inspection', text: 'Plan a structured inspection brief and review the mission outcome.', status: 'AVAILABLE' as Readiness },
  { slug: 'aerial-recording', title: 'Aerial recording', text: 'Capture aerial media for approved commercial or operational briefs.', status: 'AVAILABLE' as Readiness },
  { slug: 'data-collection', title: 'Data collection', text: 'Describe the area, outputs, and constraints for a collection mission.', status: 'AVAILABLE' as Readiness },
];

export const solutions = [
  { slug: 'uav-rental', title: 'UAV rental', text: 'A practical starting point for aircraft and operator requests.', status: 'AVAILABLE' as Readiness },
  { slug: 'aerial-inspection', title: 'Aerial inspection', text: 'Turn an inspection need into a reviewable mission brief.', status: 'AVAILABLE' as Readiness },
  { slug: 'ai-detection', title: 'AI-assisted detection', text: 'A planned review aid with human validation at the centre.', status: 'PLANNED' as Readiness },
  { slug: 'search-and-rescue', title: 'Search and rescue support', text: 'A planned, supervised capability for approved response workflows.', status: 'PLANNED' as Readiness },
];

export const steps = [
  { number: '01', title: 'Discover a service', text: 'Choose a service or solution that matches the mission intent.' },
  { number: '02', title: 'Create an account', text: 'Continue to the Customer Portal to provide the information needed for a request.' },
  { number: '03', title: 'Submit a mission request', text: 'Share location, timing, outputs, and operational constraints.' },
  { number: '04', title: 'Operations review', text: 'The operations team reviews the brief and coordinates the next step.' },
  { number: '05', title: 'Track progress', text: 'Use the Customer Portal for mission updates and associated media.' },
];
