# GOAL — UAV PAS: Table-First Enterprise UI + On-Demand 3D UAV

## 01. Vai trò và kết quả cần đạt

Bạn là Senior Frontend Architect và Product UI Lead có hơn 10 năm kinh nghiệm thiết kế hệ thống quản lý đội UAV, tài sản, kho và điều phối nhiệm vụ.

Hãy thiết kế lại và triển khai frontend UAV PAS hiện có theo hướng quản trị doanh nghiệp: nền sáng, bảng toàn chiều ngang, thao tác gọn, dữ liệu rõ, không có các đoạn description trang trí dưới tiêu đề. Tích hợp mô hình UAV 3D để kiểm tra trực quan khi người dùng chủ động mở.

Đây là nâng cấp giao diện của sản phẩm đang có, không phải tạo dashboard demo, dựng landing page hoặc viết lại hệ thống. Phải giữ các nghiệp vụ, dữ liệu, phân quyền và đường dẫn đang sử dụng.

Kết quả cần là giao diện đã tích hợp và được kiểm tra, không chỉ một bản phân tích hoặc ảnh mockup.

## 02. Nguồn tham khảo và ranh giới sử dụng

Tham khảo website https://anhchau.all1.vn và bốn ảnh chủ sản phẩm cung cấp:
- Screenshot 2026-10-07 at 14.07.34.png: bảng Lịch sử chấm công.
- Screenshot 2026-10-07 at 14.07.58.png: trang Bảng chấm công chi tiết.
- Screenshot 2026-10-07 at 14.08.12.png: bảng Vị trí công tác có nhóm dữ liệu.
- Screenshot 2026-10-07 at 14.08.23.png: cùng bảng và menu tài khoản.

Lấy ảnh thứ nhất và thứ ba làm chuẩn bố cục cho trang danh sách. Ảnh thứ hai chỉ tham khảo cho trang chi tiết; ảnh thứ tư tham khảo menu tài khoản.

Điểm cần học: nền trắng, bảng rộng, đường phân cách nhẹ, thanh công cụ ngắn, summary một dòng, nhãn trạng thái nhỏ, nhóm dữ liệu có tên và số lượng, phân trang cuối bảng.

Không sao chép logo, tên công ty, nghiệp vụ nhân sự, dữ liệu cá nhân hoặc toàn bộ màu thương hiệu Ánh Châu. Không dùng bản UAV mockup cũ có sidebar tối, nhiều KPI card và khung 3D thường trực làm chuẩn chính.

Ảnh tĩnh không chứng minh sticky header, sorting, grouping tương tác hoặc pagination hoạt động. Chỉ gọi một hành vi là “đã kiểm tra trên website” khi thực sự thao tác và có bằng chứng. Các kích thước ở phần sau là thiết kế đề xuất cho UAV PAS, không phải CSS đo từ Ánh Châu.

Nếu công cụ browser truy cập được đúng phiên đã đăng nhập, chỉ xem, lọc và mở nội dung cần thiết để tham khảo. Không tạo, sửa, xóa hoặc xuất dữ liệu thật trên website tham khảo. Nếu không truy cập được phiên, dùng các ảnh đã cung cấp; không lặp lại việc yêu cầu mật khẩu hay tuyên bố đã kiểm tra trực tiếp.

## 03. Kiểm tra repository trước khi thay đổi

Đọc hướng dẫn dự án, cấu trúc frontend, package.json, lockfile, routes, components, tokens, API client, query provider, permission checks và tests hiện tại.

Đọc PHASE_1_HANDOFF.md và báo cáo mới hơn nếu có. Handoff là ảnh chụp lịch sử, không phải cam kết rằng các gap vẫn còn ở HEAD hiện tại. Xác nhận branch, commit và working tree thực tế; không reset về commit trong báo cáo.

Lập bảng đối chiếu: màn hình → route → component → endpoint → trường dữ liệu → quyền → trạng thái triển khai. Đánh dấu IMPLEMENTED, PARTIAL, BACKEND_BLOCKED hoặc NOT_VERIFIED dựa trên kiểm tra thực tế.

Không đổi API prefix, permission code, kiểu ID, enum trạng thái, schema hoặc luồng authentication để khớp một ví dụ thiết kế. Không tách microservices, nâng major dependencies, đổi package manager, reset database, ghi đè thay đổi của người dùng, commit hoặc push nếu chưa được yêu cầu.

