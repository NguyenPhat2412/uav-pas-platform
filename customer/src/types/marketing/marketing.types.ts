export type Readiness = 'AVAILABLE' | 'IN DEVELOPMENT' | 'PLANNED';

export type UavScene =
    | 'field'
    | 'rentalFleet'
    | 'inspectionGrid'
    | 'recordingCinema'
    | 'dataCorridor'
    | 'opsCommand'
    | 'heroSlide3'
    | 'infraSurvey'
    | 'edgePayload'
    | 'sarResponse'
    | 'stepOrthomosaic'
    | 'fieldCommand';

export interface ServiceDetailEntry {
    code: string;
    audience: string;
    example: string;
    output: string;
    sensors: string[];
    bestGsd: string;
    altitudeRange: string;
    maxArea: string;
    maxWind: string;
    onSiteSla: string;
    deliverySla: string;
    deliverables: string[];
    useCases: string[];
}

export interface SolutionDetailEntry {
    useCase: string;
    workflow: string;
    limitation: string;
    techStack: string[];
    algorithms: string[];
    deliverables: string[];
}
