# nodex
nodex



Conéctate al Neo4j Browser:
Abre tu navegador web y ve a http://localhost:7474.
Connect URL: neo4j://localhost:7687
Username: neo4j
Password: yourStrongPassword (o la que hayas configurado en docker-compose.yml).
Haz clic en "Connect". Deberías poder conectarte sin problemas ahora.
Accede a tu Aplicación Frontend:
Or example http://192.168.0.4:7474/browser/

Abre otra pestaña o ventana del navegador y ve a http://localhost:4545.
Deberías ver el formulario de login de tu aplicación React.
Intenta iniciar sesión con:
Usuario: testuser
Contraseña: testpassword
Or example 
http://192.168.0.4:4545/

(Estos son los datos del usuario de ejemplo en backend/app/auth.py).
Prueba la funcionalidad:
Si el login es exitoso, deberías ver la interfaz para cargar archivos y el visualizador de grafos (inicialmente vacío).
Intenta cargar el archivo sample_data.json que tienes.
Observa si se procesa y si aparecen nodos y relaciones en el grafo.
Revisa los logs de nodex_backend_v2 mientras haces esto para ver si hay algún error durante el procesamiento del JSON o la interacción con Neo4j.
Haz clic en los nodos para ver si el panel de detalles funciona.
¡Estás en un muy buen punto! La infraestructura base está levantada. Ahora comienza la fas


http://192.168.0.4:8000/docs