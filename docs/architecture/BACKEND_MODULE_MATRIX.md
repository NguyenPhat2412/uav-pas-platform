# Ma trận cấu trúc module backend

Đối chiếu mã ngày **18/10/2026**. Có **18 module nghiệp vụ**. Số trong bảng là số file Java cấp cao nhất; `—` nghĩa là không có package riêng vì chưa có kiểu dữ liệu cần dùng. Các file DTO đều khai báo Java `record`; tên thư mục `record` chỉ dành cho dữ liệu trung gian nội bộ.

## Quy ước chung

- `controller`: HTTP binding, quyền truy cập và gọi service contract.
- `dto/request`: đầu vào JSON hoặc truy vấn có nhiều trường dùng tại service boundary; tên kết thúc `Request`.
- `dto/response`: đầu ra API; tên kết thúc `Response`. Không trả Entity trực tiếp.
- `dto/record`: dữ liệu nội bộ như filter, snapshot, command; không kết thúc `Request`/`Response` và không dùng làm JSON body/response trực tiếp.
- `entity`, `enums`, `repository`, `specification`, `mapper`, `service/impl`: cùng vai trò ở mọi module; chỉ tạo tầng có thành phần thực sự cần dùng.
- Các phần dùng chung như phân trang, lỗi và thông báo chung ở `common/dto/response`.
- Không tạo thư mục rỗng, request giả hoặc thao tác CRUD mới để làm bảng đầy đủ hình thức.

## Kiểm kê

| Module | Request | Response | Record nội bộ | Ghi chú |
|---|---:|---:|---:|---|
| audit | — | 1 | — | Nhận page/size qua query; không có JSON body hoặc dữ liệu trung gian riêng. |
| auth | 4 | 1 | — | Request/response của đăng nhập, đăng ký, refresh, logout; không cần record trung gian riêng. |
| billing | 4 | 5 | 1 | Record nội bộ chứa dữ liệu chuẩn hóa để ký IPN. |
| dashboard | — | 2 | 1 | Chỉ đọc theo người dùng hiện tại; AppUserView là dữ liệu trung gian nội bộ. |
| inventory | 2 | 2 | — | Có request xuất/nhập/điều chỉnh và response; chưa cần record trung gian riêng. |
| maintenance | 11 | 3 | — | Bổ sung hai query request cho lịch bảo trì và phiếu sửa chữa; nghiệp vụ nằm tại service/impl. |
| media | 1 | 2 | 2 | Có request upload, response metadata/signed URL, record metadata và quyền đọc nội bộ. |
| mission | 12 | 6 | 1 | Request cho nghiệp vụ, response cho API, MissionFilter nội bộ dùng trong truy vấn. |
| notification | 1 | 2 | — | Request tạo thông báo; response danh sách/số chưa đọc; không cần record trung gian riêng. |
| permission | — | 3 | — | API dùng ID/code trên path và granted trên query; không có JSON body cần DTO riêng. |
| reporting | — | 1 | — | Chỉ đọc tổng hợp/xuất CSV; không có bộ lọc hoặc JSON body cần request riêng. |
| role | — | 1 | — | Quản lý mẫu quyền bằng path/query; RoleUpdateRequest của tài khoản được chuyển về user. |
| sar | 6 | 7 | 1 | Request/response cho nhiệm vụ, AI và telemetry; AlertResult nội bộ. |
| settings | 1 | 1 | — | Request cập nhật cấu hình và response tương ứng; không cần record trung gian riêng. |
| station | 1 | 1 | — | Request quản lý trạm và response; không cần record trung gian riêng. |
| uav | 1 | 2 | — | Request quản lý UAV, response UAV/lịch sử; các thay đổi trạng thái giữ query contract hiện có. |
| user | 3 | 2 | 1 | UserQueryRequest và RoleUpdateRequest thuộc user; UserProfileUpdateCommand là record nội bộ. |
| webhook | 2 | 4 | 1 | Request/response tích hợp; QueueResult nội bộ. Payload linh hoạt giữ nguyên JSON phẳng. |

Tổng trong 18 module: **103 file DTO** (49 request, 46 response, 8 record nội bộ). `common/dto/response` có thêm 3 file; tổng toàn backend là **106 file DTO**. Record lồng trong response không được đếm thành file riêng.

## Cách duy trì

Khi bổ sung endpoint hoặc thao tác service, xác định module sở hữu trước. Chỉ tạo request/response/record nếu có dữ liệu và consumer cụ thể. HTTP query đơn giản, path variable, Authentication, Pageable, CSV và phản hồi không có body vẫn giữ kiểu transport phù hợp. Request record không truy cập repository hoặc thực hiện chuyển trạng thái.

`ArchitecturePackageTest`, `EntityDtoBoundaryTest` và `ModuleDtoStructureTest` kiểm tra vị trí package và vai trò DTO. `QueryDtoContractTest` bảo vệ giá trị query mặc định, phân trang, lọc và lỗi đầu vào. Bộ test đầy đủ vẫn phải chạy với PostgreSQL/MinIO thật và không có test bị bỏ qua.
