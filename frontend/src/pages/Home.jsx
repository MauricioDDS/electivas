import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Pensum from "../components/Pensum"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground items-center">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-white">
          Horario Optimo
        </h1>
      </header>
      
        <Pensum />
        <Separator />
    </div>
  )
}