Thiếu API thì ghi rõ gap. Đề xuất thay đổi backend tối thiểu để chủ sản phẩm duyệt; không giả lập thành công hoặc tự mở rộng nghiệp vụ.

## 04. Phạm vi redesign

Bao phủ Dashboard, Users, Access Control, Stations, UAV Fleet, Inventory, Media, Audit và các trang Mission/Operations đã tồn tại.

Login, Register và Profile dùng cùng tokens, typography và controls nhưng giữ nguyên luồng xác thực.

Không thêm AI Detection, Search & Rescue, Payment, E-Learning hoặc Certificate. Không đưa menu tương lai, nút giả hoặc thống kê không có dữ liệu vào navigation chính.

Nếu hiện nhiều module nằm chung trong /operations, được tách thành các màn hình rõ ràng sau khi lập route map. Giữ tương thích đường dẫn cũ bằng chuyển hướng hợp lý hoặc entry page. Không phá URL của các trang Mission đã có.

## 05. Nguyên tắc hình thức bắt buộc

Table-first, light-first, title-first.

- Bảng chiếm chiều ngang khả dụng của vùng làm việc; không đặt trong container max-width kiểu landing page.
- Không mặc định có inspector hoặc mô hình 3D ở bên phải danh sách.
- Không xếp hàng loạt KPI card lớn trước mỗi bảng.
- Không card lồng card, gradient trang trí, glow, glassmorphism hoặc hiệu ứng giả trung tâm quân sự.
- Không banner marketing, slogan, lời chào lớn, biểu đồ lấp chỗ trống.
- Tiêu đề trang không có paragraph mô tả phía dưới.
- Vẫn giữ nhãn trường, đơn vị, validation, giải thích trạng thái lỗi và cảnh báo thao tác quan trọng. “Không description” không có nghĩa xóa thông tin cần để thao tác đúng.
- Một bộ icon dạng nét, cùng kích thước và độ dày. Không trộn emoji với icon nghiệp vụ.
- Giữ ngôn ngữ và cơ chế i18n hiện có; không trộn ngôn ngữ trong cùng một màn hình.

## 06. Application shell

Sidebar nền sáng, có logo UAV PAS và nhóm chức năng gọn. Mục đang chọn có nền nhấn nhẹ; không biến mẫu quyền thành cây cấp bậc tổ chức.

Header hệ thống ngắn: điều hướng, tìm kiếm chung nếu đã hoạt động, tài khoản. Chỉ giữ bộ chọn tổ chức/trạm, đồng hồ hoặc thông báo nếu phục vụ chức năng thực tế. Không nhân đôi thông tin giữa header và sidebar.

Trang danh sách theo thứ tự:
1. Tiêu đề/context và thao tác chính.
2. Thanh tìm kiếm, filter và tùy chọn bảng.
3. Summary một dòng khi có dữ liệu hợp lệ.
4. Table header và table body.
5. Pagination.

Breadcrumb chỉ dùng khi hữu ích; tránh ba hàng riêng lặp lại cùng tiêu đề. Nội dung đầu trang phải đủ gọn để bảng xuất hiện sớm.

Thiết kế scroll rõ: không để body, wrapper và table cùng tạo ba thanh cuộn lồng nhau. Trang danh sách có một vùng cuộn dữ liệu chính; drawer có thể cuộn riêng. Pagination không che hàng cuối. Ít dữ liệu thì giữ chiều cao hàng bình thường, không kéo giãn hàng để lấp màn hình.

## 07. Tokens và typography đề xuất

Ưu tiên tokens hiện có; chuẩn hóa thay vì thêm giá trị rời rạc:
- Page title: 22–24px, semibold.
- Section/group title: 13–14px, semibold.
- Table header: 13px, semibold.
- Table body và form text: 14px, line-height khoảng 20px.
- Metadata/badge: 12–13px; không dùng chữ siêu nhỏ để nhét thêm cột.
- Hàng mặc định: 48px; chế độ compact: 40px, do người dùng chọn.
- Control/toolbar button: cao 36–40px.
- Cell padding ngang: 12–16px.
- Content padding: 16–24px; nhịp spacing theo bước 4/8px.
- Sidebar mở: khoảng 240–264px; có chế độ thu gọn.
- Header chính: khoảng 56–64px.
- Border mảnh; shadow chỉ dùng nhẹ cho lớp nổi; không tạo bóng cho mọi hàng.

