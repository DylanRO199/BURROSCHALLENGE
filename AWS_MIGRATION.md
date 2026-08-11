# Guía de Migración y Despliegue en AWS (Amazon Web Services)

Este documento detalla el procedimiento profesional para desplegar y alojar el proyecto **Next.js + PostgreSQL (Supabase)** en la infraestructura de AWS.

Hemos habilitado la compilación optimizada en Next.js (`output: 'standalone'`) y añadido un `Dockerfile` de producción multi-etapa. Esto te permite migrar el proyecto a AWS mediante dos alternativas profesionales:

---

## Opción 1: AWS Amplify (Hosting Serverless Frontend) - RECOMENDADA
AWS Amplify es la alternativa nativa de AWS a Vercel. Ofrece soporte automático para Next.js con Server-Side Rendering (SSR), CDNs globales con Amazon Cloudfront y despliegue continuo mediante git.

### Paso a paso para desplegar:
1. **Sube tu código a GitHub**:
   Asegúrate de que tus últimos cambios (incluyendo `next.config.js` y el nuevo `Dockerfile`) estén en tu repositorio de GitHub.
2. **Crea la App en AWS Amplify**:
   * Ingresa a la consola de AWS y busca **AWS Amplify**.
   * Haz clic en **Create new app** -> **Host web app**.
   * Selecciona **GitHub** como proveedor de origen y autoriza a AWS a leer tu repositorio.
   * Selecciona la rama principal (generalmente `main`).
3. **Configura las Variables de Entorno (Muy Importante)**:
   * Durante el asistente de configuración de Amplify, ve a la sección **Environment variables** y añade las siguientes claves:
     * `DATABASE_URL`: Tu cadena de conexión PostgreSQL de Supabase.
     * `RIOT_API_KEY`: Tu clave API activa de Riot Games.
4. **Construcción y Despliegue**:
   * Haz clic en **Save and Deploy**. AWS Amplify creará automáticamente el pipeline de compilación. En ~3-5 minutos el sitio estará online y te dará una URL de AWS.
5. **Enlazar Dominio Personalizado**:
   * En Amplify, ve a la barra lateral izquierda -> **Domain management**.
   * Haz clic en **Add domain** y escribe `burroschallenge.gg` o el subdominio que poseas.
   * AWS creará y configurará automáticamente el certificado SSL (HTTPS) a través de Amazon Route 53 o te dará los registros DNS `CNAME` para que los agregues en tu proveedor de dominio.

---

## Opción 2: AWS ECS Fargate + Amazon ECR (Contenedores Serverless)
Es la opción de nivel empresarial más robusta. Permite correr la aplicación Next.js dentro de un contenedor Docker en AWS, dándote control absoluto sobre la escalabilidad y los recursos, sin límites de tiempo de ejecución.

### Requisitos:
* Tener instalado el **AWS CLI** y **Docker** localmente.

### Paso a paso para desplegar:

#### 1. Crear repositorio en Amazon ECR:
```bash
aws ecr create-repository --repository-name burroschallenge-next --region us-east-1
```

#### 2. Autenticarse e iniciar sesión en ECR:
*(Reemplaza `<AWS_ACCOUNT_ID>` por tu ID de cuenta de AWS)*
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

#### 3. Construir la imagen Docker localmente:
Construimos la imagen utilizando el `Dockerfile` optimizado provisto:
```bash
docker build -t burroschallenge-next .
```

#### 4. Etiquetar y subir la imagen a ECR:
```bash
docker tag burroschallenge-next:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/burroschallenge-next:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/burroschallenge-next:latest
```

#### 5. Crear el servicio en AWS ECS:
* Ve a la consola de **AWS ECS** y crea un clúster de tipo **Serverless (Fargate)**.
* Crea una **Task Definition** especificando la imagen que subiste a ECR (`<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/burroschallenge-next:latest`).
* Define las variables de entorno en la sección de configuración de contenedores de la Task Definition:
  * `DATABASE_URL`
  * `RIOT_API_KEY`
* Asigna el puerto de entrada `3000`.
* Crea un **Service** en ECS Fargate utilizando la Task Definition anterior, y configúralo detrás de un **Application Load Balancer (ALB)** para manejar las peticiones HTTP y SSL de forma profesional y segura.

---

## Base de Datos (PostgreSQL en Supabase)
El motor de base de datos corre actualmente en Supabase. Al migrar el servidor a AWS (ya sea con Amplify o ECS), **no necesitas mover la base de datos** porque el servidor se conecta directamente a Supabase a través del string de conexión de la variable `DATABASE_URL`. Tu base de datos seguirá funcionando de forma transparente.
