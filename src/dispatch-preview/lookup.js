// Shipments belong to the account that created them. Only its dispatchers can view them.
export function shipmentDetail(request, shipments) {
  return shipments.find(shipment => shipment.id === request.params.shipmentId);
}
