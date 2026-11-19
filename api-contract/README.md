# Hợp đồng API

| Tệp | Nội dung |
|---|---|
| `openapi.json` | Đặc tả OpenAPI của backend (xuất từ `/v3/api-docs`) |
| `postman_collection.json` | Bộ request và test Postman, sinh từ `openapi.json` |
| `generate_postman_collection.py` | Sinh lại `postman_collection.json` từ `openapi.json` |

Sinh lại collection sau khi cập nhật `openapi.json`:

```sh
python3 api-contract/generate_postman_collection.py
```

CI chạy collection trong `.github/workflows/postman-api-tests.yml`. Token không được lưu trong tệp; test lấy token bằng request đăng nhập.
