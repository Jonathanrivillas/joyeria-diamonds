# Poner el sistema en el VPS (Hostinger KVM 1 + Neon)

Guía paso a paso para el servidor de producción. Se hace una sola vez; las actualizaciones
están al final.

## 1. Preparar el servidor (Ubuntu 24.04)

```bash
# Usuario sin privilegios para la app
adduser joyeria
usermod -aG sudo joyeria

# Firewall: solo SSH y web
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable

# Memoria de reserva (el build de Next con 4 GB a veces se queda corto)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Node 20 LTS + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
npm install -g pm2
pm2 install pm2-logrotate      # que los registros no llenen el disco

# Carpeta de los recibos de gastos (fuera del código)
mkdir -p /var/lib/joyeria/soportes && chown -R joyeria:joyeria /var/lib/joyeria
```

## 2. Caddy (HTTPS automático)

```bash
apt-get install -y caddy
```

`/etc/caddy/Caddyfile` (cambiar el dominio):

```
inventario.ejemplo.com {
    encode gzip
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Real-IP {remote_host}
    }
}
```

`systemctl reload caddy`. Caddy pasa bien `Host` y `X-Forwarded-*` (necesarios para que los
formularios funcionen) y no limita el tamaño de los recibos. **No** usar `allowedOrigins: ["*"]`
en `next.config.ts`.

> Si en algún momento se usa Nginx en vez de Caddy: `proxy_set_header Host $host;`,
> `proxy_set_header X-Real-IP $remote_addr;`, `proxy_set_header X-Forwarded-Proto $scheme;` y
> `client_max_body_size 6m;`.

## 3. Variables (`/home/joyeria/joyeria-inventario/.env`)

Copiar de `.env.example` y llenar. Importante:

| Variable | Qué poner |
|---|---|
| `DATABASE_URL` | La de Neon **con** `-pooler` y `&connection_limit=10&pool_timeout=20` |
| `DIRECT_URL` | La misma **sin** `-pooler` (migraciones) |
| `SESSION_SECRET` | Nueva, generada en el servidor (no la de desarrollo) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Nueva y fija (si cambia, los formularios abiertos fallan tras actualizar) |
| `SOPORTE_EMAILS` | Correo(s) de soporte técnico |
| `SOPORTES_DIR` | `/var/lib/joyeria/soportes` |
| `ALEGRA_USUARIO` / `ALEGRA_TOKEN` | Los de la cuenta **real** del cliente |
| `ALEGRA_ENVIAR_DIAN` | `true` solo cuando la cuenta ya esté habilitada ante la DIAN |
| `NODE_ENV` | `production` |

**Nunca** poner `DATOS_PERMITIDOS_HOSTS` en el servidor. `chmod 600 .env`.

## 4. Primera instalación

```bash
su - joyeria
git clone <repositorio> joyeria-inventario && cd joyeria-inventario
# (crear el .env del paso 3)
npm ci
npx prisma migrate deploy
npm run build
pm2 start npm --name joyeria -- run start:vps
pm2 save && pm2 startup     # que arranque solo si el servidor se reinicia
```

`start:vps` escucha solo en `127.0.0.1:3000`: desde internet solo se entra por Caddy (HTTPS).

Probar: `curl https://inventario.ejemplo.com/api/salud` → `{"ok":true,...}`.

## 5. Día 1: dejar la base lista

1. **Copia** de la base antes de nada (Neon → Branches → crear una rama de respaldo).
2. Dejar solo el admin y la configuración, sin datos de prueba:
   ```bash
   npx tsx --env-file=.env scripts/datos.ts --produccion --confirmar=<servidor-de-neon> --si
   ```
   (sin `--confirmar` el script dice qué servidor escribir; así no se corre por error en otra base).
3. Entrar con el admin y **cambiarle la clave**. Crear los usuarios reales de cada local.
4. Poner el precio del gramo del día.
5. Enlazar los tipos de pieza con la cuenta real de Alegra:
   `npx tsx --env-file=.env scripts/enlazar-alegra.ts`
6. Si había recibos de gastos en Vercel, pasarlos al disco **antes** de cerrar Vercel:
   `npx tsx --env-file=.env scripts/migrar-recibos.ts` (se puede repetir; debe terminar "N de N").
7. Hacer una venta de prueba con factura electrónica y anularla en Alegra con nota crédito.

## 6. Respaldos

- **Base de datos:** el workflow `.github/workflows/respaldo.yml` saca una copia cifrada cada
  noche y la prueba restaurándola en otra base. Secretos en GitHub: `RESPALDO_DATABASE_URL`
  (producción, sin pooler), `RESPALDO_CLAVE`, `RESPALDO_PRUEBA_URL` (una base **distinta**: el
  workflow se niega si es el mismo servidor, porque la prueba borra la base de destino).
- **Recibos (`/var/lib/joyeria/soportes`):** no están en la base. Activar las copias
  automáticas del VPS en Hostinger y, además, copiar la carpeta afuera cada semana, por ejemplo:
  `tar czf soportes-$(date +%F).tgz -C /var/lib/joyeria soportes` y bajarla.

## 7. Monitoreo

- UptimeRobot (gratis) revisando `https://inventario.ejemplo.com/api/salud` cada 5 min:
  avisa si el sistema o la base dejan de responder.
- Registros: `pm2 logs joyeria` (los errores llevan fecha y dónde pasaron).

## 8. Actualizar el sistema

```bash
cd ~/joyeria-inventario
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload joyeria
```

Hacerlo **fuera del horario de atención**: mientras corren `npm ci` y el build, el sistema puede
fallar unos minutos. Si el build falla, volver a la versión anterior con `git checkout <commit>`
y repetir los pasos.

## Notas

- `npm run datos:prueba` / `datos:cero` se niegan a correr en el servidor (`NODE_ENV=production`
  y sin `DATOS_PERMITIDOS_HOSTS`).
- El build descarga las fuentes de Google: el servidor necesita internet al compilar.
- HSTS ya está activo en `next.config.ts`: una vez publicado con HTTPS, el dominio no se puede
  volver a servir sin HTTPS.
