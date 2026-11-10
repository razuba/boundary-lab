// Dispatch documents are stored beneath the manifest root.
export function manifestLocation(request) {
  return { path: 'manifests/' + request.params.document };
}
