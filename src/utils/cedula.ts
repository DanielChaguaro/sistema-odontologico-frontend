/**
 * Cédula ecuatoriana (módulo 10). Misma regla que el backend (EcuadorianId): se valida aquí
 * solo para avisar antes de enviar; el backend sigue siendo quien decide.
 */
const COEFFICIENTS = [2, 1, 2, 1, 2, 1, 2, 1, 2]

export function isValidCedula(value: string | null | undefined): boolean {
  if (!value || !/^\d{10}$/.test(value)) return false
  const province = Number(value.slice(0, 2))
  if ((province < 1 || province > 24) && province !== 30) return false
  if (Number(value[2]) >= 6) return false
  const sum = COEFFICIENTS.reduce((acc, coefficient, i) => {
    const product = Number(value[i]) * coefficient
    return acc + (product >= 10 ? product - 9 : product)
  }, 0)
  return (10 - (sum % 10)) % 10 === Number(value[9])
}
