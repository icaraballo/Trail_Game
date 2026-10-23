# Trail Game

Juego de gestión de una carrera de **trail running**, en español y en el navegador. Creas un
corredor, repartes su tiempo entre trabajo y entrenamiento, eliges el calendario de carreras,
negocias patrocinios y aguantas lesiones y fatiga temporada a temporada, hasta la retirada.

**Jugar:** https://icaraballo.github.io/Trail_Game/

Funciona en el móvil y en el ordenador, sin instalar nada y sin cuenta.

## Modos

| Modo | Qué es |
|---|---|
| **Clásico** | Una carrera deportiva completa, de la primera carrera local a la retirada. Cuatro dificultades: Fácil, Medio, Difícil y Hardcore |
| **Exprés** | Tres temporadas, sin jornada laboral y con decisiones contrarreloj |
| **Entrenador** | Dejas de correr y entrenas a otros atletas |
| **Club** | Diriges un club entero: plantilla, cantera, patrocinios y presupuesto |
| **Canicross** | Corres con tu perro. **En obras**: sus partidas no pasarán a la versión nueva |

## Cómo se guarda

La partida se guarda sola al avanzar, en una de las **5 ranuras** del navegador. Desde
«Partidas» puedes **exportarla** como texto y volver a **importarla** en otro navegador o en
otro móvil. Haz una copia de vez en cuando: si borras los datos del navegador, se pierde.

## Privacidad

Trail Game **no tiene servidor, ni cuentas, ni analítica, ni cookies**.

- Tus partidas (5 ranuras) y tus logros **se guardan solo en este navegador** (`localStorage`).
  Si borras los datos del sitio, se borran.
- «Exportar partida» crea un texto que **solo sale de tu móvil si tú lo compartes**.
- Si mandas una opinión con «Opinar», **va a un formulario de Google** con la versión del
  juego, el modo y el momento de la partida. Tu nombre y tu contacto, solo si los escribes.
- GitHub, que aloja la página, y Google, si opinas, **ven tu dirección IP**, como cualquier web.

Lo mismo se lee dentro del juego: «Privacidad», junto a la versión, en la pantalla de partidas,
y en la hoja de «Opinar».

## Estado del proyecto

En desarrollo. Puede haber fallos y el equilibrio cambia de una versión a otra. Las partidas se
intentan conservar entre versiones; si una no se puede abrir, el juego lo dice y deja copiar sus
datos antes de borrarla, nunca la da por vacía.

Los nombres de rivales, atletas, clubes y patrocinadores son **inventados**.

## Opinar o avisar de un fallo

Abre un *issue* en este repositorio contando qué pasó, en qué móvil o navegador y, si puedes,
pega el texto de «Exportar partida». Para un problema de seguridad, mira [SECURITY.md](SECURITY.md).

## Cómo está hecho

JavaScript sin framework ni dependencias: un `index.html` y once scripts en `js/`, sin
compilar. Desarrollado con [Claude Code](https://claude.com/claude-code).

```
npm ci        # solo para las herramientas de desarrollo (eslint)
npm run check # lint + pruebas + contenido
```

## Licencia

© 2026 Iñigo Caraballo. **Todos los derechos reservados** (ver [LICENSE](LICENSE)): el código
se puede leer como parte de un portfolio, pero no copiar, modificar ni distribuir.
