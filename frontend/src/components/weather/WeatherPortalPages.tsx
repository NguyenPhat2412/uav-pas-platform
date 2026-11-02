'use client';

import {AdminPage} from '@/components/layout/AdminPage';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {FlightWeatherWorkspace} from '@/components/weather/FlightWeatherWorkspace';

/** Admin › Thời tiết bay: the workspace plus every station's verdict. */
export function AdminWeatherPage() {
    return <AdminPage title="adminNav.weather" permission="MISSION_VIEW_ALL" activeResource="/admin/weather">
        <FlightWeatherWorkspace showStations/>
    </AdminPage>;
}

/** Operations › Thời tiết bay: open to every crew role; stations show for STATION_VIEW. */
export function OperationsWeatherPage() {
    return <OperationsPage permission="MISSION_VIEW" activeResource="weather">
        <FlightWeatherWorkspace showStations/>
    </OperationsPage>;
}

/** Customer › Thời tiết bay: check a site and hour before requesting a flight. */
export function CustomerWeatherPage() {
    return <PageGuard><FlightWeatherWorkspace/></PageGuard>;
}