Dùng nền trắng và các sắc xám trung tính. Giữ màu primary của UAV PAS; không tự đổi thành xanh lá hoặc xanh cyan. Status dùng màu ngữ nghĩa, kèm chữ/icon, không chỉ màu.

Tên và nội dung căn trái; số lượng căn phải; đơn vị hiển thị rõ. Dùng tabular numerals cho số, ngày giờ khi phù hợp, không dùng monospace cho cả ứng dụng.

Đây là điểm xuất phát để hiệu chỉnh qua screenshot, không phải lý do áp dụng máy móc bất chấp layout hoặc accessibility.

## 08. Enterprise DataTable dùng chung

Tạo hoặc refactor thành bộ bảng tái sử dụng, dùng thư viện hiện có và TanStack Table theo chuẩn dự án.

Bắt buộc có:
- Danh sách, định danh rõ, trạng thái và row action.
- Search, filter, sort và pagination khi contract hỗ trợ.
- Header nhẹ; phân cách hàng mảnh; hover tinh tế.
- Trạng thái selected khác hover và keyboard focus.
- Column visibility; mật độ standard/compact.
- Loading, empty, no-results, error và forbidden riêng biệt.
- Refresh không xóa dữ liệu hiện có để nháy trắng cả bảng.
- Sticky header trong đúng vùng scroll; cột định danh/thao tác chỉ pin khi cần và không chồng lấn.

Checkbox chọn dòng chỉ hiện khi có nghiệp vụ chọn thực sự. “Chọn tất cả” mặc định nghĩa là trang hiện tại, trừ khi đã có cơ chế chọn toàn bộ kết quả rõ ràng. Đổi filter phải xác định cách reset selection; không giữ chọn ẩn ngoài ngữ cảnh.

Bulk actions, export và print là tùy chọn: chỉ hiện khi hoạt động thật và đúng quyền. Không dùng chúng làm nút trang trí.

Bấm định danh để mở chi tiết. Row actions/checkbox không đồng thời kích hoạt mở dòng. Icon-only button phải có tên truy cập; chức năng quan trọng không chỉ tồn tại trong hover hoặc tooltip.

Không cắt thông tin định danh quan trọng mà không có cách xem đầy đủ. Cột dài có thể ellipsis với cách mở xem bằng chuột và bàn phím. Dữ liệu thiếu hiển thị “—”, không tự chuyển thành 0 hoặc trạng thái tốt.

## 09. Filter, grouping và tổng số phải đúng dữ liệu

Search/filter/sort/page phải có mô hình nhất quán với backend. Lưu trạng thái phù hợp vào URL, không đưa token hoặc dữ liệu nhạy cảm vào URL.

Reset về trang đầu khi đổi filter; xử lý hợp lý khi trang hiện tại không còn dữ liệu. Chuẩn hóa filter trước khi tạo request/query key.

Nếu server phân trang, không sort/filter riêng trang hiện tại rồi trình bày như toàn bộ dữ liệu. Client-side processing chỉ dùng khi đã tải trọn bộ dữ liệu phù hợp và đã kiểm tra giới hạn.

Grouping tùy chọn:
- UAV: theo trạm/trạng thái.
- Inventory: theo trạm/loại thiết bị.
- Mission: theo trạng thái/ngày/trạm.
- Audit: theo ngày/module.

Group header có tên, count và expand/collapse bằng bàn phím. Trạng thái thu gọn phải được giữ hợp lý khi refetch.

Phân biệt count toàn bộ kết quả với count nhóm trên trang. Không tính tổng nhóm từ một trang rồi gắn nhãn tổng hệ thống. Nếu API chưa hỗ trợ grouping toàn bộ, ghi “Nhóm trong trang này” hoặc chưa mở chức năng đó.

Summary phải nói rõ phạm vi: toàn bộ, kết quả đang lọc hay trang hiện tại. Không dùng số hàng tải về để giả làm tổng tài nguyên. Không cộng tồn theo nhiều đơn vị thành một chỉ số không có ý nghĩa.

## 10. UAV Fleet — màn hình làm chuẩn đầu tiên

Trang gồm tiêu đề Đội UAV, nút thêm theo quyền, toolbar, summary gọn và bảng toàn chiều ngang.

