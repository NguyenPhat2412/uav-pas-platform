TanStack Query quản lý cache theo `queryKey`, refetch, loading/error state, mutations và invalidation; đây chính xác là những thứ dashboard nhiều module của bạn cần. Tài liệu chính thức hiện tại cũng mô tả `useQuery` cho dữ liệu đọc, `useMutation` cho thao tác thay đổi server và `invalidateQueries` để đồng bộ lại cache. 

### Tôi đề xuất kiến trúc Frontend như này

```
```

```
Next.js
│
├── API Client
│     └── fetch / axios
│
├── TanStack Query
│     ├── Queries
│     ├── Mutations
│     ├── Cache
│     ├── Invalidation
│     └── Optimistic Update
│
├── Feature Modules
│     ├── Users
│     ├── Stations
│     ├── UAV
│     ├── Inventory
│     ├── Media
│     ├── Learning
│     ├── Dashboard
│     └── Audit
│
└── UI
```

Tức là **component không biết endpoint cụ thể**.

Không viết kiểu này khắp các page:

```
```

```
useEffect(() => {
  fetch('/api/uavs')
    .then(res => res.json())
    .then(setUavs)
}, [])
```

Mà:

```
```

```
const {
  data,
  isPending,
  isError,
} = useUavs(filters)
```

---

## Cấu trúc source tôi sẽ dùng

```
```

```
src/
├── app/
│
├── lib/
│   ├── api/
│   │   ├── api-client.ts
│   │   ├── api-error.ts
│   │   └── endpoints.ts
│   │
│   └── query/
│       ├── query-client.ts
│       └── query-provider.tsx
│
├── features/
│   │
│   ├── users/
│   │   ├── api/
│   │   │   └── users.api.ts
│   │   ├── queries/
│   │   │   ├── user.keys.ts
│   │   │   ├── use-users.ts
│   │   │   ├── use-user.ts
│   │   │   └── use-update-user.ts
│   │   └── components/
│   │
│   ├── stations/
│   ├── uavs/
│   ├── inventory/
│   ├── media/
│   ├── learning/
│   ├── dashboard/
│   └── audit/
│
└── components/
```

Tách như vậy thì mỗi module Giai đoạn 1 gần như độc lập.

---

# 1. QueryClient chung

Ở root:

```
```

```
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export function QueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

TanStack Query mặc định coi query data là stale ngay lập tức nếu bạn không cấu hình `staleTime`, nên với dashboard tôi khuyên đặt giá trị phù hợp thay vì để mọi lần mount đều có khả năng refetch. 

---

# 2. Có API Client chung

Ví dụ vẫn dùng `fetch`, nhưng **fetch chỉ tồn tại ở tầng này**:

```
```

```
const API_URL =
  process.env.NEXT_PUBLIC_API_URL

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    },
  )

  if (!response.ok) {
    const error = await response.json()

    throw new ApiError(
      response.status,
      error.code,
      error.message,
    )
  }

  return response.json()
}
```

TanStack Query **không thay thế `fetch`**. Query function chỉ cần trả về Promise; bên trong bạn có thể sử dụng Fetch, Axios hoặc HTTP client khác. 

---

# 3. Mỗi module có Query Key Factory

Đây là phần rất quan trọng.

Ví dụ UAV:

```
```

```
export const uavKeys = {
  all: ['uavs'] as const,

  lists: () =>
    [...uavKeys.all, 'list'] as const,

  list: (filters: UavFilters) =>
    [...uavKeys.lists(), filters] as const,

  details: () =>
    [...uavKeys.all, 'detail'] as const,

  detail: (id: string) =>
    [...uavKeys.details(), id] as const,

  maintenance: (id: string) =>
    [...uavKeys.detail(id), 'maintenance'] as const,
}
```

Sau này cache sẽ cực kỳ rõ:

```
```

```
['uavs']

['uavs', 'list']

['uavs', 'list', {
  status: 'AVAILABLE',
  stationId: 'xxx'
}]

['uavs', 'detail', 'UAV_ID']

['uavs', 'detail', 'UAV_ID', 'maintenance']
```

Đây là một lợi thế lớn so với việc tự `fetch + useState + useEffect`.

---

# 4. API UAV

```
```

```
export function getUavs(
  filters: UavFilters,
) {
  const params =
    new URLSearchParams()

  if (filters.status) {
    params.set(
      'status',
      filters.status,
    )
  }

  if (filters.stationId) {
    params.set(
      'stationId',
      filters.stationId,
    )
  }

  return apiClient<UavPage>(
    `/api/uavs?${params}`,
  )
}

