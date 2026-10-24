export const serviceDetails: Record<string, { audience: string; example: string; output: string }> = {
    'uav-rental': {
        audience: 'Các đơn vị cần thực hiện nhiệm vụ UAV trong khoảng thời gian cụ thể và cần đội vận hành xem xét yêu cầu về thiết bị, người điều khiển.',
        example: 'Mô tả khu vực hoạt động, thời gian mong muốn và công việc cần thực hiện. Đội vận hành phải xác nhận nguồn lực phù hợp trước khi triển khai nhiệm vụ.',
        output: 'Yêu cầu nhiệm vụ được xem xét và cập nhật trạng thái. Trang này không bảo đảm thiết bị sẵn có, giấy phép hoặc điều khoản thương mại.',
    },
    'aerial-inspection': {
        audience: 'Các đơn vị cần quan sát một khu vực hoặc công trình cụ thể từ trên cao.',
        example: 'Cung cấp khu vực kiểm tra và nội dung cần quan sát. Đính kèm hoặc mô tả thông tin để đội vận hành đánh giá yêu cầu.',
        output: 'Thông tin quan sát hoặc hình ảnh gắn với nhiệm vụ khi đội vận hành cung cấp. Dịch vụ không cam kết chẩn đoán tự động hay chứng nhận kỹ thuật.',
    },
    'aerial-recording': {
        audience: 'Khách hàng cần chụp ảnh hoặc quay video từ trên cao.',
        example: 'Mô tả đối tượng, địa điểm, thời gian mong muốn và mục đích sử dụng hình ảnh để đội vận hành xem xét yêu cầu ghi hình.',
        output: 'Hình ảnh, video của nhiệm vụ sau khi được ghi lại và chia sẻ. Độ phân giải, dịch vụ biên tập và thời hạn bàn giao cần được xác nhận riêng.',
    },
    'data-collection': {
        audience: 'Các đơn vị cần thu thập dữ liệu nhiệm vụ để phân tích sau đó.',
        example: 'Mô tả khu vực, nội dung cần quan sát, định dạng đầu ra mong muốn và các ràng buộc thu thập. Đội vận hành xem xét yêu cầu trước khi phân bổ nguồn lực.',
        output: 'Dữ liệu hoặc hình ảnh gắn với nhiệm vụ khi được cung cấp. Dịch vụ không mặc nhiên bảo đảm độ chính xác cảm biến, chứng nhận khảo sát hay kết quả xử lý.',
    },
};
