import { createServerFn } from "@tanstack/react-start";
import type { AppUser } from "@/features/auth/auth-context";

type AuthUserRecord = AppUser & {
  password: string;
};

async function getUsersFile() {
  const { resolve } = await import("node:path");
  return resolve(process.cwd(), ".berryflow-data", "users.json");
}

async function ensureUsersFile() {
  const usersFile = await getUsersFile();
  const [{ mkdir, stat, writeFile }, { dirname }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  try {
    await stat(usersFile);
  } catch {
    await mkdir(dirname(usersFile), { recursive: true });
    const seed: AuthUserRecord[] = [
      {
        id: "usr_admin",
        name: "Berry Admin",
        email: "admin@berrysdk.local",
        password: "berryflow123",
      },
    ];
    await writeFile(usersFile, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readUsers(): Promise<AuthUserRecord[]> {
  const usersFile = await getUsersFile();
  const { readFile } = await import("node:fs/promises");
  await ensureUsersFile();
  const content = await readFile(usersFile, "utf8");
  return JSON.parse(content) as AuthUserRecord[];
}

const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const users = await readUsers();
    const user = users.find(
      (entry) =>
        entry.email.toLowerCase() === data.email.trim().toLowerCase() &&
        entry.password === data.password,
    );
    if (!user) {
      throw new Error("Credenciais invalidas.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    } satisfies AppUser;
  });

export const authService = {
  login: (email: string, password: string) => loginFn({ data: { email, password } }),
};
