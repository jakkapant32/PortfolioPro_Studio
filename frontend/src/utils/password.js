export function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
  }
  return '';
}
