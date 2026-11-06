"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", forcedTheme } = useTheme()

  return (
    <Sonner
      theme={(forcedTheme ?? theme) as ToasterProps["theme"]}
      className="toaster group" richColors
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--borde-sutil)",
          "--success-bg": "var(--estado-llego-fondo)",
          "--success-text": "var(--estado-llego)",
          "--success-border": "color-mix(in oklab, var(--estado-llego) 30%, var(--estado-llego-fondo))",
          "--error-bg": "var(--estado-falta-fondo)",
          "--error-text": "var(--estado-falta)",
          "--error-border": "color-mix(in oklab, var(--estado-falta) 30%, var(--estado-falta-fondo))",
          "--warning-bg": "var(--estado-tarde-fondo)",
          "--warning-text": "var(--estado-tarde)",
          "--warning-border": "color-mix(in oklab, var(--estado-tarde) 30%, var(--estado-tarde-fondo))",
          "--info-bg": "var(--info-fondo)",
          "--info-text": "var(--info)",
          "--info-border": "color-mix(in oklab, var(--info) 25%, var(--info-fondo))",
          "--border-radius": "var(--radio-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans text-cuerpo-sm shadow-sombra-1",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