Các cột đề xuất: định danh UAV, model, serial, trạm, trạng thái, bảo trì gần nhất nếu có, thao tác. Dùng đúng trường API; không tự tạo mã nghiệp vụ từ ID để trông đẹp hơn.

Không thêm live battery, GPS, tín hiệu, giờ bay hoặc sức khỏe phần cứng nếu không có nguồn dữ liệu. Không gọi dữ liệu cập nhật thủ công là realtime.

Mỗi dòng có liên kết chi tiết và menu thao tác. “Xem 3D” là thao tác phụ có chủ đích. Chỉ hiển thị gán trạm, bảo trì, đổi trạng thái hoặc gán nhiệm vụ khi contract, trạng thái và quyền cho phép.

Những action bị chặn vì điều kiện nghiệp vụ cần thông tin ngắn giải thích; không dùng disabled button không rõ lý do. Trạng thái không được sửa tùy ý bằng một dropdown bỏ qua workflow backend.

Hoàn thiện trang này làm mẫu trước khi nhân rộng.

## 11. 3D UAV — tải khi cần, không chiếm bảng mặc định

Chỉ dùng 3D trong UAV Quick View hoặc UAV Detail. Không có canvas trên từng dòng, không tải model khi chỉ mở danh sách, không có 3D hero thường trực trên Dashboard.

Xem nhanh mở drawer/inspector theo yêu cầu. Trên desktop dùng khoảng 480–640px tùy nội dung; trên màn hình nhỏ chuyển sang sheet phù hợp. Không ép bảng còn lại thành một dải khó đọc.

Viewer hỗ trợ rotate, zoom và reset camera, có nhãn/nút truy cập rõ. Mặc định tắt auto-rotate. Khung có tỷ lệ ổn định, không nhảy layout lúc tải.

Ưu tiên model GLB/glTF đã có và được phép sử dụng. Ghi nguồn, license, model nào được áp dụng. Không tự lấy tài sản không rõ quyền sử dụng.

Nếu không có model đúng UAV: dùng preview 2D hoặc model chung ghi rõ “Mô hình minh họa”. Không tuyên bố model minh họa là digital twin đúng thiết bị. Không dựng điểm nóng linh kiện hoặc trạng thái cảm biến giả.

Dùng viewer/stack 3D hiện có; chỉ thêm thư viện sau khi kiểm tra tương thích và tác động bundle. Client-only/lazy loading theo đúng framework đang dùng. Mô hình phải tách khỏi đường tải quan trọng của bảng.

Dừng render khi đóng/ẩn; giới hạn tài nguyên và giải phóng đúng vòng đời. Mục tiêu ban đầu: model được tối ưu khoảng 5 MB hoặc thấp hơn; đo thực tế và ghi ngoại lệ, không âm thầm giảm chất lượng đến mức không dùng được.

Kiểm tra no-WebGL, tải lỗi, mất context và mạng chậm. Khi 3D lỗi, dữ liệu và hành động quản lý vẫn hoạt động. Không hứa FPS hoặc thời gian tải khi chưa đo.

Tương tác 3D chỉ để quan sát/chọn thông tin. Không điều khiển bay thật hoặc kích hoạt thao tác nghiệp vụ nguy hiểm bằng click lên mô hình.

## 12. Chi tiết, drawer và form

Create/Edit đơn giản dùng drawer/modal; workflow Mission dài có thể giữ page riêng. Không bắt mọi thao tác thành một route mới.

Mở/đóng drawer không làm mất filter, trang, group state hoặc vị trí cuộn. Khi đóng, trả focus về control đã mở. Escape và Back phải có hành vi rõ; form bẩn có cảnh báo trước khi bỏ dữ liệu.

Dùng form patterns thống nhất: nhãn, bắt buộc, đơn vị, validation tại trường, lỗi server và nút đang xử lý. Không hiển thị thành công trước phản hồi hợp lệ.

Không tự đổi stock, permission hoặc Mission state bằng optimistic update nếu có thể gây hiểu nhầm; ưu tiên hiển thị pending và dữ liệu backend xác nhận.

Hành động quan trọng chỉ cần một xác nhận rõ đối tượng, số lượng/tác động và lý do khi nghiệp vụ yêu cầu. Không xác nhận nhiều lần cho thao tác đọc thông thường.

## 13. Áp dụng cho các module khác

