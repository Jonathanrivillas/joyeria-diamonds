"use client";

/**
 * Último recurso: si falla hasta el marco de la página (por ejemplo, la base tarda en responder),
 * se muestra esto en vez de una pantalla en blanco. No usa los componentes del sistema porque
 * reemplaza todo el documento.
 */
export default function ErrorGeneral({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#020202" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: 28, marginBottom: 12 }}>No se pudo cargar el sistema</h1>
            <p style={{ fontSize: 18, lineHeight: 1.5, color: "#444" }}>
              Puede ser la conexión a internet. No se perdió nada de lo que ya estaba guardado.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button onClick={reset} style={{ fontSize: 18, padding: "14px 24px", borderRadius: 12, border: 0, background: "#020202", color: "#fff", cursor: "pointer" }}>
                Intentar de nuevo
              </button>
              <a href="/" style={{ fontSize: 18, padding: "14px 24px", borderRadius: 12, border: "1px solid #D9D9D9", color: "#020202", textDecoration: "none" }}>
                Ir al inicio
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
