import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";

export default function Signup() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "ESTUDIANTE",
  });
  const [loading, setLoading] = useState(false);

  const AUTH_URL = import.meta.env.VITE_AUTH_URL;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${AUTH_URL}/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert("Usuario creado con éxito. Ahora puedes iniciar sesión.");
        window.location.href = "/login";
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail || "No se pudo registrar"}`);
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground items-center">
      <Header/>
      <div className="flex flex-col min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Crea una cuenta</CardTitle>
            <CardDescription>para ver tú horario ideal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-3">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  value={form.username}
                  placeholder="pepe115"
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  placeholder="pepe@email.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="password">Contrseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  placeholder="*********"
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Sign up"}
              </Button>

              <div className="text-sm text-center mt-4">
                ¿Ya tienes cuenta?{" "}
                <a href="/login" className="text-primary hover:text-primary/80 font-medium">
                  Inicia sesión aquí
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
