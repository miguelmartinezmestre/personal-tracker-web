# Preguntas adversariales probables del tribunal

## Procedencia, reproducibilidad y entrega

1. **¿Qué commit exacto está defendiendo?**  
   Debilidad: el ZIP contiene un árbol con cambios no confirmados, mientras su carpeta Git apunta a c07764d…. Una respuesta sólida debe mostrar commit/tag final, hash del ZIP, manifiesto y ausencia de diferencias.

2. **¿Por qué entregó .git y .env.local dentro del ZIP?**  
   Debilidad: expone 917 commits, reflogs y contenido histórico; el .env.local actual no contiene secretos, pero la práctica es insegura. Responder con corrección del empaquetado y política de inclusión.

3. **¿Puede un tercero reconstruir exactamente la entrega?**  
   Debilidad: pnpm build falla con el entorno empaquetado y sólo pasa con tres URLs HTTPS. Mostrar instrucciones limpias, versiones fijadas y log de una extracción nueva.

4. **¿Cómo distingue el código evaluado de modificaciones posteriores?**  
   Cubrir fecha de corte, rama, tag, hash, estado limpio y relación entre memoria, PDF, ZIP y capturas.

## Calidad, pruebas y afirmaciones

5. **La memoria dice 47 ficheros y 381 tests; ¿por qué hoy hay 48 y 385?**  
   Explicar que la memoria refleja un corte anterior, identificar las cuatro pruebas añadidas y actualizar cifras/capturas antes de defender.

6. **¿Puede afirmar que todos los checks pasan?**  
   Respuesta honesta actual: no; pnpm checks falla por Prettier y el lint por un import sin usar. Distinguir fallos de higiene de fallos funcionales y enseñar el cierre verde.

7. **¿Qué mide realmente el 80,20 % de cobertura?**  
   Sólo el backend Convex configurado en Vitest; no el frontend. Explicar por qué el frontend se valida vía E2E y reconocer el coste de no tener cobertura de componentes.

8. **¿Por qué auth.ts tiene sólo 26,22 % de ramas cubiertas?**  
   Señalar que es una frontera crítica, enumerar casos ya probados y proponer casos negativos adicionales de hooks, recuperación y configuración.

9. **¿Los 74 E2E pasaron en una sola ejecución?**  
   No en esta auditoría: 72 pasaron juntos; Firefox y WebKit se validaron después al instalar sus binarios. Evitar presentar una ejecución fragmentada como un único log verde.

10. **¿Qué prueba Firefox y WebKit?**  
    Un recorrido crítico por navegador, no toda la suite. Justificar la matriz de coste/riesgo y proponer ampliar autenticación, formularios y rutas.

11. **¿Cómo sabe que los E2E no son inestables?**  
    Una ejecución verde no mide flakiness. Hablar de un worker, cero reintentos, aislamiento Docker y necesidad de series repetidas.

12. **¿Qué requisitos no tienen una etiqueta @REQ literal?**  
    Son 17; se trazan por suite o inspección. Mostrar la matriz de 77/77 y explicar la diferencia entre trazabilidad documental y enlace ejecutable.

13. **¿Qué requisito reconoce como parcialmente validado?**  
    Destacar REQ-DASHBOARD-004: se verifica la sección/backend, pero no los días concretos mostrados. Reconocerlo aumenta credibilidad.

## Arquitectura y datos

14. **¿Por qué Convex y no PostgreSQL o una API REST convencional?**  
    Cubrir reactividad, funciones tipadas, transacciones y coste de acoplamiento/autoalojamiento; conectar la decisión con requisitos.

15. **¿Dónde se garantiza realmente la multitenencia?**  
    No en el proxy de Next, sino cerca de los datos: resolveAuthContext, membresía activa, wrappers RLS y políticas por tabla. Mostrar pruebas allow/deny y cruce de organización.

16. **¿Puede un usuario fabricar activeOrganizationId?**  
    Explicar que la sesión se normaliza y se resuelve la membresía; si no existe, el contexto pierde organización o rechaza. Ilustrar con el test de aislamiento.

17. **¿Qué ocurre durante el borrado asíncrono de una organización?**  
    Respuesta honesta actual: existe una ventana entre el borrado y la limpieza; no se bloquean de forma robusta todas las escrituras. Explicar el estado `deleting`, validación de organización y barrido final propuestos, junto con la prueba intercalada.

18. **¿Cómo evita carreras al completar objetivos, otorgar logros o borrar en cascada?**  
    Explicar transacciones Convex, idempotencia, workflows/workpools y deduplicación; reconocer efectos eventuales.

19. **¿Qué ocurre si falla el correo o una fase de un workflow?**  
    Diferenciar estado persistido, reintentos, errores permanentes, observabilidad y compensación. No afirmar atomicidad entre correo externo y base de datos.

