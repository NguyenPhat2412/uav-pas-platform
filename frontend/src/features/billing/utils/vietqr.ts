/**
 * UAV PAS - VietQR EMVCo Payload Specification Generator
 * Thuật toán sinh chuỗi thanh toán QR chuẩn NAPAS / Ngân hàng Nhà nước Việt Nam
 * Tiêu chuẩn kỹ thuật EMVCo QR Code Specification for Payment Systems (Merchant-Presented QR)
 */

function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Thuật toán tính mã kiểm tra CRC-16 / CCITT-FALSE (Đa thức 0x1021, Init 0xFFFF)
 */
export function calculateCrc16Ccitt(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    const b = str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      const bit = ((b >> (7 - j)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 !== bit) {
        crc ^= polynomial;
      }
    }
  }

  crc &= 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface VietQrOptions {
  bankBin: string; // VD: 970422 (MB Bank), 970415 (VietinBank), 970436 (Vietcombank)
  accountNumber: string;
  amount: number;
  memo: string;
}

/**
 * Sinh chuỗi payload EMVCo hợp lệ để vẽ mã QR VietQR NAPAS
 */
export function generateVietQrPayload(options: VietQrOptions): string {
  const { bankBin, accountNumber, amount, memo } = options;

  // Tag 00: Payload Format Indicator (01)
  const tag00 = formatTlv('00', '01');

  // Tag 01: Point of Initiation Method (12: Dynamic QR code with specific amount)
  const tag01 = formatTlv('01', '12');

  // Tag 38: Merchant Account Information - NAPAS Consumer Account Info
  // Sub-tag 00: GUID NAPAS 'A000000727'
  const sub00 = formatTlv('00', 'A000000727');
  // Sub-tag 01: Beneficiary Bank (BIN + Account)
  const beneficiaryInfo = formatTlv('00', bankBin) + formatTlv('01', accountNumber);
  const sub01 = formatTlv('01', beneficiaryInfo);
  // Sub-tag 02: Service code QRIBFTTA (Chuyển nhanh Napas 247 tới tài khoản)
  const sub02 = formatTlv('02', 'QRIBFTTA');
  const tag38 = formatTlv('38', sub00 + sub01 + sub02);

  // Tag 53: Transaction Currency (704 = VND)
  const tag53 = formatTlv('53', '704');

  // Tag 54: Transaction Amount
  const tag54 = formatTlv('54', Math.round(amount).toString());

  // Tag 58: Country Code
  const tag58 = formatTlv('58', 'VN');

  // Tag 62: Additional Data Field (Sub-tag 08: Purpose of Transaction / Memo)
  const sanitizedMemo = memo.slice(0, 25).replace(/[^a-zA-Z0-9 ]/g, '');
  const sub62_08 = formatTlv('08', sanitizedMemo);
  const tag62 = formatTlv('62', sub62_08);

  // Ghép chuỗi chuẩn bị tính checksum (Tag 63: CRC)
  const partialPayload = `${tag00}${tag01}${tag38}${tag53}${tag54}${tag58}${tag62}6304`;
  const checksum = calculateCrc16Ccitt(partialPayload);

  return `${partialPayload}${checksum}`;
}
