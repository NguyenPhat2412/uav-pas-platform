import React from 'react';
import {ProviderPilotsScreen} from '@/components/marketplace/provider/ProviderPilotsScreen';

/**
 * Partner Studio Control Engineers management route (`/customer/provider/pilots`).
 *
 * Connects directly to `/api/v1/marketplace/provider/pilots` for listing,
 * registering, updating, and removing certified fleet pilots.
 *
 * Pilot assignments feed directly into `/customer/provider/orders` before
 * starting a simulated flight session.
 *
 * Thin route boundary maintained per mobile architecture guard.
 */
export default function ProviderPilotsRoute() {
    return <ProviderPilotsScreen/>;
}
