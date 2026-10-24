# X Siguiendo

App de Android que abre X (x.com) y elimina la pestaña "Para ti".
Siempre te deja en "Siguiendo". Todo lo demás funciona igual: publicar, fotos, mensajes, notificaciones dentro de la app...

## Cómo conseguir el APK

### Opción A: GitHub (sin instalar nada en tu ordenador)
1. Crea una cuenta gratis en github.com y un repositorio nuevo (puede ser privado).
2. Sube TODO el contenido de esta carpeta (incluida la carpeta oculta `.github`).
   Lo más fácil: en el repositorio, "Add file" → "Upload files" y arrastra los archivos.
   Si la carpeta `.github` no se sube al arrastrar, créala a mano: "Add file" → "Create new file"
   con el nombre `.github/workflows/build.yml` y pega su contenido.
3. Ve a la pestaña "Actions". Se compila solo en unos 3-5 minutos.
4. Entra en la ejecución terminada y descarga "X-Siguiendo-APK" (abajo, en "Artifacts").
5. Descomprime el .zip: dentro está `app-debug.apk`.

### Opción B: Android Studio
1. Instala Android Studio (developer.android.com/studio).
2. File → Open → elige esta carpeta. Si te ofrece actualizar Gradle o el plugin, acepta.
3. Build → Build App Bundle(s) / APK(s) → Build APK(s).
4. El APK sale en `app/build/outputs/apk/debug/app-debug.apk`.

## Instalarlo en el móvil
1. Pasa `app-debug.apk` al móvil (por Drive, WhatsApp a ti mismo, cable...).
2. Ábrelo y permite "instalar apps de origen desconocido" cuando te lo pida.
3. Abre "X Siguiendo" e inicia sesión.

## Importante
- Inicia sesión con tu usuario/email y contraseña. El botón "Iniciar sesión con Google"
  no funciona dentro de apps así (Google lo bloquea).
- Para que sea "sí o sí": desinstala la app oficial de X. Si la mantienes, "Para ti" sigue a un toque.
- Si algún día X cambia su web y vuelve a aparecer "Para ti", el ajuste está en
  `app/src/main/assets/nofy.js`.
