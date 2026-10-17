export const solutionDetails: Record<string, { useCase: string; workflow: string; limitation: string }> = {
  'uav-rental': {
    useCase: 'Chuẩn bị nhiệm vụ cần thiết bị UAV, người điều khiển và khoảng thời gian hoạt động cụ thể.',
    workflow: 'Gửi bản nháp với địa điểm và thời gian. Đội vận hành xem xét yêu cầu trước khi phân bổ nguồn lực và xác nhận khả năng triển khai.',
    limitation: 'Phần mềm hỗ trợ loại yêu cầu này. Thiết bị sẵn có và quyền bay cần được xác nhận riêng.',
  },
  'aerial-inspection': {
    useCase: 'Cung cấp góc nhìn từ trên cao về khu vực hoặc công trình cụ thể để xem xét, không cam kết kết quả kiểm tra tự động.',
    workflow: 'Mô tả phạm vi kiểm tra, gửi nhiệm vụ để xem xét và theo dõi hình ảnh khi đội vận hành chia sẻ.',
    limitation: 'Việc ghi hình không thay thế kiểm tra chuyên môn, đánh giá kỹ thuật hay giấy phép cần thiết.',
  },
  'ai-detection': {
    useCase: 'Trong tương lai, công cụ hỗ trợ có thể giúp người dùng xem xét các dấu hiệu cần chú ý trong hình ảnh nhiệm vụ.',
    workflow: 'Mới ở giai đoạn dự kiến: khách hàng chưa thể sử dụng quy trình xử lý ảnh và xem xét kết quả. Mọi kết quả trong tương lai đều cần con người xác minh.',
    limitation: 'Hiện chưa có cam kết về độ chính xác phát hiện, khả năng tự ra quyết định hay dịch vụ xử lý. Chưa thể đặt dịch vụ này.',
  },
  'search-and-rescue': {
    useCase: 'Ứng dụng trong tương lai có thể hỗ trợ các đội được cấp phép xem xét hình ảnh từ trên cao trong quá trình tìm kiếm.',
    workflow: 'Mới ở giai đoạn dự kiến: đội ứng phó được cấp phép sẽ xác định phạm vi tìm kiếm và xem xét thông tin quan sát. UAV PAS hiện chưa cung cấp quy trình điều phối khẩn cấp.',
    limitation: 'Đây không phải dịch vụ khẩn cấp. Khi cần trợ giúp khẩn cấp, hãy liên hệ cơ quan cứu hộ phù hợp tại địa phương. Một dấu hiệu phát hiện chưa đồng nghĩa với kết quả cứu nạn đã được xác nhận.',
  },
};
