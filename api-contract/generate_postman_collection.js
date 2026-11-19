const fs = require('fs');
const path = require('path');

const HERE = path.resolve(__dirname);
const OPENAPI_PATH = path.join(HERE, 'openapi.json');
const POSTMAN_PATH = path.join(HERE, 'postman_collection.json');
const ROOT_POSTMAN_PATH = path.resolve(HERE, '..', 'postman.json');

const openapi = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
const schemas = (openapi.components && openapi.components.schemas) || {};

function resolveSchema(schemaRef) {
    if (!schemaRef) return {};
    if (schemaRef.$ref) {
        const ref = schemaRef.$ref;
        if (ref.startsWith('#/components/schemas/')) {
            const name = ref.split('/').pop();
            return schemas[name] || {};
        }
    }
    return schemaRef;
}

function getFieldSmartExample(fieldName, propSpec) {
    propSpec = resolveSchema(propSpec);
    const nameLower = fieldName.toLowerCase();

    if (propSpec.enum && propSpec.enum.length > 0) {
        return propSpec.enum[0];
    }
    if (nameLower.includes('username')) return 'admin';
    if (nameLower.includes('password')) return 'Password123@';
    if (nameLower.includes('email')) return 'admin@uav-platform.com';
    if (nameLower.includes('phone')) return '0987654321';
    if (nameLower.includes('refreshtoken')) return '{{refreshToken}}';
    if (['name', 'stationname', 'equipmentname'].includes(nameLower)) return 'Trạm Vận Hành Alpha';
    if (['title', 'missiontitle'].includes(nameLower)) return 'Nhiệm vụ bay khảo sát tự động';
    if (['description', 'notes', 'reason'].includes(nameLower)) return 'Kiểm tra an toàn tự động định kỳ';
    if (['locationname', 'address'].includes(nameLower)) return 'Hà Nội, Việt Nam';
    if (nameLower === 'latitude') return 21.028511;
    if (nameLower === 'longitude') return 105.804817;
    if (nameLower === 'altitudemeters') return 120.0;
    if (nameLower === 'serialnumber') return 'SN-UAV-2026-X1';
    if (nameLower === 'model') return 'Matrice 300 RTK';
    if (nameLower === 'manufacturer') return 'DJI Enterprise';
    if (['code', 'permissioncode'].includes(nameLower)) return 'UAV_SERVICES_READ';
    if (nameLower === 'role') return 'ROLE_ADMIN';
    if (nameLower === 'status') return 'ACTIVE';
    if (nameLower === 'priority') return 'HIGH';
    if (nameLower === 'missiontype') return 'AREA_INSPECTION';
    if (nameLower === 'requesteddate') return '2026-11-20';
    if (['starttime', 'begintime'].includes(nameLower)) return '2026-11-20T08:00:00Z';
    if (['expectedendtime', 'endtime'].includes(nameLower)) return '2026-11-20T11:00:00Z';
    if (['serviceid', 'stationid', 'userid', 'uavid', 'targetuavid', 'equipmentid', 'mediaid'].includes(nameLower)) return 1;
    if (nameLower === 'pilotuserids') return [1];
    if (['amount', 'totalamount', 'price'].includes(nameLower)) return 500000.0;
    if (['quantity', 'hours', 'quota'].includes(nameLower)) return 10;
    if (['url', 'webhookurl', 'targeturl'].includes(nameLower)) return 'https://webhook.site/test-uav';
    if (nameLower === 'events') return ['MISSION_CREATED', 'MISSION_COMPLETED'];
    if (nameLower === 'secret') return 'whsec_local_test_key_12345';

    const propType = propSpec.type;
    const propFormat = propSpec.format;

    if (propFormat === 'date-time') return '2026-11-20T08:00:00Z';
    if (propFormat === 'date') return '2026-11-20';
    if (propType === 'integer') return 1;
    if (propType === 'number') return 100.0;
    if (propType === 'boolean') return true;
    if (propType === 'string') return propSpec.example || 'sample_value';

    return 'sample_value';
}

function sampleFromSchema(s, depth = 0) {
    if (depth > 4 || !s) return {};
    s = resolveSchema(s);
    const stype = s.type || 'object';

    if (stype === 'object') {
        const obj = {};
        const props = s.properties || {};
        if (Object.keys(props).length === 0 && s.allOf) {
            for (const item of s.allOf) {
                const subRes = sampleFromSchema(item, depth + 1);
                if (typeof subRes === 'object') Object.assign(obj, subRes);
            }
            return obj;
        }
        for (const [propName, propSpec] of Object.entries(props)) {
            const resolvedProp = resolveSchema(propSpec);
            const ptype = resolvedProp.type;
            if (ptype === 'object') {
                obj[propName] = sampleFromSchema(resolvedProp, depth + 1);
            } else if (ptype === 'array') {
                const itemsSpec = resolveSchema(resolvedProp.items || {});
                if (itemsSpec.type === 'object') {
                    obj[propName] = [sampleFromSchema(itemsSpec, depth + 1)];
                } else {
                    obj[propName] = [getFieldSmartExample(propName, itemsSpec)];
                }
            } else {
                obj[propName] = getFieldSmartExample(propName, resolvedProp);
            }
        }
        return obj;
    } else if (stype === 'array') {
        return [sampleFromSchema(s.items || {}, depth + 1)];
    }
    return getFieldSmartExample('sample', s);
}

