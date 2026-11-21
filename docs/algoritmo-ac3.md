# AC-3, REVISE y MAC

## AC-3

En un arco `Xi → Xj`, `REVISE` busca soporte para cada candidato de `Xi` en el dominio actual de `Xj`. La cola tiene 56 arcos dirigidos al iniciar sobre el CSP completo.

```text
AC-3(dominios, cola):
    mientras cola no esté vacía:
        Xi → Xj ← extraer el primero
        para cada a en D(Xi):
            buscar b en D(Xj) compatible con a
            si no existe b: quitar a de D(Xi)
        si D(Xi) está vacío: devolver inconsistente
        si D(Xi) cambió:
            agregar los arcos Xk → Xi que no estén en la cola, k ≠ j
    devolver consistente por arcos
```

Se excluye `Xj → Xi` inmediatamente después de revisar `Xi → Xj` porque los valores eliminados de `Xi` carecían de compatibilidad con cualquier valor de `Xj`. La comprobación de ataques es simétrica.

La cota clásica de revisiones de soporte es O(ed³), con e arcos y d valores máximos por dominio. La interfaz educativa también copia secuencias de la cola al registrar cambios. El tamaño del tablero se mantiene fijo y la cola evita duplicados pendientes.

## MAC

La raíz hace AC-3 con todos los arcos. Luego se selecciona una variable con dominio de dos o más filas, se conserva el estado padre y se prueba un valor. La propagación de la rama comienza con los siete arcos entrantes a la variable restringida. Los demás arcos todavía están consistentes en ese instante porque sus dominios no cambiaron. AC-3 descubre qué otros arcos deben revisarse a partir de la primera poda.

La configuración queda completa cuando cada dominio tiene una fila. Antes de registrar una solución, el motor verifica de forma independiente las filas y diagonales. Al terminar una rama vuelve al estado padre. El retroceso cuenta las restauraciones tanto de ramas exploradas como de ramas descartadas.

| Estrategia | Variable | Orden de valores |
| --- | --- | --- |
| Orden de columnas | Primera columna con más de un candidato | Fila ascendente |
| MRV | Menor dominio no unitario y después menor columna | Fila ascendente |
| MRV + LCV | Igual que MRV | Mayor suma de soportes en los dominios vecinos y después menor fila |

La consistencia de arcos es local. Un dominio vacío demuestra que la rama actual es inviable. Una cola vacía certifica que todos los valores restantes tienen soporte por separado, mientras que la validación de una hoja comprueba la compatibilidad de toda la configuración.
