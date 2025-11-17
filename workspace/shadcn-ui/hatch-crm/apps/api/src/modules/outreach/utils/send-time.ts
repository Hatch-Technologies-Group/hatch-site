export function bestSendWindow(base: Date = new Date()): Date {
  const send = new Date(base);
  send.setHours(8, 0, 0, 0);
  if (send <= base) {
    send.setDate(send.getDate() + 1);
  }
  return send;
}