const PATH_VAR_DEFAULTS = {
    id: '1',
    userId: '1',
    missionId: '1',
    stationId: '1',
    uavId: '1',
    mediaId: '1',
    detectionId: '1',
    equipmentId: '1',
    code: 'UAV_SERVICES_READ',
    role: 'ROLE_ADMIN',
    key: 'STORAGE_QUOTA',
    serviceId: '1'
};

const COLLECTION_PRE_REQUEST_SCRIPT = `// UAV PAS Platform - Automated Auto-Login Pre-request Script
var baseUrl = pm.collectionVariables.get("baseUrl") || "http://localhost:8080";
var token = pm.collectionVariables.get("token");
var urlStr = pm.request.url ? pm.request.url.toString() : "";
var isAuth = urlStr.indexOf("/auth/login") !== -1 || urlStr.indexOf("/auth/register") !== -1;

if (!token && !isAuth) {
    var username = pm.collectionVariables.get("defaultUsername") || "admin";
    var password = pm.collectionVariables.get("defaultPassword") || "Password123@";
    
    pm.sendRequest({
        url: baseUrl + "/api/v1/auth/login",
        method: "POST",
        header: { "Content-Type": "application/json" },
        body: {
            mode: "raw",
            raw: JSON.stringify({
                usernameOrEmail: username,
                password: password
            })
        }
    }, function (err, res) {
        if (!err && res.code === 200) {
            var data = res.json();
            var newToken = data.accessToken || (data.data && data.data.accessToken);
            var newRefreshToken = data.refreshToken || (data.data && data.data.refreshToken);
            if (newToken) {
                pm.collectionVariables.set("token", newToken);
                pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + newToken });
            }
            if (newRefreshToken) {
                pm.collectionVariables.set("refreshToken", newRefreshToken);
            }
        }
    });
} else if (token && !isAuth) {
    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
}`;

const TAG_NAMES = {
    'Authentication': '01. Authentication & Security',
    'auth-controller': '01. Authentication & Security',
    'Users': '02. User Accounts Management',
    'user-controller': '02. User Accounts Management',
    'user-administration-controller': '02. User Accounts Management',
    'user-profile-controller': '03. User Profile',
    'user-avatar-controller': '03. User Profile',
    'password-change-controller': '03. User Profile',
    'mission-controller': '04. Flight Missions & Operations',
    'telemetry-controller': '04. Flight Missions & Operations',
    'flight-site-controller': '04. Flight Missions & Operations',
    'airspace-controller': '04. Flight Missions & Operations',
    'service-offering-controller': '05. Mission Service Offerings',
    'uav-controller': '06. UAV Fleet Management',
    'station-controller': '07. Docking Stations',
    'inventory-controller': '08. Equipment & Inventory',
    'maintenance-controller': '09. Maintenance & Repair Orders',
    'billing-controller': '10. Billing, Plans & Invoices',
    'billing-admin-controller': '10. Billing, Plans & Invoices',
    'plan-administration-controller': '10. Billing, Plans & Invoices',
    'bank-transfer-controller': '10. Billing, Plans & Invoices',
    'billing-profile-controller': '10. Billing, Plans & Invoices',
    'admin-billing-profile-controller': '10. Billing, Plans & Invoices',
    'payment-ipn-controller': '11. Payment Gateway IPN',
    'sar-controller': '12. Search & Rescue (SAR)',
    'ai-controller': '13. AI Vision & Object Detection',
    'ai-router-controller': '13. AI Vision & Object Detection',
    'assistant-conversation-controller': '13. AI Vision & Object Detection',
    'media-controller': '14. Media & Cloud Storage',
    'admin-file-controller': '14. Media & Cloud Storage',
    'storage-pool-controller': '14. Media & Cloud Storage',
    'storage-gateway-controller': '14. Media & Cloud Storage',
    'notification-controller': '15. System Notifications',
    'notification-policy-controller': '15. System Notifications',
    'admin-alert-controller': '15. System Notifications',
    'permission-controller': '16. Permissions (RBAC)',
    'role-template-controller': '17. Role Templates',
    'webhook-controller': '18. Webhooks & Subscriptions',
    'webhook-admin-controller': '18. Webhooks & Subscriptions',
    'dashboard-controller': '19. Executive Dashboard',
    'report-controller': '20. Operational Reports',
    'admin-sla-intelligence-controller': '20. Operational Reports',
    'audit-log-controller': '21. System Audit Logs',
    'system-config-controller': '22. System Configurations',
    'public-site-info-controller': '22. System Configurations',
    'security-admin-controller': '22. System Configurations',
    'infrastructure-controller': '22. System Configurations',
    'device-key-controller': '23. Device Keys & Simulation',
    'simulation-controller': '23. Device Keys & Simulation',
    'weather-controller': '24. Weather & Flight Safety',
    'marketplace-public-controller': '25. UAV Marketplace',
    'marketplace-rfq-controller': '25. UAV Marketplace',
    'marketplace-provider-controller': '25. UAV Marketplace',
    'marketplace-admin-controller': '25. UAV Marketplace',
    'public-support-controller': '26. Live Support Chat',
    'admin-support-controller': '26. Live Support Chat',
    'training-controller': '27. Training & Academy',
    'training-course-controller': '27. Training & Academy'
};