Users: bảng tài khoản, trạng thái, mẫu quyền và thao tác; profile riêng không cần quyền quản lý tất cả user.

Stations: bảng mã/tên, địa chỉ, trạng thái; count UAV/thiết bị chỉ khi có nguồn. Chi tiết dùng tabs Thông tin, UAV, Thiết bị, Hoạt động theo quyền. Bản đồ là tùy chọn, không tự thêm nhà cung cấp trả phí.

Inventory: bảng thiết bị, loại, serial khi có, trạm, tổng/khả dụng/giữ chỗ. Form nhập, xuất, reserve, release, transfer phải cho nhập số lượng; không giữ nút mặc định +1 như một chức năng hoàn chỉnh. Không đồng nhất hủy reservation với hoàn trả vật lý. Không diễn giải optional serial thành một mô hình serialized đã hoàn chỉnh nếu backend chưa hỗ trợ.

Mission: tái sử dụng list/create/detail/operator/admin hiện có. Chuẩn hóa bảng và form, giữ ownership, trạng thái, kiểm tra lịch và điều kiện thao tác. Media/Timeline/Resources là tab hoặc vùng chi tiết. Không tạo một bộ lifecycle mới chỉ để phục vụ UI.

Media: table mặc định với tên, loại, dung lượng, liên kết và trạng thái khi có. Preview/upload/download/delete phải theo API và quyền thực tế. Không gắn nút xóa hoặc upload-confirm giả khi thiếu endpoint; đánh dấu gap.

Audit: bảng thời gian, actor, module/action, đối tượng; xem chi tiết read-only. Chỉ trình bày before/after khi dữ liệu thực sự có, không suy diễn từ chuỗi log. Không thêm nút chỉnh sửa hoặc xóa lịch sử.

Dashboard: ưu tiên summary ngắn và các bảng vận hành đủ rộng. Không sao chép nguyên hàng KPI card từ ảnh chi tiết. Biểu đồ chỉ thêm khi trả lời câu hỏi nghiệp vụ cụ thể. Không tạo metric, recent activity hoặc chức năng cảnh báo giả.

## 14. Access Control dạng checkbox

Tài khoản → mẫu quyền → quyền hiệu lực và tùy chỉnh riêng. Không tạo cây Super Admin/Manager/Staff bắt buộc.

Bảng quyền nhóm theo module, nhưng chỉ tạo checkbox cho permission code backend thực sự có. Nếu backend chỉ có MANAGE, không giả vờ tách được Create/Update/Transfer độc lập bằng frontend.

Phân biệt:
- Quyền hiệu lực hiện tại.
- Nguồn từ template.
- Override ALLOW/DENY.
- Thao tác “Dùng lại mẫu” nếu backend hỗ trợ xóa override.

DENY không đồng nghĩa xóa override. Checkbox nhóm dùng trạng thái indeterminate khi chỉ chọn một phần. Các quyền quản lý truy cập nhạy cảm không được bật âm thầm bằng thao tác chọn tất cả.

Có trạng thái chưa lưu, xem thay đổi, lưu và hủy chỉnh sửa cục bộ. Nếu API lưu từng quyền và có lỗi giữa chừng, báo rõ phần đã lưu/chưa lưu rồi tải lại trạng thái thực tế; không tuyên bố toàn bộ batch atomic hoặc rollback thành công khi không có hỗ trợ.

Không tự thêm quyền cho người đang đăng nhập để demo. UI không thay thế kiểm tra backend hoặc giới hạn phạm vi tài nguyên.

## 15. TanStack Query và kiến trúc dữ liệu frontend

Đọc version và cấu trúc thực tế trước khi sửa. Dùng TanStack Query cho client-side server state; fetch/Axios vẫn được dùng trong HTTP client. Không viết useEffect + fetch + bản sao data vào state ở mỗi trang.

Server Components/prefetch/hydration đang dùng hợp lý được giữ lại; yêu cầu này không cấm server-side data fetching. Không tạo QueryClient dùng chung dữ liệu riêng giữa các server request/người dùng.

Mỗi feature có API functions, types, query keys, queries, mutations và UI. Không sao chép dữ liệu API từ Query vào Zustand. Local state dành cho drawer, selection, form draft và UI preferences phù hợp.

Query keys phải phản ánh filters, page, sort và phạm vi dữ liệu. Không chứa secrets. Dữ liệu riêng phải được tách hoặc xóa đúng khi đổi tài khoản/phạm vi.

