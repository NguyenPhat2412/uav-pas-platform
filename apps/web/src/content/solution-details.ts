export const solutionDetails: Record<string, { useCase: string; workflow: string; limitation: string }> = {
  'uav-rental': {
    useCase: 'Prepare a mission that needs an aircraft, operator and a defined operating window.',
    workflow: 'Submit a draft with location and timing. Operations reviews the request before assigning resources and confirming readiness.',
    limitation: 'The software supports this request type. It does not establish aircraft availability or permission to fly.',
  },
  'aerial-inspection': {
    useCase: 'Give reviewers an aerial view of a defined area or asset without promising an automated inspection result.',
    workflow: 'Describe the inspection scope, submit the mission for review and follow mission-linked media when operations makes it available.',
    limitation: 'Image capture does not replace a qualified inspection, engineering assessment or required authorisation.',
  },
  'ai-detection': {
    useCase: 'A future review aid could help people examine mission imagery for candidate observations.',
    workflow: 'Planned only: image processing and result review are not an available customer workflow. Any future results would require human validation.',
    limitation: 'No detection accuracy, autonomous decision-making or processing service is currently promised. This capability cannot be booked.',
  },
  'search-and-rescue': {
    useCase: 'A future application could support authorised teams reviewing aerial observations during a search.',
    workflow: 'Planned only: an authorised response team would define the search and review observations. UAV PAS does not currently provide an emergency dispatch workflow.',
    limitation: 'This is not an emergency service. Contact the appropriate local emergency service for urgent assistance. A detection is not a confirmed rescue.',
  },
};
