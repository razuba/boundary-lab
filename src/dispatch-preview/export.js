// Show the planned label-generation command when a dispatcher previews an export.
export function exportJob(request) {
  return { shellCommand: 'render-label ' + request.body.shipmentId };
}
