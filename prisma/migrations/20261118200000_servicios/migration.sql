-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN "esServicio" BOOLEAN NOT NULL DEFAULT false;

-- Trabajos que se venden sin inventario
INSERT INTO "Categoria" ("nombre", "orden", "controlaPeso", "precioGramoSugerido", "precioUnidadSugerido", "activa", "esServicio")
VALUES ('Fabricación', 1000, false, 0, 0, true, true),
       ('Reparación', 1001, false, 0, 0, true, true)
ON CONFLICT ("nombre") DO UPDATE SET "esServicio" = true, "controlaPeso" = false, "activa" = true;
