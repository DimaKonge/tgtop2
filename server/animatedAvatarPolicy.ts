export const MAX_ANIMATED_AVATAR_BYTES = 5 * 1024 * 1024;

export function validateAnimatedAvatarUpload(contentType: string, bytes: Buffer) {
  if (contentType !== "video/mp4") {
    throw new Error("Для анимированного аватара нужен файл MP4");
  }
  if (!bytes.length || bytes.length > MAX_ANIMATED_AVATAR_BYTES) {
    throw new Error("Размер анимированного аватара должен быть не больше 5 МБ");
  }
  if (bytes.length < 12 || bytes.subarray(4, 8).toString("ascii") !== "ftyp") {
    throw new Error("Файл не похож на корректное MP4-видео");
  }
}
