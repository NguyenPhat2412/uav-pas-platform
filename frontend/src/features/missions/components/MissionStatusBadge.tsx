import {displayLabel} from "@/components/shared/presentation";
import type {MissionStatus} from "@/features/missions/types/mission.types";

export function MissionStatusBadge({status}: { status: MissionStatus }) {
    return <span className="mission-status" data-status={status}>{displayLabel(status)}</span>;
}
