# Sistema de Gestión Académica - EORM Caserío Los Arrozales

## Descripción Breve del Sistema

Este proyecto es un Sistema de Gestión Académica integral diseñado para la Escuela Oficial Rural Mixta (EORM) Caserío Los Arrozales. La plataforma centraliza la administración de la información escolar, facilitando las tareas diarias de los distintos roles dentro de la comunidad educativa:

- **Portal del Administrador:** Permite la gestión de cuentas de usuario (directores, profesores) y la activación de estudiantes nuevos.
- **Portal del Director:** Ofrece una vista completa de la escuela, permitiendo gestionar cursos, grados, inscripciones, profesores y estudiantes, además de enviar notificaciones y ver reportes generales.
- **Portal del Profesor:** Facilita la gestión de sus cursos asignados, el ingreso de calificaciones por bimestre y el registro de la asistencia diaria de los estudiantes.
- **Portal del Estudiante:** Permite a los alumnos consultar sus calificaciones, ver el calendario de eventos y comunicarse con sus profesores.

El sistema está diseñado para ser intuitivo, seguro y eficiente, utilizando una arquitectura moderna de desarrollo web y servicios en la nube.

## Tecnologías Utilizadas

El proyecto está construido sobre un stack tecnológico moderno y robusto:

- **Framework Frontend:** [Next.js](https://nextjs.org/) con React y TypeScript para una experiencia de usuario rápida y fluida.
- **UI y Estilos:** [ShadCN UI](https://ui.shadcn.com/) y [Tailwind CSS](https://tailwindcss.com/) para un diseño limpio, responsivo y personalizable.
- **Backend y Base de Datos:** [Firebase](https://firebase.google.com/), utilizando varios de sus servicios:
    - **Firestore:** Como base de datos NoSQL en tiempo real para almacenar toda la información de usuarios, estudiantes, cursos, calificaciones, etc. Su flexibilidad nos permite modelar las complejas relaciones de una escuela.
    - **Firebase Authentication:** Para gestionar el inicio de sesión y la seguridad de las cuentas de todos los roles.
    - **Firebase Cloud Functions:** Para ejecutar lógica de backend, como el envío de notificaciones push cuando se crea un evento o anuncio.
    - **Firebase Cloud Messaging (FCM):** Para el sistema de notificaciones push en tiempo real.
- **Componentes y Gráficos:** [Lucide React](https://lucide.dev/) para iconos y [Recharts](https://recharts.org/) para la visualización de datos en los paneles de control.
- **Otras APIs:**
    - **Palabras Aleatorias API:** Para la función "Palabra del Día".
    - **Google Fonts:** Para la carga de la tipografía "Inter".
    - **Placehold.co:** Para la visualización de imágenes de marcador de posición.

## Instrucciones de Instalación

Para ejecutar este proyecto en un entorno de desarrollo local, asegúrate de tener [Node.js](https://nodejs.org/) instalado y sigue estos pasos:

1.  **Clonar y configurar el proyecto:**
    ```bash
    # Clona el repositorio desde tu terminal
    git clone <URL-del-repositorio>

    # Navega al directorio del proyecto
    cd <nombre-del-directorio>

    # Instala todas las dependencias necesarias
    npm install
    ```

2.  **Ejecutar el servidor de desarrollo:**
    ```bash
    # Inicia la aplicación en modo de desarrollo
    npm run dev
    ```

3.  **Abrir en el navegador:**
    Abre tu navegador y ve a [http://localhost:9002](http://localhost:9002) para ver la aplicación en funcionamiento.

## Credenciales de Acceso

Para probar los diferentes roles del sistema, puedes utilizar las siguientes credenciales en la página de inicio de sesión:

- **Administrador:**
  - **Usuario:** `rox17jacome@gmail.com`
  - **Contraseña:** `Asa22123`

- **Director:**
  - **Usuario:** `jeraldinacevedo123@gmail.com`
  - **Contraseña:** `Asa22123`

- **Profesor:**
  - **Usuario:** `eduardorene123@gmail.com`
  - **Contraseña:** `123456`

- **Alumno:**
  - **Usuario:** `osoasa22123@gmail.com`
  - **Contraseña:** `Asa22123`

**Nota:** La base de datos y la autenticación están gestionadas por **Firebase**, permitiendo una gestión segura y escalable de los datos y usuarios.

No usa scripts, pero si utiliza un conjunto de reglas para definir lo que pueden realizar los usuarios dentro de la base: 

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Regla global para desarrollo: cualquier usuario autenticado puede hacer todo
    match /{document=**} {
      allow read, write: if request.auth != null;
    }

  }
}


<img width="1920" height="1080" alt="BasedeDatos" src="https://github.com/user-attachments/assets/2cc566b7-9c11-41dc-84b1-62fd4fc1580d" />


