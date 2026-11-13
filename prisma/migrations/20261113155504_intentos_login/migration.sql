-- CreateTable
CREATE TABLE "IntentoLogin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntentoLogin_email_fecha_idx" ON "IntentoLogin"("email", "fecha");

-- CreateIndex
CREATE INDEX "IntentoLogin_ip_fecha_idx" ON "IntentoLogin"("ip", "fecha");
