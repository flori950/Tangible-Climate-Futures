export function hashObj(obj: Record<string, unknown> | string) {
  const objStr = typeof obj == 'string' ? obj : JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < objStr.length; i++) {
    const code = objStr.charCodeAt(i);
    hash = (hash << 5) - hash + code;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
