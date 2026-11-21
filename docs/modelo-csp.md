# Modelo CSP de las ocho reinas

**Variables.** Q0 a Q7, una por columna. El valor de una variable es el índice de la fila de su reina.

**Dominios.** Cada variable empieza con {0, 1, 2, 3, 4, 5, 6, 7}. El índice 0 está arriba. En la notación del tablero corresponde a la fila 8, por lo que Q0 = 0 se muestra en A8.

**Restricciones.** Para i ≠ j, una pareja (a, b) es compatible si a ≠ b y |a − b| ≠ |i − j|. La condición de columna se satisface mediante la representación. Las ocho variables conforman un grafo completo K₈ con 28 enlaces y 56 arcos dirigidos.

**Ejemplo.** Si Q0 = 0, Q1 = 0 comparte fila, Q1 = 1 comparte diagonal y Q1 = 2 es compatible. El dominio de Q1 conserva {2, 3, 4, 5, 6, 7} tras revisar Q1 → Q0, mientras ninguna otra restricción lo reduzca.

**Simetrías.** Las cuatro rotaciones y sus composiciones con una reflexión vertical generan las ocho operaciones del cuadrado. La rotación de 90° transforma (columna, fila) en (7 − fila, columna). La clave canónica es el menor arreglo lexicográfico entre sus ocho imágenes. El catálogo completo tiene 11 órbitas de ocho miembros y una de cuatro.