Mutation thành công cập nhật hoặc invalidate đúng dữ liệu:
- Sửa UAV: list/detail, trạm hoặc dashboard liên quan.
- Thao tác kho: stock, movements, reservations/Mission liên quan nếu có.
- Thay quyền: user permissions; session hiện tại nếu bị ảnh hưởng.
- Media: thư viện và resource attachment liên quan.
- Mission: detail/list/timeline và tài nguyên bị thay đổi.

Không invalidate toàn bộ ứng dụng theo thói quen. Không xem invalidation ở một browser là cơ chế realtime cập nhật mọi phiên người dùng khác.

Tái sử dụng luồng refresh hiện tại. Hủy request cũ và dọn dữ liệu riêng khi logout/chuyển tài khoản; kiểm tra request trả về muộn không làm xuất hiện dữ liệu người trước. Không lưu signed URL/token vào persistent query cache hoặc bằng chứng kiểm thử.

Retry theo loại lỗi; không retry tự động vô điều kiện với mutation không idempotent. Xử lý 401, 403, 409, validation và lỗi mạng riêng. Quyền chưa xác định không được mặc định là cho phép; query disabled không có nghĩa xóa dữ liệu cache đã tồn tại.

## 16. Reusable components

Ưu tiên refactor/thêm vào bộ component đã có. Các tên dưới đây là gợi ý, không buộc đổi tên hàng loạt:
AppShell, PageHeader, DataTable, TableToolbar, InlineSummary,
StatusBadge, RowActions, GroupHeader, TablePagination,
DetailDrawer, ConfirmActionDialog, MediaPreview,
UavModelViewer, PermissionMatrix, QueryState.

Không xây một component bảng khổng lồ chứa mọi nghiệp vụ. Tách table primitives khỏi cấu hình cột, quyền và action của từng feature. Không dùng một “config engine” phức tạp cho những màn hình cần logic khác nhau.

Một style token, một status mapping có kiểm soát, một icon system. Không ghi đè CSS toàn cục làm hỏng login, Mission hoặc thư viện component.

## 17. Responsive và bàn phím

Kiểm tra tối thiểu: 1366×768, 1440×900, 1920×1080, 1024×768, 390×844.

Desktop ưu tiên bảng rộng. Mục tiêu ở 1366×768 khi inspector đóng: nhìn được khoảng 8–10 hàng thông thường nếu nội dung cho phép; không giảm font để đạt chỉ tiêu.

Tablet/mobile thu sidebar; toolbar wrap có chủ đích; bảng nhiều cột cuộn trong container hoặc chuyển sang danh sách gọn vẫn giữ đủ định danh và hành động. Không gây overflow ngang toàn trang.

Ở zoom 200%, chức năng và thông tin quan trọng vẫn tiếp cận được. Focus rõ; labels không chỉ dựa vào placeholder; sorting và expand/collapse có trạng thái truy cập phù hợp. Không thêm ARIA grid nếu chưa có đầy đủ hành vi bàn phím tương ứng.

Không chỉ dùng màu để truyền đạt trạng thái. Test contrast và keyboard thực tế; không tuyên bố đạt chuẩn accessibility chỉ bằng nhìn screenshot.

## 18. Trình tự triển khai và checkpoint

Mốc A — Discovery: route/data/permission matrix, baseline screenshots và kết quả build/test hiện tại. Ghi rõ thứ nào chưa chạy được.

Mốc B — Design spec và implementation plan: ghi tokens, shell, scroll model, DataTable, 3D strategy, route compatibility và gaps. Trình duyệt theo workflow dự án trước thay đổi kiến trúc lớn.

Mốc C — Vertical slice UAV: triển khai shell + bảng UAV + một form thực + chi tiết/xem nhanh 3D hoặc fallback. Kết nối API thật trong local/test, có kiểm thử. Chụp desktop/tablet và đưa một checkpoint review trước khi nhân rộng các module.

Mốc D — Rollout: áp dụng mẫu đã duyệt cho Station, Inventory, Users/Permissions, Mission, Media, Audit và Dashboard. Mỗi module có checklist riêng; không coi đổi màu CSS là hoàn thành.

Mốc E — Regression và handoff: kiểm tra lại các luồng, capture bằng chứng và ghi phần bị chặn. Không bỏ qua bug nghiêm trọng để báo hoàn thành.