export function getUav(id: string) {
  return apiClient<Uav>(
    `/api/uavs/${id}`,
  )
}

export function createUav(
  input: CreateUavRequest,
) {
  return apiClient<Uav>(
    '/api/admin/uavs',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}
```

---

# 5. Query UAV

```
```

```
import { useQuery } from '@tanstack/react-query'

export function useUavs(
  filters: UavFilters,
) {
  return useQuery({
    queryKey: uavKeys.list(filters),

    queryFn: () =>
      getUavs(filters),

    staleTime: 30_000,
  })
}
```

Component:

```
```

```
function UavTable() {
  const filters = {
    status: 'AVAILABLE',
  }

  const {
    data,
    isPending,
    isFetching,
    error,
  } = useUavs(filters)

  if (isPending) {
    return <TableSkeleton />
  }

  if (error) {
    return <ErrorState />
  }

  return (
    <>
      <UavTableContent
        data={data.content}
      />

      {isFetching && (
        <span>Đang cập nhật...</span>
      )}
    </>
  )
}
```

Không còn:

```
```

```
useEffect
useState(data)
useState(loading)
useState(error)
fetch()
```

lặp đi lặp lại ở từng page.

---

# 6. Mutation thì cực kỳ hợp với Dashboard của bạn

Ví dụ thay đổi trạng thái UAV:

```
```

```
export function updateUavStatus(
  id: string,
  status: UavStatus,
) {
  return apiClient(
    `/api/admin/uavs/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status,
      }),
    },
  )
}
```

Hook:

```
```

```
export function useUpdateUavStatus() {
  const queryClient =
    useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: UavStatus
    }) =>
      updateUavStatus(
        id,
        status,
      ),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: uavKeys.lists(),
      })

      queryClient.invalidateQueries({
        queryKey:
          uavKeys.detail(
            variables.id,
          ),
      })
    },
  })
}
```

Sau khi:

```
```

```
AVAILABLE → MAINTENANCE
```

thành công, danh sách UAV và UAV Detail tự được invalidated/refetch.

Đây chính là pattern được TanStack Query khuyến nghị: mutation thành công → invalidate query liên quan. 

---

# 7. Inventory hưởng lợi nhiều nhất

Ví dụ hiện:

```
```

```
Camera

Total:     10
Available: 10
Reserved:   0
```

User reserve 3:

```
```

```
const reserveMutation =
  useReserveInventory()
```

Backend thành công.

Ta invalidate:

```
```

```
queryClient.invalidateQueries({
  queryKey: inventoryKeys.detail(itemId),
})

queryClient.invalidateQueries({
  queryKey: inventoryKeys.lists(),
})

queryClient.invalidateQueries({
  queryKey: dashboardKeys.inventory(),
})
```

Ngay lập tức:

```
```

```
Inventory Detail

10 → 7 available
0  → 3 reserved
```

Inventory List cập nhật.

Dashboard cũng cập nhật.

Không cần:

```
```

```
window.location.reload()
```

và không cần truyền state vòng quanh component.

---

# 8. Permission cũng dùng TanStack Query rất đẹp

Sau Login:

```
```

```
GET /api/me
```

response:

```
```

```
{
  "id": "USER_ID",
  "fullName": "Nguyen Van A",
  "permissions": [
    "UAV_VIEW",
    "UAV_UPDATE",
    "INVENTORY_VIEW",
    "INVENTORY_STOCK_IN",
    "COURSE_VIEW"
  ]
}
```

Query:

```
```

```
export const authKeys = {
  me: ['auth', 'me'] as const,
}

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,

    queryFn: getMe,

    staleTime: 5 * 60 * 1000,
  })
}
```

Sidebar:

```
```

```
const { data: me } = useMe()

if (
  me.permissions.includes('UAV_VIEW')
) {
  // render UAV menu
}
```

Admin thay đổi permission của user:

```
```

```
SAVE
 ↓
Mutation
 ↓
Invalidate User
 ↓
Invalidate Permission
```

Nếu chỉnh chính tài khoản hiện tại:

```
```

```
queryClient.invalidateQueries({
  queryKey: authKeys.me,
})
```

Sidebar có thể cập nhật ngay.

---

# 9. Dashboard càng nên dùng Query

Tôi sẽ không làm một `fetchDashboard()` khổng lồ.

Có thể chia:

```
```

```
['dashboard', 'summary']

['dashboard', 'uav']

['dashboard', 'inventory']

['dashboard', 'learning']

['dashboard', 'users']
```

Ví dụ:

```
```

```
const summary =
  useDashboardSummary()

const uav =
  useUavStatistics()

const inventory =
  useInventoryStatistics()

const learning =
  useLearningStatistics()
```

Quyền nào có thì mới chạy query đó.

Ví dụ:

```
```

```
const canViewInventory =
  hasPermission(
    'DASHBOARD_INVENTORY',
  )

const query =
  useQuery({
    queryKey:
      dashboardKeys.inventory(),

    queryFn:
      getInventoryStatistics,

    enabled:
      canViewInventory,
  })
```

Đây rất hợp với dashboard permission-based của bạn.

---

# 10. Media thì không dùng Query để upload binary

Chỗ này cần phân biệt.

TanStack Query quản lý **mutation state**, nhưng upload thực tế vẫn chạy qua HTTP/Signed URL.

```
```

```
useMutation()
     ↓
Request Signed URL
     ↓
Upload trực tiếp MinIO
     ↓
Confirm Upload
     ↓
Invalidate media queries
```

Như vậy:

```
```

```
const upload =
  useMutation({
    mutationFn:
      uploadMedia,
  })
```

Bạn vẫn có:

```
```

```
isPending
isError
isSuccess
```

nhưng binary không đi qua cache Query.

---

# 11. E-Learning cũng rất phù hợp

Query Keys:

```
```

```
['courses']

['courses', 'catalog', filters]

['courses', courseId]

['courses', courseId, 'sections']

['lessons', lessonId]

['my-learning']

['my-learning', courseId, 'progress']
```

Khi user Complete Lesson:

```
```

```
POST lesson complete
         ↓
invalidate lesson progress
         ↓
invalidate course progress
         ↓
invalidate my-learning
         ↓
invalidate dashboard learning
```

Không cần tự đồng bộ 4 vùng UI.

---

# 12. Phân chia State cho đúng

Đây mới là điểm quan trọng.

Tôi sẽ chia frontend UAV PAS thành:

| StateCông nghệ          |                                 |
| ----------------------- | ------------------------------- |
| Server data             | **TanStack Query**              |
| API cache               | **TanStack Query**              |
| Loading/Error           | **TanStack Query**              |
| Pagination server       | **TanStack Query**              |
| Mutation                | **TanStack Query**              |
| User/Profile            | **TanStack Query**              |
| Permissions             | **TanStack Query**              |
| Form                    | **React Hook Form**             |
| Validation              | **Zod**                         |
| Table                   | **TanStack Table**              |
| Modal open/close        | React state                     |
| UI filter tạm thời      | React state / URL Search Params |
| Theme/sidebar collapsed | Zustand hoặc local state        |
| Auth token              | Cookie/session, không Zustand   |

Vì vậy **không cần Redux/Zustand để chứa dữ liệu API**.

Ví dụ đừng làm:

```
```

```
TanStack Query fetch UAV
       ↓
copy UAV vào Zustand
       ↓
Component
```

Đó là duplicate state.

Nên:

```
```

```
Backend
   ↓
TanStack Query Cache
   ↓
Component
```

---

## Với UAV PAS, stack Frontend tôi sẽ chốt như này

```
```

```
Next.js
  │
  ├── TypeScript
  │
  ├── TanStack Query
  │      └── Server State
  │
  ├── TanStack Table
  │      └── Data Tables
  │
  ├── React Hook Form
  │      └── Forms
  │
  ├── Zod
  │      └── Validation
  │
  ├── Zustand
  │      └── Chỉ UI state nếu thực sự cần
  │
  ├── shadcn/ui
  │
  └── API Client
         └── Fetch hoặc Axios
```

Và thứ tự request sẽ thành:

```
```

```
                   COMPONENT
                       │
                       ▼
                FEATURE HOOK
                       │
               TanStack Query
                       │
              ┌────────┴────────┐
              │                 │
           Cache            Query Fn
                                │
                                ▼
                           API Client
                                │
                                ▼
                         API Gateway
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
      Identity              Resource               Learning
       Service              Service                Service
```

**Đây phù hợp hơn hẳn việc dùng `fetch()` trực tiếp ở từng component.** TanStack Query v5 hiện hỗ trợ React 18+ và chính tài liệu chính thức cũng đặt `QueryClientProvider` làm lớp cung cấp QueryClient cho ứng dụng. 