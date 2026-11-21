# Pruebas y verificación

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright sirve el build en `http://localhost:4173/Problema8reynas/`. En Windows puede usar Edge con `$env:PLAYWRIGHT_CHANNEL = 'msedge'`. Si ya hay una vista previa en el puerto de prueba, detén ese servidor o asegúrate de que sirve la compilación actual.

| Nivel | Cobertura |
| --- | --- |
| Motor | Dominios, 56 arcos, soporte, cola FIFO, reencolado, orden inverso, contradicciones, restauración e historial. |
| Enumeración | 92 soluciones distintas para cada estrategia y coincidencia exacta con una búsqueda de referencia separada. |
| Simetría | 12 clases fundamentales, once órbitas de ocho miembros y una de cuatro. |
| Integración | Navegación del tablero con flechas, estados anunciables y conflicto diagonal. |
| Navegador | Reproducción y pausa, laboratorio, worker y detención, catálogo, validación de selección, tema y diseño móvil. |
| Publicación | Solo se publica `dist` tras lint, tipado, pruebas, compilación y E2E. |

El solucionador de referencia solo vive en `tests/unit/engine.test.ts`. Usa conjuntos de filas y diagonales para enumerar sus candidatas y compara el conjunto de arreglos con el resultado del motor MAC.
