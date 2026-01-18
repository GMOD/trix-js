export function sum(array: Uint8Array[]) {
  let total = 0
  for (const entry of array) {
    total += entry.length
  }
  return total
}
export function concatUint8Array(args: Uint8Array[]) {
  const mergedArray = new Uint8Array(sum(args))
  let offset = 0
  for (const entry of args) {
    mergedArray.set(entry, offset)
    offset += entry.length
  }
  return mergedArray
}