20. **¿Por qué hay relaciones lógicas en lugar de claves foráneas?**  
    Convex es documental. Explicar validadores tipados, índices, RLS, cascadas explícitas y riesgo de integridad que cubren tests.

## Seguridad

21. **¿Qué impide que el proxy sea la única barrera de autorización?**  
    El proxy sólo hace redirección optimista por cookie; las operaciones usan contexto autenticado y RLS junto a los datos.

22. **¿Cómo protege el primer alta del administrador?**  
    SETUP_SECRET es obligatorio fuera de loopback, 32–256 caracteres, comparación de trabajo fijo y cabecera específica. Explicar rotación y retirada tras setup.

23. **¿Dónde están CSRF, cookies seguras y rate limiting?**  
    Diferenciar protecciones de Better Auth, endpoint propio de borrado con rate limit y lo que aún requiere verificación de despliegue. No atribuir controles no observados.

24. **¿Tiene CSP y cabeceras contra clickjacking?**  
    No aparecen en next.config.ts; podrían existir en Vercel/proxy, pendiente de comprobar. La respuesta sólida incluye captura de cabeceras productivas o un plan CSP probado.

25. **¿Qué demuestra que no hay vulnerabilidades en dependencias?**  
    Sólo pnpm audit --prod --audit-level high: producción, severidad alta, base conocida en la fecha. No cubre zero-days, devDependencies ni severidades menores.

26. **¿Cómo valida invitaciones contra robo, caducidad y correo incorrecto?**  
    Explicar ID exacto, estado pendiente, expiración, coincidencia normalizada de correo, verificación de email y pruebas negativas.

## Producto, UX y accesibilidad

27. **¿Cómo demuestra que es responsive y accesible?**  
    Responsive: E2E, 51 capturas y recorridos móvil/tableta. Accesibilidad: semántica parcial y lint, pero sin auditoría axe/WCAG completa; el PDF tampoco está etiquetado.

28. **¿Por qué no hay tests unitarios del frontend?**  
    Explicar elección de E2E para flujos integrados y reconocer el hueco de feedback rápido y combinaciones de estados.

29. **¿Cómo gestiona estados de carga, error y desconexión?**  
    Mostrar skeletons, spinners y error boundaries concretos; distinguir inventario estático de pruebas automáticas de recuperación.

30. **¿La interfaz actual coincide con las capturas de la memoria?**  
    El walkthrough actual genera 51 capturas; las capturas de test/cobertura de julio están desactualizadas. Preparar comparación y regeneración final.

## Memoria y método científico

31. **¿Qué aportación académica existe más allá de implementar una app?**  
    Articular decisiones verificables: modelo cuantitativo, multitenencia, permisos por capas, ciclo de vida, trazabilidad y evaluación.

32. **¿Por qué el estado del arte se apoya tanto en páginas de proveedores?**  
    Defenderlas como fuentes primarias para capacidades comerciales y complementar con literatura académica para teoría, evaluación y decisiones de diseño.

33. **¿Qué amenaza a la validez considera más importante?**  
    Entorno controlado, un único desarrollador/evaluador, ausencia de usuarios reales, accesibilidad no auditada, cobertura frontend no cuantificada y corte mutable.

34. **¿Qué resultado refutaría su afirmación de que el sistema está listo?**  
    Definir criterios falsables: cruce de tenant, pérdida de integridad, build no reproducible, gate rojo, fracaso de recorrido crítico o discrepancia commit/entrega.

35. **¿Por qué el PDF contiene “�?ndices”?**  
    Es un error de codificación en basedatos.tex, visible en páginas 12 y 60. Corregirlo antes de defender y mostrar recompilación sin Missing character.

36. **¿Cómo utilizó IA y cómo preservó autoría y verificabilidad?**  
    Explicar tareas asistidas, decisiones propias, revisión humana, declaración del uso y evidencias reproducibles.

37. **¿Por qué la memoria dice 65 % de ramas si Vitest exige 55 %?**  
    Es una discrepancia objetiva. Corregir el texto o elevar el umbral y repetir la evidencia; el 69,10 % actual supera ambos, pero no subsana la afirmación falsa.

38. **¿La aplicación exporta CSV/Excel o no?**  
    No en el snapshot actual. La Figura 5.10 y su texto deben sustituirse; la propia matriz comparativa ya dice “No”. No defender como implementada una captura histórica.

39. **¿En qué sentido es “software libre”?**  
    Hoy no hay una licencia declarada. Aportar licencia concreta o cambiar la matriz a “código fuente entregado para evaluación”. `private: true` no sustituye una licencia.

40. **¿Qué validó con usuarios reales?**  
    Nada en esta versión. Las pruebas aportan verificación técnica; usabilidad, utilidad y efecto motivacional no fueron medidos. Presentarlo como limitación y trabajo futuro, no como resultado.
