You've provided the content for your `nodex` README. It's well-structured and covers all the essential aspects of your project, from setup to future features.

Here's the full Markdown code for your README, ready to be copied and pasted into a `README.md` file in your project's root directory:

```markdown
# 🧠 nodex

**Visualiza y explora grafos generados a partir de archivos JSON utilizando Neo4j y una interfaz web intuitiva construida con React.**

---

## 📦 Requisitos

* **Docker**
* **Docker Compose**
* **Navegador web moderno**

---

## 🚀 Puesta en Marcha Rápida

1.  **Clona el repositorio y navega al directorio del proyecto:**

    ```bash
    git clone [https://github.com/tuusuario/nodex.git](https://github.com/tuusuario/nodex.git)
    cd nodex
    ```

2.  **Levanta los servicios con Docker Compose:**

    ```bash
    docker-compose up --build --force-recreate
    ```

    > 💡 En caso de errores con dependencias en el frontend, puedes limpiar y reinstalar:
    >
    > ```bash
    > rm -rf frontend/node_modules frontend/package-lock.json
    > ```

3.  **Accede a los servicios:**

    | Servicio           | URL                                                      |
    | :----------------- | :------------------------------------------------------- |
    | Frontend (React)   | [http://localhost:4545](http://localhost:4545)           |
    | Backend (FastAPI)  | [http://localhost:8000](http://localhost:8000)           |
    | Neo4j Browser      | [http://localhost:7474](http://localhost:7474)           |
    | Neo4j Bolt         | `bolt://localhost:7687`                                  |
    | API Docs (Swagger) | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

## 🔐 Credenciales por Defecto

### Neo4j

* **URL de conexión:** `neo4j://localhost:7687`
* **Usuario:** `neo4j`
* **Contraseña:** `yourStrongPassword`
    *(o la definida en `docker-compose.yml`)*

### Aplicación Web

* **Usuario de ejemplo:** `testuser`
* **Contraseña:** `testpassword`
    *(definido en `backend/app/auth.py`)*

---

## 🧪 Prueba de Funcionalidades

1.  Accede al frontend en [http://localhost:4545](http://localhost:4545) e inicia sesión.
2.  Sube el archivo `sample_data.json`.
3.  Observa cómo se visualizan los nodos y relaciones.
4.  Haz clic sobre los nodos para ver detalles.
5.  Verifica los logs de `nodex_backend_v3` si hay errores.

---

## 🐳 Imágenes en Docker Hub

* [ozzyman23/nodex-backend](https://hub.docker.com/r/ozzyman23/nodex-backend)
* [ozzyman23/nodex-frontend](https://hub.docker.com/r/ozzyman23/nodex-frontend)

---

## 🔧 Comandos útiles

```bash
# Ingresar al contenedor del frontend
docker exec -it nodex_frontend_v3 sh

# Ver logs de instalación de npm (dentro del contenedor)
cat /root/.npm/_logs/YYYY-MM-DDT...-debug-0.log

# Instalar paquetes necesarios
npm install react reactflow nanoid react-router-dom lucide-react

# Publicar imágenes actualizadas
docker build backend frontend
docker tag nodex-backend ozzyman23/nodex-backend:latest
docker tag nodex-frontend ozzyman23/nodex-frontend:latest
docker push ozzyman23/nodex-backend:latest
docker push ozzyman23/nodex-frontend:latest


docker-compose logs -f frontend
docker-compose logs -f backend


[http://192.168.0.4:4545/graph](http://192.168.0.4:4545/graph)
```


## ✨ Próximas Mejoras y Trabajo Futuro

Estamos planeando añadir las siguientes funcionalidades y mejoras para enriquecer la experiencia de usuario y la gestión de datos:

### 🏷️ Etiquetado de Datos para Validación

Implementaremos un sistema de etiquetado visual para indicar el estado de validación de los datos en el grafo:

* **Rojo:** Datos **no confirmados**.
* **Verde:** Datos **validados**.
* **Amarillo:** Datos **no validados** (requieren revisión o acción).

### ↔️ Elementos Arrastrables

Se introducirá la capacidad de **arrastrar campos directamente a las tarjetas de los nodos** en la interfaz. Esto facilitará la edición y organización visual de la información del grafo de manera intuitiva.
```