import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const data = [
  { "pos": 1, "empleado": "Vanesa Del Aqua", "usuario": "vanesa.del.aqua", "pronosticados": 29, "acierto_exacto": 3, "dif_goles": 0, "resultado": 3, "puntos": 21 },
  { "pos": 2, "empleado": "Federico Martinez", "usuario": "federico.martinez", "pronosticados": 14, "acierto_exacto": 2, "dif_goles": 1, "resultado": 2, "puntos": 17 },
  { "pos": 3, "empleado": "Dolores Bruzzone", "usuario": "dolores.bruzzone", "pronosticados": 22, "acierto_exacto": 1, "dif_goles": 1, "resultado": 4, "puntos": 16 },
  { "pos": 4, "empleado": "Joaquin Burgos", "usuario": "joaquin.burgos", "pronosticados": 15, "acierto_exacto": 2, "dif_goles": 1, "resultado": 1, "puntos": 15 },
  { "pos": 5, "empleado": "Guillermo Belsito", "usuario": "guillermo.belsito", "pronosticados": 69, "acierto_exacto": 2, "dif_goles": 0, "resultado": 2, "puntos": 14 },
  { "pos": 6, "empleado": "Nacho", "usuario": "nacho", "pronosticados": 8, "acierto_exacto": 2, "dif_goles": 0, "resultado": 2, "puntos": 14 },
  { "pos": 7, "empleado": "Ailen Fleites", "usuario": "ailen.fleites", "pronosticados": 29, "acierto_exacto": 1, "dif_goles": 0, "resultado": 4, "puntos": 13 },
  { "pos": 8, "empleado": "Mauricio Aiello", "usuario": "mauricio.aiello", "pronosticados": 19, "acierto_exacto": 1, "dif_goles": 0, "resultado": 4, "puntos": 13 },
  { "pos": 9, "empleado": "Milagros Aranzabe", "usuario": "milagros.aranzabe", "pronosticados": 67, "acierto_exacto": 1, "dif_goles": 1, "resultado": 2, "puntos": 12 },
  { "pos": 10, "empleado": "Ramiro Toulemonde", "usuario": "ramiro.toulemonde", "pronosticados": 33, "acierto_exacto": 1, "dif_goles": 0, "resultado": 3, "puntos": 11 },
  { "pos": 11, "empleado": "Matias Dieguez", "usuario": "matias.dieguez", "pronosticados": 26, "acierto_exacto": 1, "dif_goles": 0, "resultado": 2, "puntos": 9 },
  { "pos": 12, "empleado": "Yesica Arevalo", "usuario": "yesica.arevalo", "pronosticados": 15, "acierto_exacto": 1, "dif_goles": 0, "resultado": 2, "puntos": 9 },
  { "pos": 13, "empleado": "Matias Mercado", "usuario": "matias.mercado", "pronosticados": 13, "acierto_exacto": 1, "dif_goles": 0, "resultado": 2, "puntos": 9 },
  { "pos": 14, "empleado": "Alejandro Riccillo", "usuario": "alejandro.riccillo", "pronosticados": 22, "acierto_exacto": 0, "dif_goles": 0, "resultado": 3, "puntos": 6 },
  { "pos": 15, "empleado": "Lucas Gil", "usuario": "lucas.gil", "pronosticados": 5, "acierto_exacto": 0, "dif_goles": 1, "resultado": 1, "puntos": 5 },
  { "pos": 16, "empleado": "Rocio Smidt", "usuario": "rocio.smidt", "pronosticados": 34, "acierto_exacto": 0, "dif_goles": 0, "resultado": 2, "puntos": 4 },
  { "pos": 17, "empleado": "Florencia Belsito", "usuario": "florencia.belsito", "pronosticados": 13, "acierto_exacto": 0, "dif_goles": 0, "resultado": 2, "puntos": 4 },
  { "pos": 18, "empleado": "Claudio Mazolli", "usuario": "claudio.mazolli", "pronosticados": 2, "acierto_exacto": 0, "dif_goles": 0, "resultado": 1, "puntos": 2 },
  { "pos": 19, "empleado": "Alejandro Morreale", "usuario": "alejandro.morreale", "pronosticados": 4, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 20, "empleado": "Daiana Amarante", "usuario": "daiana.amarante", "pronosticados": 4, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 21, "empleado": "Conrado Blanco", "usuario": "conrado.blanco", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 22, "empleado": "Eduardo Rodriguez", "usuario": "eduardo.rodriguez", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 23, "empleado": "Franco Flores", "usuario": "franco.flores", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 24, "empleado": "Gabriel Vergara", "usuario": "gabriel.vergara", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 25, "empleado": "Guido Arce", "usuario": "guido.arce", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 26, "empleado": "Julieta Belsito", "usuario": "julieta.belsito", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 27, "empleado": "Leandro Saraceno", "usuario": "leandro.saraceno", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 },
  { "pos": 28, "empleado": "Nicola Cocciaretti", "usuario": "nicola.cocciaretti", "pronosticados": 0, "acierto_exacto": 0, "dif_goles": 0, "resultado": 0, "puntos": 0 }
];

async function main() {
  for (const stat of data) {
    try {
      // Handle the username special case for Vanesa
      const username = stat.usuario === 'vanesa.del.aqua' ? 'vanesa.dellaqua' : stat.usuario;
      await prisma.user.update({
        where: { username },
        data: {
          legacyExactMatches: stat.acierto_exacto,
          legacyDiffMatches: stat.dif_goles,
          legacyOutcomeMatches: stat.resultado
        }
      });
      console.log(`Updated ${username}`);
    } catch (e) {
      console.error(`User ${stat.usuario} not found or error`, e.message);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
