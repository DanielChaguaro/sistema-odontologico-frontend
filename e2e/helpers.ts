import { expect, type Page } from '@playwright/test'

/** Usuarios de prueba del entorno local (local-runtime). */
export const USERS = {
  admin: { user: 'admin.consultorio', password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminConsul123!' },
  dentist: { user: 'dra.lopez', password: process.env.E2E_DENTIST_PASSWORD ?? 'Odontologa123!' },
}

export async function login(page: Page, who: keyof typeof USERS) {
  await page.goto('/login')
  await page.locator('#username').fill(USERS[who].user)
  await page.locator('#password').fill(USERS[who].password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Buen(os|as)/)
}

/** Cédula ecuatoriana válida y aleatoria (para no chocar con datos de corridas anteriores). */
export function randomCedula(): string {
  const province = String(1 + Math.floor(Math.random() * 24)).padStart(2, '0')
  const digits = province + Math.floor(Math.random() * 6) + Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('')
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  const sum = coefficients.reduce((acc, c, i) => {
    const product = Number(digits[i]) * c
    return acc + (product >= 10 ? product - 9 : product)
  }, 0)
  return digits + ((10 - (sum % 10)) % 10)
}

/** Abre un Select/MultiSelect de PrimeVue por el id de su input y elige una opción. */
export async function chooseOption(page: Page, trigger: string, option: string | RegExp) {
  await page.locator(trigger)
    .locator('xpath=ancestor-or-self::*[contains(@class,"p-multiselect") or contains(@class,"p-select")][1]').click()
  await page.getByRole('option', { name: option }).first().click()
}

export async function shot(page: Page, name: string) {
  const dir = process.env.E2E_SCREENSHOTS
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}
