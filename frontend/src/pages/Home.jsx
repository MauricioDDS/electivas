import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-white">
          Empieza seleccionando tus electivas
        </h1>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col gap-6 px-6 py-6">
        <Card className="bg-gradient-to-t from-primary/10 to-background border border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg text-white">Vista previa del pensum</CardTitle>
            <CardDescription className="text-muted-foreground">
              Aquí pronto aparecerán tus materias.
            </CardDescription>
          </CardHeader>
        </Card>

        <Separator />

        <div className="flex justify-center">
          <Button size="lg">Comenzar selección</Button>
        </div>
      </main>
    </div>
  )
}
