// Keep common Vietnamese UI phrases together; sentences can still wrap between phrases.
const vietnamesePhrases = [
    'hỗ trợ', 'cứu nạn',
    'nhiệm vụ', 'mục tiêu', 'kế hoạch', 'rõ ràng', 'khách hàng', 'điều phối',
    'dịch vụ', 'quy trình', 'vận hành', 'quản trị', 'đăng nhập', 'đăng ký',
    'yêu cầu', 'khảo sát', 'thu thập', 'dữ liệu', 'giải pháp', 'thông tin',
    'bảo trì', 'thanh toán', 'tài khoản', 'người dùng', 'tìm kiếm', 'truy cập',
    'phân quyền', 'hạn mức', 'cập nhật', 'thời gian', 'trạng thái', 'xác nhận', 'thực hiện',
    'ứng dụng', 'hình ảnh', 'chuẩn bị', 'công việc', 'theo dõi', 'thông báo',
    'kiểm tra', 'bắt đầu', 'bổ sung', 'hoàn tất', 'sửa chữa', 'thiết bị',
    'nguồn lực', 'báo cáo', 'chi phí', 'vật tư', 'hệ thống', 'cơ bản', 'định kỳ',
];
const phrasePattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${vietnamesePhrases.join('|')})(?![\\p{L}\\p{N}])`,
    'giu',
);

export function keepVietnamesePhrases(text: string): string {
    return text.replace(phrasePattern, phrase => phrase.replaceAll(' ', '\u00a0'));
}
