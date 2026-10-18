/**
 * Descriptores de UI por módulo para el panel lateral del ReportViewer.
 *
 * Cada entrada describe cómo renderizar la lista de checkboxes del módulo.
 * Los módulos especiales (cleanup, startup, ram, power, network, updates)
 * tienen JSX inline en ReportViewer porque su forma es genuinamente distinta.
 *
 * `bodyKey` es la clave del body que se manda al POST /api/action/:module.
 * `bodyFormat` controla cómo se serializan los IDs: 'csv' (string) o 'array'.
 */

export const GENERIC_PANEL_CONFIG = {
  services: {
    label: 'Servicios de terceros a deshabilitar:',
    hint: 'Se detendrá el servicio y se cambiará su inicio a "Deshabilitado".',
    bodyKey: 'services',
    bodyFormat: 'array',
    renderItem: (svc) => ({
      title: svc.displayName || svc.name,
      subtitle: `${svc.name} — ${svc.status}`,
    }),
  },
  apps: {
    label: 'Aplicaciones a desinstalar:',
    hint: 'Se desinstalarán las aplicaciones seleccionadas via winget.',
    bodyKey: 'apps',
    bodyFormat: 'csv',
    renderItem: (app) => ({
      title: app.name,
      subtitle: `${app.id} — ${app.version}`,
    }),
  },
  privacy: {
    label: 'Ajustes a proteger:',
    hint: 'Se aplicará la configuración recomendada de privacidad a los ajustes seleccionados.',
    bodyKey: 'privacy',
    bodyFormat: 'csv',
    renderItem: (item) => ({
      title: item.name,
      subtitle: item.safe ? `✓ Protegido (${item.desc})` : `Pendiente · ${item.desc}`,
      statusColor: item.safe ? 'var(--color-success)' : 'var(--color-warning)',
    }),
  },
  gaming: {
    label: 'Ajustes a optimizar:',
    hint: 'Seleccioná las optimizaciones de latencia y aceleración gráfica a aplicar:',
    bodyKey: 'settings',
    bodyFormat: 'csv',
    renderItem: (item) => ({
      title: item.name,
      subtitle: item.optimized ? '✓ Ya optimizado' : `Pendiente · ${item.currentLabel}`,
      statusColor: item.optimized ? 'var(--color-success)' : 'var(--color-warning)',
    }),
  },
  integrity: {
    label: 'Acciones de mantenimiento:',
    hint: 'Seleccioná las tareas de reparación o limpieza de WinSxS a ejecutar:',
    bodyKey: 'actions',
    bodyFormat: 'csv',
    renderItem: (item) => ({
      title: item.name,
      subtitle: item.desc,
    }),
  },
  contextmenu: {
    label: 'Extensiones a deshabilitar:',
    hint: 'Seleccioná las extensiones de terceros que no usás para acelerar el menú contextual:',
    bodyKey: 'handlers',
    bodyFormat: 'csv-raw',
    filterFn: (item) => !item.isSystem,
    renderItem: (item) => ({
      title: item.name,
      subtitle: `${item.location} · ${item.isBlocked ? 'Ya desactivado' : 'Activo'}`,
      statusColor: item.isBlocked ? 'var(--color-warning)' : 'var(--color-ink-3)',
    }),
  },
  oemdebloat: {
    label: 'Servicios OEM detectados:',
    bodyKey: 'services',
    bodyFormat: 'csv',
    renderItem: (item) => ({
      prefix: item.oem,
      title: item.name,
      subtitle: `${item.desc} · Actual: ${item.startMode}`,
    }),
  },
  searchindex: {
    label: 'Directivas de Windows Search:',
    hint: 'Seleccioná las políticas de indexación y búsqueda a optimizar:',
    bodyKey: 'settings',
    bodyFormat: 'csv',
    renderItem: (item) => ({
      title: item.name,
      subtitle: `${item.desc} (Estado: ${item.currentLabel})`,
      statusColor: item.isOptimized ? 'var(--color-success)' : 'var(--color-warning)',
    }),
  },
  smartdisk: {
    label: 'Acciones de Optimización SSD:',
    hint: 'Seleccioná las tareas de mantenimiento de almacenamiento a ejecutar:',
    bodyKey: 'actions',
    bodyFormat: 'csv',
    renderItem: (item) => ({
      title: item.name,
      subtitle: item.desc,
    }),
  },
  shadercache: {
    label: 'Cachés de Sombreadores GPU a Purgar:',
    hint: 'Seleccioná las ubicaciones de caché de sombreadores a liberar:',
    bodyKey: 'caches',
    bodyFormat: 'csv',
    renderItem: (item) => ({
      prefix: item.vendor,
      title: item.name,
      subtitle: `${item.sizeMB} MB (${item.files} archivos) · ${item.path}`,
      statusColor: Number(item.sizeMB) > 0 ? 'var(--color-warning)' : 'var(--color-ink-3)',
    }),
  },
  updates: {
    label: 'Actualizaciones a instalar:',
    hint: 'Seleccioná las aplicaciones y paquetes a actualizar de forma individual y silenciosa:',
    bodyKey: 'packages',
    bodyFormat: 'csv',
    renderItem: (item) => {
      const srcTag = item.source === 'msstore' ? '[MSSTORE]' : `[${(item.manager || 'APP').toUpperCase()}]`;
      const adminTag = item.isSystemScope ? ' · Requiere Admin' : '';
      const unknownTag = item.isUnknownVersion ? ' · [AVISO] Versión indefinida' : '';

      let statusColor = 'var(--color-primary)';
      if (item.isUnknownVersion) statusColor = 'var(--color-ink-3)';
      else if (item.isSystemScope) statusColor = 'var(--color-warning)';

      return {
        prefix: srcTag,
        title: item.name,
        subtitle: `${item.currentVersion || 'Actual'} → ${item.availableVersion || 'Nueva'}${adminTag}${unknownTag} · ID: ${item.id}`,
        statusColor,
      };
    },
  },
};
