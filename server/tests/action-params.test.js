import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runGamingActionNative } from '../lib/gaming.js';
import { runIntegrityActionNative } from '../lib/integrity.js';
import { runContextMenuActionNative } from '../lib/contextmenu.js';
import { runOemDebloatActionNative } from '../lib/oemdebloat.js';
import { runSearchIndexActionNative } from '../lib/searchindex.js';
import { runStartupActionNative } from '../lib/startup.js';
import { runServicesActionNative } from '../lib/services.js';
import { runAppsActionNative } from '../lib/apps.js';

describe('Validación de ejecución de acciones con parámetros (Módulos activos)', () => {
  it('gaming: ejecuta en dryRun con SETTINGS seleccionados y rechaza vacíos', async () => {
    const logs = [];
    await runGamingActionNative({ DRY_RUN: 'true', SETTINGS: 'gamemode,gamedvr' }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Iniciando optimización Gaming & GPU')));

    await assert.rejects(
      async () => runGamingActionNative({ DRY_RUN: 'true', SETTINGS: '' }, () => {}),
      { statusCode: 400 },
    );
  });

  it('integrity: ejecuta en dryRun con ACTIONS seleccionadas y rechaza vacías', async () => {
    const logs = [];
    await runIntegrityActionNative({ DRY_RUN: 'true', ACTIONS: 'winsxs_cleanup' }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Iniciando tareas de integridad')));

    await assert.rejects(
      async () => runIntegrityActionNative({ DRY_RUN: 'true', ACTIONS: '' }, () => {}),
      { statusCode: 400 },
    );
  });

  it('contextmenu: ejecuta en dryRun con HANDLERS seleccionados y rechaza vacíos', async () => {
    const logs = [];
    await runContextMenuActionNative({ DRY_RUN: 'true', HANDLERS: 'HKCR\\*\\shellex\\ContextMenuHandlers\\Test' }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Iniciando optimización del menú contextual')));

    await assert.rejects(
      async () => runContextMenuActionNative({ DRY_RUN: 'true', HANDLERS: '' }, () => {}),
      { statusCode: 400 },
    );
  });

  it('oemdebloat: ejecuta en dryRun con SERVICES seleccionados y MODE', async () => {
    const logs = [];
    await runOemDebloatActionNative({ DRY_RUN: 'true', SERVICES: 'TestOemService', MODE: 'demand' }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Iniciando optimización de servicios OEM')));

    await assert.rejects(
      async () => runOemDebloatActionNative({ DRY_RUN: 'true', SERVICES: '' }, () => {}),
      { statusCode: 400 },
    );
  });

  it('searchindex: ejecuta en dryRun con SETTINGS seleccionados válidos', async () => {
    const logs = [];
    await runSearchIndexActionNative({ DRY_RUN: 'true', SETTINGS: 'disablewebsearch' }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Iniciando optimización de directivas de Windows Search')));

    await assert.rejects(
      async () => runSearchIndexActionNative({ DRY_RUN: 'true', SETTINGS: '' }, () => {}),
      { statusCode: 400 },
    );
  });

  it('startup: ejecuta en dryRun con OPTIMIZE_PROGRAMS y OPTIMIZE_TASKS', async () => {
    const logs = [];
    await runStartupActionNative({
      DRY_RUN: 'true',
      OPTIMIZE_PROGRAMS: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\TestApp',
      OPTIMIZE_TASKS: 'TestTask',
    }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Optimizacion de inicio')));
  });

  it('services: ejecuta en dryRun con SERVICES seleccionados', async () => {
    const logs = [];
    await runServicesActionNative({ DRY_RUN: 'true', SERVICES: 'Spooler' }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Optimizacion de Servicios')));
  });

  it('apps: ejecuta en dryRun con APPS seleccionadas', async () => {
    const logs = [];
    await runAppsActionNative({ DRY_RUN: 'true', APPS: 'TestApp.TestApp' }, (msg) => logs.push(msg));
    assert.ok(logs.some((l) => l.includes('Desinstalacion de aplicaciones')));
  });
});
