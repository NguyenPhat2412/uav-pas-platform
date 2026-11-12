# M2 Legacy Compatibility

The legacy `frontend/` directory was left in place. Its source and backend hashes recorded in the M1 baseline remain unchanged by M2. Legacy routes still build and run with their original ownership; the Operations app carries compatibility aliases without deleting or overwriting those routes.

Verified legacy routes include the existing dashboard, mission list/create/detail, operations workspace, access control, login, register, and operator/admin mission pages. The canonical ownership remains the architecture matrix: customer retains customer mission creation/list/detail, admin retains access control, and Operations owns the resource console and operational mission views.

The current interim authentication contract remains JWT plus browser storage and refresh. M2 does not claim cross-domain SSO.
