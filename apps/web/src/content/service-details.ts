export const serviceDetails: Record<string, { audience: string; example: string; output: string }> = {
  'uav-rental': {
    audience: 'Teams planning a time-bounded UAV mission who need operations to review aircraft and operator requirements.',
    example: 'Describe the operating area, requested time window and intended task. Operations must confirm suitable resources before the mission proceeds.',
    output: 'A reviewed mission request and status updates. Aircraft availability, authorisations and commercial terms are not guaranteed by this page.',
  },
  'aerial-inspection': {
    audience: 'Teams needing an aerial view of a defined area or asset.',
    example: 'Provide the inspection area and the observations you need to collect. Attach or describe the context needed for operations to assess the brief.',
    output: 'Mission-linked observations or media when supplied by the operations team. No automated diagnosis or engineering certification is promised.',
  },
  'aerial-recording': {
    audience: 'Customers preparing an aerial photography or video brief.',
    example: 'Describe the subject, location, requested time and intended use of the recording so operations can review the capture requirements.',
    output: 'Mission media when captured and made accessible by the team. Resolution, editing services and delivery dates require separate confirmation.',
  },
  'data-collection': {
    audience: 'Teams gathering mission data for later analysis.',
    example: 'Describe the area, observations, desired output format and collection constraints. Operations reviews the request before assigning resources.',
    output: 'Data or media associated with the mission when provided. Sensor accuracy, survey certification and processing results are not implied.',
  },
};
