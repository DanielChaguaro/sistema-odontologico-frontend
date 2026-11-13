import { expect, test } from '@playwright/test'
import { chooseOption, login, randomCedula, shot } from './helpers'

test.describe.configure({ mode: 'serial' })

test('acceso: credenciales incorrectas muestran un error claro', async ({ page }) => {
  await page.goto('/login')
  await shot(page, '01-login')
  await page.locator('#username').fill('admin.consultorio')
  await page.locator('#password').fill('clave-incorrecta')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText('Usuario o contraseña incorrectos')).toBeVisible()
})

test('acceso: rutas privadas redirigen al login', async ({ page }) => {
  await page.goto('/pacientes')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('inicio: el administrador del consultorio ve indicadores y su menú', async ({ page }) => {
  await login(page, 'admin')
  await expect(page.getByText('Pacientes activos')).toBeVisible()
  const nav = page.locator('nav.nav')
  for (const item of ['Pacientes', 'Personal clínico', 'Consultorios', 'Usuarios', 'Roles y permisos']) {
    await expect(nav.getByRole('link', { name: item })).toBeVisible()
  }
  await shot(page, '02-inicio')
})

test('RF-01: registrar un paciente, validar duplicados y consentimientos', async ({ page }) => {
  await login(page, 'admin')
  await page.goto('/pacientes/nuevo')

  // Validaciones del lado del cliente.
  await page.locator('#idNumber').fill('1710034066')
  await page.getByRole('button', { name: 'Registrar paciente' }).click()
  await expect(page.getByText('Cédula ecuatoriana inválida')).toBeVisible()
  await expect(page.getByText('Ingrese al menos un teléfono o un correo')).toBeVisible()

  // Aviso de duplicado contra el backend (paciente sembrado por las pruebas de API).
  await page.locator('#idNumber').fill('1710034065')
  await page.locator('#firstNames').click()
  await expect(page.getByText('Ya existe un paciente con esta identificación')).toBeVisible()

  const cedula = randomCedula()
  await page.locator('#idNumber').fill(cedula)
  await page.locator('#firstNames').fill('Valeria')
  await page.locator('#lastNames').fill('Prueba E2E')
  await page.locator('#birthDate').fill('15/03/1994')
  await page.locator('#birthDate').press('Escape')
  await page.getByRole('button', { name: 'Femenino' }).click()
  await page.locator('#phone').fill('0991112233')
  await page.locator('#email').fill('valeria.e2e@correo.com')
  await page.locator('#emName').fill('Pedro Prueba')
  await page.locator('#emRel').fill('Padre')
  await page.locator('#allergies').fill('Ibuprofeno')
  await page.locator('#dental').fill('Profilaxis anual')
  await shot(page, '03-paciente-formulario')
  await page.getByRole('button', { name: 'Registrar paciente' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Valeria Prueba E2E')
  await expect(page.getByText(cedula)).toBeVisible()
  await expect(page.getByText('Alergias:')).toBeVisible()
  await shot(page, '04-paciente-ficha')

  await page.getByRole('tab', { name: 'Consentimientos' }).click()
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText('Tratamiento de datos personales: otorgado')).toBeVisible()

  await page.getByRole('tab', { name: 'Bitácora' }).click()
  await expect(page.getByRole('cell', { name: 'Consentimiento' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Registro' })).toBeVisible()
  await shot(page, '05-paciente-bitacora')

  await page.goto('/pacientes')
  await page.getByPlaceholder('Buscar por nombre').fill('Prueba E2E')
  await expect(page.getByRole('cell', { name: /Valeria Prueba E2E/ }).first()).toBeVisible()
  await shot(page, '06-pacientes-lista')
})

test('RF-07: consultorio, ficha profesional y horario semanal', async ({ page }) => {
  await login(page, 'admin')
  await page.goto('/consultorios')
  const code = `E2E-${Date.now().toString().slice(-5)}`
  await page.getByRole('button', { name: 'Nuevo consultorio' }).click()
  await page.locator('#code').fill(code)
  await page.locator('#name').fill(`Consultorio ${code}`)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('cell', { name: code, exact: true })).toBeVisible()
  await shot(page, '07-consultorios')

  await page.goto('/personal')
  await page.getByRole('cell', { name: /María López/ }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('María López')
  await expect(page.getByText('Horario de atención')).toBeVisible()
  await page.getByRole('button', { name: 'Editar horario' }).click()
  // Idempotente: quita bloques del viernes de corridas anteriores (el sistema rechaza solapamientos).
  const fridays = page.locator('.editor-row', { hasText: 'Viernes' })
  while (await fridays.count()) await fridays.first().getByRole('button', { name: 'Quitar bloque' }).click()
  await page.getByRole('button', { name: 'Agregar bloque' }).click()
  const rows = page.locator('.editor-row')
  const last = rows.last()
  await last.getByRole('combobox', { name: 'Día' }).click()
  await page.getByRole('option', { name: 'Viernes' }).click()
  await last.getByLabel('Hora de inicio').fill('09:00')
  await last.getByLabel('Hora de fin').fill('13:00')
  await page.getByRole('button', { name: 'Guardar horario' }).click()
  await expect(page.locator('.day', { hasText: 'Viernes' }).getByText('09:00 – 13:00')).toBeVisible()
  await shot(page, '08-profesional-horario')

  await page.goto('/personal/nuevo')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText('Obligatorio para odontólogos (ACESS/SENESCYT)')).toBeVisible()
  await shot(page, '09-profesional-formulario')
})

test('RF-08: crear usuario con rol y ver la matriz de permisos', async ({ page }) => {
  await login(page, 'admin')
  await page.goto('/usuarios/nuevo')
  const suffix = Date.now().toString().slice(-6)
  await page.locator('#name').fill('Recepción')
  await page.locator('#lastName').fill(`E2E ${suffix}`)
  await page.locator('#email').fill(`recepcion.${suffix}@clinica.local`)
  await expect(page.locator('#userName')).toHaveValue(`recepcion.${suffix}`)
  await page.getByRole('button', { name: 'Generar' }).click()
  await chooseOption(page, '#roles', 'Recepcionista')
  await page.keyboard.press('Escape')
  await expect(page.getByText('Registrar y actualizar pacientes odontológicos')).toBeVisible()
  await shot(page, '10-usuario-crear')
  await page.getByRole('button', { name: 'Crear usuario' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Recepción')
  await expect(page.getByText('Usuario creado', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Usuario creado' })).toBeVisible()
  await shot(page, '11-usuario-detalle')

  await page.goto('/roles')
  await expect(page.getByRole('heading', { name: 'Matriz de permisos' })).toBeVisible()
  await shot(page, '12-roles')
})

test('permisos: la odontóloga no ve la administración ni puede entrar a ella', async ({ page }) => {
  await login(page, 'dentist')
  const nav = page.locator('nav.nav')
  await expect(nav.getByRole('link', { name: 'Pacientes' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
  await page.goto('/usuarios')
  await expect(page.getByText('No tiene permiso para ver esta sección')).toBeVisible()
  await page.goto('/mi-perfil')
  await expect(page.getByText('Perfil profesional')).toBeVisible()
  await expect(page.getByText('1005-2019-123456')).toBeVisible()
  await shot(page, '13-odontologa-perfil')
})

test('RF-03 (CP-01): la odontóloga registra un hallazgo por pieza en el dentigrama', async ({ page }) => {
  await login(page, 'dentist')
  await page.goto('/dentigrama')
  await page.getByPlaceholder('Buscar paciente').fill('1710034065')
  await page.getByRole('option').first().click()

  // Repetible: reutiliza la consulta abierta de una corrida anterior o abre una nueva.
  const open = page.getByRole('button', { name: 'Nueva consulta' })
  if (await open.isVisible()) {
    await open.click()
    await page.getByRole('button', { name: 'Permanente' }).click()
    await page.locator('#consultation-reason').fill('Control E2E')
    await page.getByRole('button', { name: 'Abrir consulta' }).click()
  }
  await expect(page.getByText('Consulta abierta', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Caries' }).first().click()
  const tooth36 = page.locator('g.tooth').filter({ has: page.locator('title', { hasText: /^Pieza 36$/ }) })
  await tooth36.locator('rect.face').click()
  await expect(page.getByText('Primer molar inferior izquierdo')).toBeVisible()
  const finding = page.locator('.finding-list li').filter({ hasText: 'Caries · Oclusal / incisal' })
  await expect(finding).toBeVisible()
  await shot(page, '14-dentigrama')

  // Error de registro: se anula con motivo y queda en el historial de la pieza.
  await finding.getByRole('button', { name: 'Anular' }).click()
  await page.locator('#annul-reason').fill('Prueba E2E')
  await page.getByRole('dialog').getByRole('button', { name: 'Anular' }).click()
  await expect(finding).toHaveCount(0)
  await page.getByRole('button', { name: 'Historial de la pieza' }).click()
  await expect(page.getByText('Anulado: Prueba E2E').first()).toBeVisible()
})

test('RF-03: el administrador del consultorio consulta el dentigrama sin poder modificarlo', async ({ page }) => {
  await login(page, 'admin')
  await page.goto('/dentigrama')
  await page.getByPlaceholder('Buscar paciente').fill('1710034065')
  await page.getByRole('option').first().click()
  await expect(page.getByText(/Consulta (abierta|cerrada)|aún no tiene consultas/).first()).toBeVisible()
  await expect(page.getByText('Registrar hallazgo')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nueva consulta' })).toHaveCount(0)
})