const collection = {
    info: {
        name: 'UAV PAS Platform API - Complete Test Suite',
        description: '# UAV PAS Platform API Documentation & Complete Test Suite\n\n' +
                     'Tập hợp đầy đủ API endpoints của toàn bộ hệ thống UAV PAS Platform, phân chia theo 27 phân hệ nghiệp vụ, với Sample Request Body, Query Params, Path Variables và cơ chế Auto-Login.\n\n' +
                     '### 🔑 Tài khoản mặc định: `admin` / `Password123@`\n' +
                     '### 🚀 Tự động cấp Bearer Token và hỗ trợ test Newman CLI.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    event: [
        {
            listen: 'prerequest',
            script: {
                type: 'text/javascript',
                exec: COLLECTION_PRE_REQUEST_SCRIPT.split('\n')
            }
        }
    ],
    auth: {
        type: 'bearer',
        bearer: [
            { key: 'token', value: '{{token}}', type: 'string' }
        ]
    },
    variable: [
        { key: 'baseUrl', value: 'http://localhost:8080', type: 'string' },
        { key: 'token', value: '', type: 'string' },
        { key: 'refreshToken', value: '', type: 'string' },
        { key: 'defaultUsername', value: 'admin', type: 'string' },
        { key: 'defaultPassword', value: 'Password123@', type: 'string' }
    ],
    item: []
};

const folders = {};
const paths = openapi.paths || {};

