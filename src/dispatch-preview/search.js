// The preview shows the statement that would be submitted to the reporting database.
export function destinationSearch(request) {
  return {
    statement: "SELECT id FROM shipments WHERE destination = '" + request.query.destination + "'",
    parameters: [],
  };
}
