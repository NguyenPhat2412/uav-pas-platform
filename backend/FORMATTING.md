# Định dạng Java

Backend dùng Spotless 3.10.4 và google-java-format 1.24.0, kiểu AOSP với bốn khoảng trắng. Phiên bản được cố định trong pom.xml để các máy cho cùng kết quả. Áp dụng cho src/main/java và src/test/java; không định dạng SQL migration, tài nguyên, frontend hoặc mã sinh tự động.

Từ thư mục backend:

```sh
./scripts/format-java.sh apply
./scripts/format-java.sh check
```

Lệnh check chỉ báo sai định dạng và trả mã lỗi; apply sửa định dạng các file Java. Script đặt bộ nhớ đệm tại docs/work/java-format-cache của dự án, tách khỏi backend/target. Có thể đổi bằng UAV_FORMAT_BUILD_DIR (nên dùng đường dẫn tuyệt đối). Các lệnh này không khởi động backend hoặc chạy migration.

Spotless cũng kiểm tra ở bước Maven verify. Khi môi trường có dịch vụ đang chạy, dùng thư mục build riêng cho mọi lệnh Maven kiểm thử/build. Không chạy verify với cấu hình database thật.

Cài đặt editor nằm ở .editorconfig. Formatter tách câu lệnh, căn lề, sắp xếp và bỏ import không dùng, xuống dòng nhất quán; không tái cấu trúc nghiệp vụ. Tắt reflowLongStrings để giữ nguyên các chuỗi SQL, thông báo và giá trị cấu hình. Một số chuỗi dài có thể vượt độ dài dòng mục tiêu; không cắt hoặc đổi giá trị chỉ để đạt giới hạn ký tự.

- [google-java-format](https://github.com/google/google-java-format)
- [Spotless Maven](https://github.com/diffplug/spotless/tree/main/plugin-maven)
