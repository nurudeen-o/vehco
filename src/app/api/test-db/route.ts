import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

export async function GET() {
  try {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    const prisma = new PrismaClient({ adapter });

    const count = await prisma.user.count();

    return Response.json({ count });
  } catch (e) {
    console.error(e);

    return Response.json(
      {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : null,
      },
      { status: 500 }
    );
  }
}