Không hỏi lại những quyết định đã có trong brief. Chỉ hỏi khi thiếu asset bắt buộc, quyền truy cập, contract hoặc có thay đổi ảnh hưởng nghiệp vụ. Không chạy lại vòng tìm phong cách khác; hướng table-first này đã được chọn.

## 19. Kiểm thử bắt buộc

Phân biệt component tests có fixture/mock với E2E chạy backend thật. Dữ liệu demo chỉ ở môi trường test/story, không thay response API của sản phẩm.

A. Visual
- Đối chiếu ảnh tham khảo và before/after trên cùng viewport.
- Không còn description trang trí, card lồng card hoặc inspector mặc định.
- Font, spacing, icon, status và các toolbar thống nhất.
- Không clipping, sticky overlap, popup bị cắt, pagination che nội dung.

B. Table interactions
- Search/filter/sort/pagination, zero/one/many rows, đổi page size.
- Grouping có count đúng phạm vi; chọn nhóm không gây hiểu nhầm tổng.
- Click row action không mở nhầm detail.
- Mở/đóng drawer và Back giữ state đã cam kết.

C. Business integration
- Tạo/sửa UAV và trạm khi có quyền; từ chối khi thiếu quyền.
- Form kho nhập số lượng hợp lệ và xử lý conflict từ backend.
- Permission save phản ánh đúng kết quả thật, bao gồm partial failure.
- Regression các luồng Mission hiện có.
- Media thao tác đúng quyền; lỗi không được biến thành success toast.

D. Cache/session
- Mutation cập nhật đúng vùng dữ liệu, không reload toàn trang.
- Refresh lỗi, quyền thay đổi, logout, đổi tài khoản, request trả về muộn.
- Không hiển thị cache của user trước cho user sau.

E. 3D
- Chỉ tải khi mở; rotate/zoom/reset thực sự hoạt động.
- Không tải đồng loạt model cho các hàng.
- Mở/đóng nhiều lần không tăng canvas/listener không kiểm soát.
- Model lỗi, no-WebGL và fallback không chặn quản lý.
- Test mock canvas không được báo là đã kiểm tra WebGL thật.

F. Technical
- Chạy scripts lint/type-check/build/tests thực tế của repository.
- Kiểm tra console và failed network requests trong browser.
- Backend regression khi đổi code backend đã được duyệt.
- Ghi môi trường, command, exit code, số pass/fail/skipped và artifact path.
- Thiếu browser/backend/storage thì ghi NOT_VERIFIED; không dùng HTTP 200 hoặc build pass thay cho E2E.

## 20. Deliverables và Definition of Done

Tạo tài liệu tại vị trí phù hợp với cấu trúc repo, đề xuất:
- docs/ui/UAV_PAS_TABLE_FIRST_DESIGN.md
- docs/ui/UAV_PAS_UI_IMPLEMENTATION_PLAN.md
- docs/handoff/UAV_PAS_UI_REDESIGN_REPORT.md
- docs/handoff/ui-evidence/ cho screenshots và logs đã loại dữ liệu nhạy cảm.

Bàn giao có:
- Route/component/file đã thay đổi; chức năng giữ lại.
- Design tokens và quy tắc dùng bảng/drawer/3D.
- API/permission mapping, gaps và những phần chưa được triển khai.
- Nguồn/license của model, số liệu tải và kiểm tra thực tế.
- Before/after và kết quả test có thể truy vết.
- Trạng thái từng module: VERIFIED, PARTIAL, BLOCKED hoặc NOT_VERIFIED.

Chỉ kết luận hoàn tất khi giao diện table-first được áp dụng trong phạm vi đã duyệt, thao tác hoạt động với backend, không phá luồng cũ, dữ liệu/quyền đúng, trạng thái UI đầy đủ và các kiểm tra bắt buộc có bằng chứng. Backend gap còn chặn chức năng phải được báo rõ, không bị che bằng giao diện đẹp.

TIÊU CHÍ CỐT LÕI
Bảng quản trị sáng, rộng, gọn theo tinh thần ảnh Ánh Châu; dữ liệu và thao tác quan trọng hơn trang trí. UAV 3D chỉ xuất hiện khi cần. Giao diện phải là một hệ thống đang làm việc được, không phải một ảnh dashboard đẹp.
