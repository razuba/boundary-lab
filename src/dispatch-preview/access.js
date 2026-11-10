export function canViewPreview(request, previewSecret) {
  return request.headers['x-preview-secret'] == previewSecret;
}