for (const [pathStr, methods] of Object.entries(paths)) {
    for (const [methodName, op] of Object.entries(methods)) {
        const mUpper = methodName.toUpperCase();
        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(mUpper)) continue;

        const rawTags = op.tags || ['General'];
        const rawTag = rawTags[0] || 'General';
        const folderName = TAG_NAMES[rawTag] || rawTag;

        if (!folders[folderName]) {
            folders[folderName] = {
                name: folderName,
                description: `Quản lý các API thuộc phân hệ ${folderName}`,
                item: []
            };
        }

        const pmPathStr = pathStr.replace(/\{([^}]+)\}/g, ':$1');
        const pathSegments = pmPathStr.replace(/^\/|\/$/g, '').split('/').filter(Boolean);

        const urlObj = {
            raw: '{{baseUrl}}' + pmPathStr,
            host: ['{{baseUrl}}'],
            path: pathSegments,
            query: [],
            variable: []
        };

        const pathVarMatches = pmPathStr.match(/:([a-zA-Z0-9_]+)/g) || [];
        for (const pv of pathVarMatches) {
            const pvName = pv.substring(1);
            let val = PATH_VAR_DEFAULTS[pvName] || '1';
            if (['id', 'userId'].includes(pvName) && (pmPathStr.includes('/users/') || pmPathStr.includes('/permissions/users/') || pmPathStr.includes('/billing/admin/quotas/'))) {
                val = '2';
            }
            urlObj.variable.push({
                key: pvName,
                value: val,
                description: `Tham số đường dẫn ${pvName}`
            });
        }

        for (const param of (op.parameters || [])) {
            if (param.in === 'query') {
                const pname = param.name;
                let defaultVal = '';
                if (pname === 'page') defaultVal = '0';
                else if (pname === 'size') defaultVal = '20';
                else if (pname === 'sort') defaultVal = 'id,desc';
                else if (pname === 'status') defaultVal = 'ACTIVE';
                else if (pname === 'role') defaultVal = 'ROLE_ADMIN';
                else if (param.schema && param.schema.example) defaultVal = String(param.schema.example);

                urlObj.query.push({
                    key: pname,
                    value: defaultVal,
                    description: param.description || '',
                    disabled: (pname === 'page' || pname === 'size') ? false : !param.required
                });
            }
        }

        let bodyObj = null;
        if (op.requestBody && op.requestBody.content) {
            const reqContent = op.requestBody.content;
            if (reqContent['application/json']) {
                const schemaInfo = reqContent['application/json'].schema || {};
                let sampleBody = sampleFromSchema(schemaInfo);

                if (['/api/v1/auth/login', '/api/v1/auth/login-json'].includes(pathStr)) {
                    sampleBody = { usernameOrEmail: 'admin', password: 'Password123@' };
                } else if (pathStr === '/api/v1/auth/refresh') {
                    sampleBody = { refreshToken: '{{refreshToken}}' };
                } else if (pathStr === '/api/v1/auth/register') {
                    sampleBody = {
                        username: 'pilot_user_test',
                        email: 'pilot_test@uav-platform.com',
                        password: 'Password123@',
                        phoneNumber: '0912345678'
                    };
                }

                bodyObj = {
                    mode: 'raw',
                    raw: JSON.stringify(sampleBody, null, 2),
                    options: { raw: { language: 'json' } }
                };
            } else if (reqContent['multipart/form-data']) {
                bodyObj = {
                    mode: 'formdata',
                    formdata: [
                        { key: 'file', type: 'file', description: 'Tập tin tải lên' }
                    ]
                };
            }
        }

        let summary = (op.summary || '').trim();
        const reqName = summary || `${mUpper} ${pathStr}`;
        const reqDesc = op.description || reqName;

        let testScriptLines = [
            'pm.test("Status is handled properly (no server crash 500)", function () {',
            '    pm.expect(pm.response.code !== 500).to.be.true;',
            '});',
            'pm.test("Response time is reasonable (< 3000ms)", function () {',
            '    pm.expect(pm.response.responseTime).to.be.below(3000);',
            '});'
        ];

        if (['/api/v1/auth/login', '/api/v1/auth/login-json'].includes(pathStr)) {
            testScriptLines = [
                'if (pm.response.code === 200) {',
                '    var data = pm.response.json();',
                '    var token = data.accessToken || (data.data && data.data.accessToken);',
                '    var refreshToken = data.refreshToken || (data.data && data.data.refreshToken);',
                '    if (token) {',
                '        pm.collectionVariables.set("token", token);',
                '        console.log("Token updated successfully in {{token}}");',
                '    }',
                '    if (refreshToken) {',
                '        pm.collectionVariables.set("refreshToken", refreshToken);',
                '        console.log("RefreshToken updated successfully in {{refreshToken}}");',
                '    }',
                '}',
                'pm.test("Login successful with 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().accessToken).to.be.a("string");',
                '});'
            ];
        } else if (pathStr === '/api/v1/auth/logout') {
            testScriptLines = [
                'pm.test("Logout responded", function () {',
                '    pm.expect(pm.response.code).to.be.below(500);',
                '});',
                'pm.collectionVariables.set("token", "");'
            ];
        }

        const reqItem = {
            name: reqName,
            request: {
                method: mUpper,
                header: (bodyObj && bodyObj.mode === 'raw') ? [
                    { key: 'Content-Type', value: 'application/json', type: 'text' }
                ] : [],
                url: urlObj,
                description: `### ${reqName}\n\n${reqDesc}\n\n* **Phương thức:** \`${mUpper}\`\n* **Endpoint:** \`${pathStr}\``
            },
            event: [
                {
                    listen: 'test',
                    script: {
                        type: 'text/javascript',
                        exec: testScriptLines
                    }
                }
            ],
            response: []
        };

        if (bodyObj) reqItem.request.body = bodyObj;
        if (['/api/v1/auth/login', '/api/v1/auth/login-json', '/api/v1/auth/register', '/api/v1/billing/webhook/payment-ipn'].includes(pathStr)) {
            reqItem.request.auth = { type: 'noauth' };
        }

        folders[folderName].item.push(reqItem);
    }
}

const sortedFolderKeys = Object.keys(folders).sort();
for (const folderKey of sortedFolderKeys) {
    const fObj = folders[folderKey];
    fObj.item.sort((a, b) => a.name.localeCompare(b.name));
    fObj.item.forEach((item, idx) => {
        item.name = `${String(idx + 1).padStart(2, '0')}. ${item.name}`;
    });
    collection.item.push(fObj);
}

fs.writeFileSync(POSTMAN_PATH, JSON.stringify(collection, null, 2), 'utf8');
fs.writeFileSync(ROOT_POSTMAN_PATH, JSON.stringify(collection, null, 2), 'utf8');

console.log('Generated postman collections successfully!');
console.log('Total Folders:', collection.item.length);
const totalReqs = collection.item.reduce((sum, f) => sum + f.item.length, 0);
console.log('Total Requests:', totalReqs);
