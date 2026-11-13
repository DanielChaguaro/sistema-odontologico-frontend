import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/**
 * Aura con el verde azulado de la identidad del sistema y superficies grafito en el tema oscuro.
 * Debe coincidir con los tokens de src/styles/main.css.
 */
export const DentalPreset = definePreset(Aura, {
  primitive: {
    teal: {
      50: '#effaf8', 100: '#d6f1ed', 200: '#ade3db', 300: '#7fd1c5', 400: '#4fb8aa', 500: '#2a9d90',
      600: '#1a8279', 700: '#0f6e69', 800: '#0e5855', 900: '#0d4846', 950: '#062b2a',
    },
    graphite: {
      0: '#ffffff', 50: '#e6eceb', 100: '#cdd7d6', 200: '#a9b6b6', 300: '#859495', 400: '#627173', 500: '#46575a',
      600: '#334245', 700: '#243134', 800: '#172225', 900: '#121a1c', 950: '#0c1214',
    },
  },
  semantic: {
    primary: {
      50: '{teal.50}', 100: '{teal.100}', 200: '{teal.200}', 300: '{teal.300}', 400: '{teal.400}', 500: '{teal.500}',
      600: '{teal.600}', 700: '{teal.700}', 800: '{teal.800}', 900: '{teal.900}', 950: '{teal.950}',
    },
    colorScheme: {
      light: {
        primary: { color: '{teal.700}', contrastColor: '#ffffff', hoverColor: '{teal.800}', activeColor: '{teal.900}' },
        highlight: { background: '{teal.50}', focusBackground: '{teal.100}', color: '{teal.800}', focusColor: '{teal.900}' },
      },
      dark: {
        surface: {
          0: '{graphite.0}', 50: '{graphite.50}', 100: '{graphite.100}', 200: '{graphite.200}', 300: '{graphite.300}', 400: '{graphite.400}',
          500: '{graphite.500}', 600: '{graphite.600}', 700: '{graphite.700}', 800: '{graphite.800}', 900: '{graphite.900}', 950: '{graphite.950}',
        },
        primary: { color: '{teal.600}', contrastColor: '#ffffff', hoverColor: '{teal.500}', activeColor: '{teal.400}' },
        highlight: {
          background: 'color-mix(in srgb, {teal.400}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {teal.400}, transparent 76%)',
          color: '{teal.200}',
          focusColor: '{teal.100}',
        },
      },
    },
  },
})

export const esLocale = {
  startsWith: 'Comienza con', contains: 'Contiene', notContains: 'No contiene', endsWith: 'Termina con', equals: 'Igual',
  notEquals: 'Distinto', noFilter: 'Sin filtro', lt: 'Menor que', lte: 'Menor o igual', gt: 'Mayor que', gte: 'Mayor o igual',
  dateIs: 'Fecha igual', dateIsNot: 'Fecha distinta', dateBefore: 'Antes de', dateAfter: 'Después de', clear: 'Limpiar',
  apply: 'Aplicar', matchAll: 'Todos', matchAny: 'Cualquiera', addRule: 'Agregar regla', removeRule: 'Quitar regla',
  accept: 'Sí', reject: 'No', choose: 'Elegir', upload: 'Subir', cancel: 'Cancelar', completed: 'Completado', pending: 'Pendiente',
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  chooseYear: 'Elegir año', chooseMonth: 'Elegir mes', chooseDate: 'Elegir fecha', prevDecade: 'Década anterior',
  nextDecade: 'Década siguiente', prevYear: 'Año anterior', nextYear: 'Año siguiente', prevMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente', prevHour: 'Hora anterior', nextHour: 'Hora siguiente', prevMinute: 'Minuto anterior',
  nextMinute: 'Minuto siguiente', prevSecond: 'Segundo anterior', nextSecond: 'Segundo siguiente', am: 'AM', pm: 'PM',
  today: 'Hoy', weekHeader: 'Sem', firstDayOfWeek: 1, dateFormat: 'dd/mm/yy', weak: 'Débil', medium: 'Media', strong: 'Fuerte',
  passwordPrompt: 'Ingrese una contraseña', emptyFilterMessage: 'Sin resultados', searchMessage: '{0} resultados',
  selectionMessage: '{0} seleccionados', emptySelectionMessage: 'Nada seleccionado', emptySearchMessage: 'Sin resultados',
  emptyMessage: 'Sin opciones', aria: { trueLabel: 'Sí', falseLabel: 'No', nullLabel: 'Sin seleccionar', pageLabel: 'Página {page}',
    firstPageLabel: 'Primera página', lastPageLabel: 'Última página', nextPageLabel: 'Siguiente', prevPageLabel: 'Anterior',
    rowsPerPageLabel: 'Filas por página', close: 'Cerrar' },
}
